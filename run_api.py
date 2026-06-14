"""Launch the FastAPI backend."""
from __future__ import annotations

import os

import uvicorn

if __name__ == "__main__":
    host = os.getenv("TENNIS_API_HOST", "0.0.0.0")
    port = int(os.getenv("TENNIS_API_PORT", "8000"))
    reload = os.getenv("TENNIS_API_RELOAD", "").lower() in {"1", "true", "yes"}
    uvicorn.run("api.main:app", host=host, port=port, reload=reload)
