"""Lightweight request gate for the public dashboard's JSON endpoints.

This is intentionally a deterrent, not authentication: browser headers and the
fixed client header can be replayed by a determined caller.
"""
from __future__ import annotations

from collections.abc import Sequence
from urllib.parse import urlparse

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

DASHBOARD_HEADER = "X-CourtVision-Client"
DASHBOARD_HEADER_VALUE = "dashboard"


class DashboardAccessMiddleware(BaseHTTPMiddleware):
    """Reject casual direct access to dashboard-only API routes."""

    def __init__(self, app: ASGIApp, *, allowed_origins: Sequence[str]) -> None:
        super().__init__(app)
        self.allowed_origins = tuple(origin.rstrip("/") for origin in allowed_origins)

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self._is_gated(request):
            return await call_next(request)

        if request.headers.get(DASHBOARD_HEADER) != DASHBOARD_HEADER_VALUE:
            return self._forbidden()
        if not self._has_browser_source(request):
            return self._forbidden()
        return await call_next(request)

    @staticmethod
    def _is_gated(request: Request) -> bool:
        if request.method == "OPTIONS":
            return False
        path = request.url.path
        return path.startswith("/api/") and path != "/api/health"

    def _has_browser_source(self, request: Request) -> bool:
        source = request.headers.get("origin") or request.headers.get("referer")
        if source:
            parsed = urlparse(source)
            source_origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
            if source_origin in self.allowed_origins:
                return True

            host = request.headers.get("x-forwarded-host") or request.headers.get("host")
            if parsed.netloc and host and parsed.netloc == host:
                return True

        return request.headers.get("sec-fetch-site") in {"same-origin", "same-site"}

    @staticmethod
    def _forbidden() -> JSONResponse:
        return JSONResponse({"detail": "Forbidden"}, status_code=403)
