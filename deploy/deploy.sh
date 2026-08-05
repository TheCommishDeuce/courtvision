#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-root@192.168.0.122}"
REMOTE_DIR="${REMOTE_DIR:-/opt/courtvision}"
SERVICE_NAME="${SERVICE_NAME:-courtvision}"
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8010/api/health}"

cd "$ROOT"
if [ "$(git branch --show-current)" != "main" ]; then
    echo "Deployment requires the main branch." >&2
    exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
    echo "Deployment requires a clean working tree." >&2
    exit 1
fi

git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    echo "Local main must exactly match origin/main." >&2
    exit 1
fi

printf '%s\n' "Building frontend..."
(
    cd "$ROOT/frontend"
    npm ci --no-audit --no-fund
    npm run build
)

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD | tar -x -C "$STAGE"
mkdir -p "$STAGE/frontend"
cp -R "$ROOT/frontend/dist" "$STAGE/frontend/dist"

printf '%s\n' "Syncing committed release to ${REMOTE_HOST}:${REMOTE_DIR}..."
# Production secrets and data are server-owned and must survive every code deploy.
rsync -az --delete \
    --exclude ".env" \
    --exclude "data/" \
    --exclude "venv/" \
    "$STAGE/" "${REMOTE_HOST}:${REMOTE_DIR}/"

printf '%s\n' "Installing dependencies and restarting ${SERVICE_NAME}..."
ssh "$REMOTE_HOST" "
    set -euo pipefail
    cd '$REMOTE_DIR'
    if [ ! -x venv/bin/python ]; then
        '$PYTHON_BIN' -m venv venv
    fi
    venv/bin/python -m pip install --upgrade pip
    venv/bin/python -m pip install -r requirements.txt
    systemctl restart '$SERVICE_NAME'

    for attempt in \$(seq 1 30); do
        if curl --fail --silent '$HEALTH_URL' >/dev/null; then
            systemctl --no-pager --full status '$SERVICE_NAME'
            exit 0
        fi
        sleep 1
    done

    echo 'Service did not become ready within 30 seconds.' >&2
    systemctl --no-pager --full status '$SERVICE_NAME' >&2 || true
    journalctl -u '$SERVICE_NAME' -n 100 --no-pager >&2 || true
    exit 1
"

printf '%s\n' "Deployment complete."
