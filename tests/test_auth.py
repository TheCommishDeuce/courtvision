from __future__ import annotations

import sqlite3
from collections.abc import Iterator

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from api.auth.keys import (
    create_api_key_for_user,
    create_user,
    get_user_by_email,
    revoke_api_key,
    update_user_tier,
    verify_api_key,
)
from api.auth.middleware import ApiKeyAuthMiddleware
from api.auth.models import auth_db_connection
from api.auth.rate_limit import InMemoryRateLimiter, rate_limiter


@pytest.fixture(autouse=True)
def isolated_auth_db(tmp_path, monkeypatch) -> Iterator[None]:
    monkeypatch.setenv("TENNIS_AUTH_DB", str(tmp_path / "auth.db"))
    rate_limiter.reset()
    yield
    rate_limiter.reset()


def _make_app(limiter: InMemoryRateLimiter | None = None) -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        ApiKeyAuthMiddleware,
        allowed_origins=("http://localhost:5173",),
        limiter=limiter,
    )

    @app.get("/api/protected")
    def protected(request: Request) -> dict[str, str]:
        auth = getattr(request.state, "auth", None)
        return {"email": auth["email"] if auth else "bypassed"}

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


def _create_key(tier: str = "free") -> str:
    user = create_user("test@example.com", "Test User", tier=tier)
    key = create_api_key_for_user(user["id"], "test-key")
    return key["key"]


def test_api_key_roundtrip_and_revoke() -> None:
    raw_key = _create_key()

    auth = verify_api_key(raw_key)
    assert auth is not None
    assert auth["email"] == "test@example.com"
    assert auth["tier"] == "free"

    assert revoke_api_key(auth["api_key_id"])
    assert verify_api_key(raw_key) is None


def test_middleware_rejects_missing_and_invalid_keys() -> None:
    client = TestClient(_make_app())

    missing = client.get("/api/protected")
    assert missing.status_code == 401

    invalid = client.get(
        "/api/protected",
        headers={"Authorization": "Bearer cv_invalid"},
    )
    assert invalid.status_code == 401


def test_middleware_accepts_valid_key_and_logs_usage() -> None:
    raw_key = _create_key()
    client = TestClient(_make_app())

    response = client.get(
        "/api/protected",
        headers={"Authorization": f"Bearer {raw_key}"},
    )

    assert response.status_code == 200
    assert response.json() == {"email": "test@example.com"}
    assert response.headers["X-RateLimit-Limit"] == "60"

    with auth_db_connection() as con:
        row = con.execute(
            "SELECT endpoint, COUNT(*) AS count FROM usage_events GROUP BY endpoint"
        ).fetchone()

    assert row["endpoint"] == "/api/protected"
    assert row["count"] == 1


def test_middleware_bypasses_allowed_frontend_origin_and_health() -> None:
    client = TestClient(_make_app())

    protected = client.get(
        "/api/protected",
        headers={"Origin": "http://localhost:5173"},
    )
    assert protected.status_code == 200
    assert protected.json() == {"email": "bypassed"}

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}


def test_rate_limit_returns_429() -> None:
    raw_key = _create_key()
    client = TestClient(_make_app())
    headers = {"Authorization": f"Bearer {raw_key}"}

    for _ in range(60):
        assert client.get("/api/protected", headers=headers).status_code == 200

    limited = client.get("/api/protected", headers=headers)
    assert limited.status_code == 429
    assert limited.headers["Retry-After"]


def test_dev_tier_has_high_local_testing_limit() -> None:
    raw_key = _create_key(tier="dev")
    client = TestClient(_make_app())
    headers = {"Authorization": f"Bearer {raw_key}"}

    for _ in range(25):
        response = client.get("/api/protected", headers=headers)
        assert response.status_code == 200
        assert response.headers["X-RateLimit-Limit"] == "3000"


def test_update_user_tier_can_set_dev_tier() -> None:
    user = create_user("tier@example.com", "Tier User")
    updated = update_user_tier(user["id"], tier="dev")

    assert updated is not None
    assert updated["tier"] == "dev"
    assert get_user_by_email("tier@example.com")["tier"] == "dev"


def test_auth_schema_is_sqlite_backed() -> None:
    with auth_db_connection() as con:
        assert isinstance(con, sqlite3.Connection)
        tables = con.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type = 'table'
              AND name IN ('users', 'api_keys', 'usage_events')
            ORDER BY name
            """
        ).fetchall()

    assert [row["name"] for row in tables] == ["api_keys", "usage_events", "users"]
