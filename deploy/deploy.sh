#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REMOTE_HOST="${REMOTE_HOST:-root@192.168.0.122}"
REMOTE_DIR="${REMOTE_DIR:-/opt/courtvision}"
SERVICE_NAME="${SERVICE_NAME:-courtvision}"
PYTHON_BIN="${PYTHON_BIN:-python3.12}"

echo "Building frontend..."
cd "$ROOT/frontend"
npm run build

echo "Syncing project to ${REMOTE_HOST}:${REMOTE_DIR}..."
cd "$ROOT"
rsync -az --delete \
    --exclude ".git/" \
    --exclude ".venv/" \
    --exclude "__pycache__/" \
    --exclude ".pytest_cache/" \
    --exclude "frontend/node_modules/" \
    --exclude "frontend/.vite/" \
    --exclude "data/auth.db*" \
    --exclude "data/checkpoint.db" \
    --exclude "data/parquet/" \
    ./ "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "Installing backend dependencies and restarting service..."
ssh "$REMOTE_HOST" "
    set -euo pipefail
    cd '$REMOTE_DIR'
    if [ ! -x venv/bin/python ]; then
        '$PYTHON_BIN' -m venv venv
    fi
    venv/bin/python -m pip install --upgrade pip
    venv/bin/python -m pip install -r requirements.txt
    systemctl daemon-reload
    systemctl restart '$SERVICE_NAME'
    systemctl --no-pager --full status '$SERVICE_NAME'
"

echo "Deployment complete."

