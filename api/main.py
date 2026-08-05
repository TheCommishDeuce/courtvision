"""FastAPI application entry point."""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure project root is importable (db/, pipeline/, etc.)
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.dashboard_access import DashboardAccessMiddleware
from api.routers import analysis, compare, h2h, leaders, meta, player, search, tournament
from db.connection import get_db as open_tennis_db

app = FastAPI(
    title="CourtVision",
    version="1.0.0",
    openapi_url=None,
    docs_url=None,
    redoc_url=None,
)

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173",  # Vite dev server
    "http://localhost:4173",  # Vite preview
)


def _load_allowed_origins() -> tuple[str, ...]:
    raw = os.getenv("CORS_ORIGINS")
    if not raw:
        return DEFAULT_ALLOWED_ORIGINS
    origins = tuple(
        origin.strip().rstrip("/")
        for origin in raw.split(",")
        if origin.strip()
    )
    return origins or DEFAULT_ALLOWED_ORIGINS


ALLOWED_ORIGINS = _load_allowed_origins()

# CORS is added last so it wraps gate rejections as well as successful responses.
app.add_middleware(
    DashboardAccessMiddleware,
    allowed_origins=ALLOWED_ORIGINS,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["X-CourtVision-Client"],
)

app.include_router(meta.router,       prefix="/api/meta")
app.include_router(h2h.router,        prefix="/api/h2h")
app.include_router(player.router,     prefix="/api/player")
app.include_router(analysis.router,   prefix="/api/analysis")
app.include_router(tournament.router, prefix="/api/tournament")
app.include_router(search.router,     prefix="/api/search")
app.include_router(leaders.router,    prefix="/api/leaders")
app.include_router(compare.router,    prefix="/api/compare")


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report whether the tennis database is ready to serve requests."""
    try:
        con = open_tennis_db(read_only=True)
        try:
            con.execute("SELECT 1").fetchone()
        finally:
            con.close()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Service unavailable") from exc
    return {"status": "ok"}


# Serve frontend static files — must be last.
# SPA fallback: non-API paths that aren't real files return index.html so
# React Router can resolve the route client-side (fixes deep-link 404s).
_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if _DIST.exists():
    _INDEX = _DIST / "index.html"
    app.mount("/assets", StaticFiles(directory=str(_DIST / "assets")), name="assets")

    _DIST_RESOLVED = _DIST.resolve()

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        unavailable = {"api", "mcp", "docs", "redoc", "openapi.json"}
        if full_path in unavailable or full_path.startswith("api/") or full_path.startswith("mcp/"):
            raise HTTPException(status_code=404, detail="Not Found")
        if full_path:
            candidate = (_DIST / full_path).resolve()
            try:
                candidate.relative_to(_DIST_RESOLVED)
            except ValueError:
                raise HTTPException(status_code=404, detail="Not Found")
            if candidate.is_file():
                return FileResponse(str(candidate))
        return FileResponse(str(_INDEX), headers={"Cache-Control": "no-cache"})
