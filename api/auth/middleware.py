"""FastAPI middleware for API key auth, usage logging, and rate limiting."""
from __future__ import annotations

import time
from collections.abc import Sequence

from fastapi import Request
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from api.auth.keys import log_usage, verify_api_key
from api.auth.rate_limit import InMemoryRateLimiter, rate_limiter


class ApiKeyAuthMiddleware(BaseHTTPMiddleware):
    """Require Bearer API keys for external API and MCP consumers."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        allowed_origins: Sequence[str],
        limiter: InMemoryRateLimiter | None = None,
    ) -> None:
        super().__init__(app)
        self.allowed_origins = tuple(origin.rstrip("/") for origin in allowed_origins)
        self.limiter = limiter or rate_limiter

    async def dispatch(self, request: Request, call_next) -> Response:
        if self._should_skip(request):
            return await call_next(request)

        raw_key = self._extract_bearer_token(request)
        if raw_key is None:
            return JSONResponse(
                {"detail": "Missing Authorization: Bearer API key"},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )

        auth_context = await run_in_threadpool(verify_api_key, raw_key)
        if auth_context is None:
            return JSONResponse(
                {"detail": "Invalid or inactive API key"},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )

        request.state.auth = auth_context
        limit_result = self.limiter.check(
            auth_context["api_key_id"],
            auth_context.get("tier", "free"),
        )
        if not limit_result.allowed:
            return JSONResponse(
                {"detail": f"Rate limit exceeded for {limit_result.window} window"},
                status_code=429,
                headers={"Retry-After": str(limit_result.retry_after)},
            )

        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit_result.limit)
        response.headers["X-RateLimit-Remaining"] = str(limit_result.remaining)
        response_ms = int((time.perf_counter() - started) * 1000)
        await run_in_threadpool(
            log_usage,
            auth_context["api_key_id"],
            request.url.path,
            response_ms,
        )
        return response

    def _should_skip(self, request: Request) -> bool:
        path = request.url.path
        if request.method == "OPTIONS":
            return True
        if path == "/api/health":
            return True
        if path == "/api/portal/signup":
            return True
        if not self._is_protected_path(path):
            return True
        if path == "/api/portal" or path.startswith("/api/portal/"):
            return False
        return self._has_allowed_frontend_origin(request)

    @staticmethod
    def _is_protected_path(path: str) -> bool:
        return path.startswith("/api/") or path == "/mcp" or path.startswith("/mcp/")

    def _has_allowed_frontend_origin(self, request: Request) -> bool:
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") in self.allowed_origins:
            return True

        referer = request.headers.get("referer")
        if referer:
            normalized_referer = referer.rstrip("/")
            if any(
                normalized_referer == allowed
                or normalized_referer.startswith(f"{allowed}/")
                for allowed in self.allowed_origins
            ):
                return True

        # First-party fallback: the SPA is served by this same app, so a request
        # whose Origin/Referer host matches our own Host is same-origin and
        # trustworthy regardless of the deploy's IP / domain / port. External API
        # consumers send no Referer (or a cross-origin one) and still need a key.
        return self._is_same_origin(request)

    @staticmethod
    def _is_same_origin(request: Request) -> bool:
        from urllib.parse import urlparse

        source = request.headers.get("origin") or request.headers.get("referer")
        if not source:
            return False
        parsed = urlparse(source)
        if not parsed.netloc:
            return False
        # nginx forwards the original host via X-Forwarded-Host; fall back to Host.
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        return bool(host) and parsed.netloc == host

    @staticmethod
    def _extract_bearer_token(request: Request) -> str | None:
        authorization = request.headers.get("authorization")
        if not authorization:
            return None
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        return token.strip()
