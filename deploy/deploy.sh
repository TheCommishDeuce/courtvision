#!/usr/bin/env bash
#
# Ship the committed HEAD of main to the CourtVision host.
#
#   deploy/deploy.sh              build, verify, deploy, smoke-test
#   deploy/deploy.sh --dry-run    everything local, stop before touching remote
#   deploy/deploy.sh --skip-checks  skip the local preflight (CI already ran it)
#
# Only committed, pushed code is deployed: the working tree is never the source.
# Server-owned state (.env, data/, venv/) survives every deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-root@192.168.0.122}"
REMOTE_DIR="${REMOTE_DIR:-/opt/courtvision}"
SERVICE_NAME="${SERVICE_NAME:-courtvision}"
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8010}"
HEALTH_URL="${HEALTH_URL:-$BASE_URL/api/health}"

DRY_RUN=0
SKIP_CHECKS=0
for arg in "$@"; do
    case "$arg" in
        --dry-run)     DRY_RUN=1 ;;
        --skip-checks) SKIP_CHECKS=1 ;;
        -h|--help)     sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# ── Release must be committed, pushed, and on main ──────────────────────────

step "Checking the release is committed and pushed"
cd "$ROOT"
if [ "$(git branch --show-current)" != "main" ]; then
    echo "Deployment requires the main branch." >&2
    exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
    echo "Deployment requires a clean working tree. Commit or stash first." >&2
    git status --short >&2
    exit 1
fi

git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    echo "Local main must exactly match origin/main. Push (or pull) first." >&2
    exit 1
fi
echo "Deploying $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# ── Preflight: the same gates CI runs, before we build anything ─────────────

if [ "$SKIP_CHECKS" -eq 1 ]; then
    step "Skipping preflight checks (--skip-checks)"
else
    step "Running backend tests"
    "${PYTHON:-python3}" -m pytest -q

    step "Typechecking, linting and testing the frontend"
    (
        cd "$ROOT/frontend"
        npm ci --ignore-scripts --no-audit --no-fund
        npx tsc -b
        npm run lint -- --max-warnings=0
        npm test
    )
fi

# ── Build ───────────────────────────────────────────────────────────────────

step "Building the frontend"
(
    cd "$ROOT/frontend"
    [ "$SKIP_CHECKS" -eq 1 ] && npm ci --ignore-scripts --no-audit --no-fund
    npm run build
)

# The API serves frontend/dist when it exists; shipping an empty one would
# silently produce a blank site.
if [ ! -s "$ROOT/frontend/dist/index.html" ]; then
    echo "frontend/dist/index.html is missing or empty — the build did not produce a site." >&2
    exit 1
fi
if [ -z "$(ls -A "$ROOT/frontend/dist/assets" 2>/dev/null)" ]; then
    echo "frontend/dist/assets is empty — the build did not emit any bundles." >&2
    exit 1
fi

# ── Stage: committed tree + the build output, nothing else ─────────────────

step "Staging the release"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD | tar -x -C "$STAGE"
mkdir -p "$STAGE/frontend"
cp -R "$ROOT/frontend/dist" "$STAGE/frontend/dist"
echo "Staged $(find "$STAGE" -type f | wc -l | tr -d ' ') files."

if [ "$DRY_RUN" -eq 1 ]; then
    step "Dry run complete — nothing was sent to ${REMOTE_HOST}"
    echo "Release verified and staged at $STAGE (removed on exit)."
    exit 0
fi

# ── Sync ────────────────────────────────────────────────────────────────────

step "Syncing to ${REMOTE_HOST}:${REMOTE_DIR}"
# Production secrets and data are server-owned and must survive every deploy.
rsync -az --delete \
    --exclude ".env" \
    --exclude "data/" \
    --exclude "venv/" \
    "$STAGE/" "${REMOTE_HOST}:${REMOTE_DIR}/"

# ── Install, restart, verify ────────────────────────────────────────────────

step "Installing dependencies and restarting ${SERVICE_NAME}"
ssh "$REMOTE_HOST" bash -s -- \
    "$REMOTE_DIR" "$SERVICE_NAME" "$PYTHON_BIN" "$HEALTH_URL" "$BASE_URL" <<'REMOTE'
set -euo pipefail
REMOTE_DIR="$1"; SERVICE_NAME="$2"; PYTHON_BIN="$3"; HEALTH_URL="$4"; BASE_URL="$5"

cd "$REMOTE_DIR"
if [ ! -x venv/bin/python ]; then
    "$PYTHON_BIN" -m venv venv
fi
venv/bin/python -m pip install --upgrade pip
venv/bin/python -m pip install -r requirements.txt
systemctl restart "$SERVICE_NAME"

# --- Liveness -------------------------------------------------------------
ready=0
for _ in $(seq 1 30); do
    if curl --fail --silent "$HEALTH_URL" >/dev/null; then ready=1; break; fi
    sleep 1
done
if [ "$ready" -ne 1 ]; then
    echo 'Service did not become ready within 30 seconds.' >&2
    systemctl --no-pager --full status "$SERVICE_NAME" >&2 || true
    journalctl -u "$SERVICE_NAME" -n 100 --no-pager >&2 || true
    exit 1
fi

# --- Smoke tests ----------------------------------------------------------
# The dashboard API is gated: it needs the client header plus a browser-ish
# source, which is what these two headers stand in for.
GATE=(-H 'X-CourtVision-Client: dashboard' -H 'Sec-Fetch-Site: same-origin')
fail() { echo "SMOKE FAIL: $1" >&2; journalctl -u "$SERVICE_NAME" -n 60 --no-pager >&2 || true; exit 1; }

# 1. The SPA is actually being served (i.e. frontend/dist landed).
curl --fail --silent "$BASE_URL/" | grep -q '<div id="root">' \
    || fail 'the SPA index was not served — check frontend/dist synced'

# 2. A core data endpoint answers.
curl --fail --silent "${GATE[@]}" "$BASE_URL/api/meta/stats" | grep -q 'total_matches' \
    || fail '/api/meta/stats did not return data'

# 3. The ad-hoc SQL endpoint is live...
curl --fail --silent "${GATE[@]}" "$BASE_URL/api/query/schema" | grep -q 'matches_main' \
    || fail '/api/query/schema did not list the exposed relations'

# 4. ...runs a SELECT...
curl --fail --silent "${GATE[@]}" -H 'Content-Type: application/json' \
    -d '{"sql":"SELECT 1 AS ok","limit":1}' "$BASE_URL/api/query" | grep -q '"ok"' \
    || fail '/api/query could not run a trivial SELECT'

# 5. ...and still refuses anything that is not one. A 400 here is the pass
#    condition: if this ever returns 2xx in production, stop the deploy.
code=$(curl --silent --output /dev/null --write-out '%{http_code}' "${GATE[@]}" \
    -H 'Content-Type: application/json' \
    -d '{"sql":"DROP TABLE players"}' "$BASE_URL/api/query")
[ "$code" = "400" ] || fail "/api/query accepted a non-SELECT statement (HTTP $code)"

echo 'Smoke tests passed.'
systemctl --no-pager --full status "$SERVICE_NAME"
REMOTE

step "Deployment complete"
