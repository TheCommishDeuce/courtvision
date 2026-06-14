#!/bin/bash
# Start the Tennis Stats app (FastAPI + Vite dev server)
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ -x "$ROOT/.venv/bin/python" ]; then
    PYTHON="$ROOT/.venv/bin/python"
else
    PYTHON="${PYTHON:-python3}"
fi

cleanup() {
    echo ""
    echo "Shutting down..."
    [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null
    wait "$API_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM EXIT

# --- FastAPI ---
echo "Starting API server on http://localhost:8000 ..."
cd "$ROOT"
"$PYTHON" -m uvicorn api.main:app --port 8000 --reload &
API_PID=$!

# Give uvicorn a moment to bind before Vite tries to proxy
sleep 1

# --- Vite dev server ---
echo "Starting frontend on http://localhost:5173 ..."
cd "$ROOT/frontend"
npm run dev
