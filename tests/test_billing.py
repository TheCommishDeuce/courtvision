from __future__ import annotations

import hashlib
import hmac
import json
from collections.abc import Iterator

import httpx
import pytest
from fastapi.testclient import TestClient

from api.auth.keys import create_api_key_for_user, create_user
from api.auth.rate_limit import rate_limiter
from api.billing.lemonsqueezy import BillingSignatureError, LemonSqueezyProvider
from api.main import app


@pytest.fixture(autouse=True)
def isolated_auth_db(tmp_path, monkeypatch) -> Iterator[None]:
    monkeypatch.setenv("TENNIS_AUTH_DB", str(tmp_path / "auth.db"))
    rate_limiter.reset()
    yield
    rate_limiter.reset()


def _signature(secret: str, payload: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _create_user_key(email: str = "billing@example.com") -> tuple[dict, str]:
    user = create_user(email, "Billing User", tier="free")
    key = create_api_key_for_user(user["id"], "default")
    return user, key["key"]


def test_billing_webhook_route_is_not_public_api(monkeypatch) -> None:
    monkeypatch.setenv("LEMONSQUEEZY_WEBHOOK_SECRET", "secret")
    _, raw_key = _create_user_key()
    client = TestClient(app)
    payload = b'{"meta":{"event_name":"subscription_created"},"data":{"attributes":{}}}'

    response = client.post(
        "/api/webhooks/lemonsqueezy",
        content=payload,
        headers={
            "Authorization": f"Bearer {raw_key}",
            "X-Signature": _signature("secret", payload),
        },
    )

    assert response.status_code in {404, 405}
    assert "/api/webhooks/lemonsqueezy" not in client.get("/openapi.json").json()["paths"]


def test_provider_can_create_checkout_url_if_billing_is_reenabled(monkeypatch) -> None:
    monkeypatch.setenv("LEMONSQUEEZY_API_KEY", "api_key")
    monkeypatch.setenv("LEMONSQUEEZY_STORE_ID", "10")
    monkeypatch.setenv("LEMONSQUEEZY_VARIANT_STARTER", "20")

    def fake_post(*args, **kwargs):
        assert args[0] == "https://api.lemonsqueezy.com/v1/checkouts"
        assert kwargs["json"]["data"]["attributes"]["checkout_data"]["custom"]["tier"] == "starter"
        return httpx.Response(
            201,
            json={"data": {"attributes": {"url": "https://checkout.example/test"}}},
            request=httpx.Request("POST", args[0]),
        )

    monkeypatch.setattr("api.billing.lemonsqueezy.httpx.post", fake_post)

    url = LemonSqueezyProvider().create_checkout_url("user_1", "starter", "test@example.com")

    assert url == "https://checkout.example/test"


def test_provider_rejects_bad_webhook_signature(monkeypatch) -> None:
    monkeypatch.setenv("LEMONSQUEEZY_WEBHOOK_SECRET", "secret")
    payload = b'{"meta":{"event_name":"subscription_created"},"data":{"attributes":{}}}'

    with pytest.raises(BillingSignatureError):
        LemonSqueezyProvider().handle_webhook(payload, "bad")


def test_provider_parses_variant_tier_from_webhook(monkeypatch) -> None:
    monkeypatch.setenv("LEMONSQUEEZY_WEBHOOK_SECRET", "secret")
    monkeypatch.setenv("LEMONSQUEEZY_VARIANT_PRO", "99")
    payload = json.dumps(
        {
            "meta": {"event_name": "subscription_created", "custom_data": {"user_id": "u1"}},
            "data": {"id": "sub_1", "attributes": {"variant_id": 99, "customer_id": 123}},
        }
    ).encode("utf-8")

    event = LemonSqueezyProvider().handle_webhook(payload, _signature("secret", payload))

    assert event.tier == "pro"
    assert event.customer_id == "123"
