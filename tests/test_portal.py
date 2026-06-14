from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from api.auth.keys import create_api_key_for_user, create_user, verify_api_key
from api.auth.rate_limit import rate_limiter
from api.main import app


@pytest.fixture(autouse=True)
def isolated_auth_db(tmp_path, monkeypatch) -> Iterator[None]:
    monkeypatch.setenv("TENNIS_AUTH_DB", str(tmp_path / "auth.db"))
    rate_limiter.reset()
    yield
    rate_limiter.reset()


def _auth_headers(raw_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {raw_key}"}


def _create_user_key(email: str = "dev@example.com") -> str:
    user = create_user(email, "Dev User", tier="free")
    key = create_api_key_for_user(user["id"], "default")
    return key["key"]


def test_signup_creates_free_user_and_returns_key_once() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/portal/signup",
        json={"email": "new@example.com", "name": "New Dev", "key_name": "first"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "new@example.com"
    assert data["user"]["tier"] == "free"
    assert data["api_key"]["key"].startswith("cv_")
    assert verify_api_key(data["api_key"]["key"]) is not None


def test_signup_rejects_duplicate_email() -> None:
    client = TestClient(app)
    payload = {"email": "dupe@example.com", "name": "Dupe", "key_name": "first"}

    assert client.post("/api/portal/signup", json=payload).status_code == 200
    duplicate = client.post("/api/portal/signup", json=payload)

    assert duplicate.status_code == 409


def test_portal_requires_bearer_auth_even_from_allowed_frontend_origin() -> None:
    client = TestClient(app)

    response = client.get(
        "/api/portal/me",
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 401


def test_portal_profile_keys_and_revoke_flow() -> None:
    raw_key = _create_user_key()
    client = TestClient(app)

    me = client.get("/api/portal/me", headers=_auth_headers(raw_key))
    assert me.status_code == 200
    assert me.json()["email"] == "dev@example.com"

    created = client.post(
        "/api/portal/keys",
        json={"name": "automation"},
        headers=_auth_headers(raw_key),
    )
    assert created.status_code == 200
    created_key = created.json()
    assert created_key["key"].startswith("cv_")

    listed = client.get("/api/portal/keys", headers=_auth_headers(raw_key))
    assert listed.status_code == 200
    keys = listed.json()["keys"]
    assert {key["name"] for key in keys} == {"default", "automation"}

    revoked = client.delete(
        f"/api/portal/keys/{created_key['id']}",
        headers=_auth_headers(raw_key),
    )
    assert revoked.status_code == 200
    assert revoked.json()["revoked"] is True
    assert verify_api_key(created_key["key"]) is None


def test_portal_usage_summary() -> None:
    raw_key = _create_user_key()
    client = TestClient(app)

    assert client.get("/api/portal/me", headers=_auth_headers(raw_key)).status_code == 200
    usage = client.get("/api/portal/usage?days=7", headers=_auth_headers(raw_key))
    assert usage.status_code == 200
    assert any(row["endpoint"] == "/api/portal/me" for row in usage.json()["usage"])
