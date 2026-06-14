"""Lemon Squeezy billing provider implementation."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from typing import Any

import httpx

from api.billing.interface import SubscriptionStatus, WebhookEvent

API_BASE_URL = "https://api.lemonsqueezy.com/v1"
PAID_TIERS = {"starter", "pro"}


class BillingNotConfiguredError(RuntimeError):
    """Raised when billing env vars are not configured."""


class BillingSignatureError(ValueError):
    """Raised when a webhook signature is invalid."""


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


def _variant_for_tier(tier: str) -> str:
    if tier == "starter":
        return _env("LEMONSQUEEZY_VARIANT_STARTER")
    if tier == "pro":
        return _env("LEMONSQUEEZY_VARIANT_PRO")
    return ""


def _tier_for_variant(variant_id: str | None) -> str | None:
    if variant_id and variant_id == _env("LEMONSQUEEZY_VARIANT_STARTER"):
        return "starter"
    if variant_id and variant_id == _env("LEMONSQUEEZY_VARIANT_PRO"):
        return "pro"
    return None


def _require_config(*names: str) -> dict[str, str]:
    values = {name: _env(name) for name in names}
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise BillingNotConfiguredError(f"Missing billing configuration: {', '.join(missing)}")
    return values


class LemonSqueezyProvider:
    """Minimal Lemon Squeezy adapter for checkout and subscription webhooks."""

    def __init__(self, api_base_url: str = API_BASE_URL) -> None:
        self.api_base_url = api_base_url.rstrip("/")

    def create_checkout_url(self, user_id: str, tier: str, email: str) -> str:
        if tier not in PAID_TIERS:
            raise ValueError(f"Unsupported paid tier: {tier}")

        config = _require_config("LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID")
        variant_id = _variant_for_tier(tier)
        if not variant_id:
            raise BillingNotConfiguredError(f"Missing variant id for tier: {tier}")

        payload = {
            "data": {
                "type": "checkouts",
                "attributes": {
                    "checkout_data": {
                        "email": email,
                        "custom": {
                            "user_id": user_id,
                            "tier": tier,
                        },
                    },
                    "product_options": {
                        "enabled_variants": [int(variant_id)],
                    },
                },
                "relationships": {
                    "store": {
                        "data": {
                            "type": "stores",
                            "id": config["LEMONSQUEEZY_STORE_ID"],
                        }
                    },
                    "variant": {
                        "data": {
                            "type": "variants",
                            "id": variant_id,
                        }
                    },
                },
            }
        }

        response = httpx.post(
            f"{self.api_base_url}/checkouts",
            headers={
                "Authorization": f"Bearer {config['LEMONSQUEEZY_API_KEY']}",
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        return data["data"]["attributes"]["url"]

    def handle_webhook(self, payload: bytes, signature: str) -> WebhookEvent:
        secret = _require_config("LEMONSQUEEZY_WEBHOOK_SECRET")["LEMONSQUEEZY_WEBHOOK_SECRET"]
        digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(digest, signature):
            raise BillingSignatureError("Invalid Lemon Squeezy webhook signature")

        body = json.loads(payload.decode("utf-8"))
        meta = body.get("meta") or {}
        data = body.get("data") or {}
        attributes = data.get("attributes") or {}
        custom_data = (
            meta.get("custom_data")
            or attributes.get("custom_data")
            or attributes.get("checkout_data", {}).get("custom")
            or {}
        )
        variant_id = str(attributes.get("variant_id") or attributes.get("first_subscription_item", {}).get("variant_id") or "")
        tier = custom_data.get("tier") or _tier_for_variant(variant_id)

        return WebhookEvent(
            event_name=str(meta.get("event_name") or ""),
            user_id=custom_data.get("user_id"),
            tier=tier,
            customer_id=_as_str(attributes.get("customer_id")),
            subscription_id=_as_str(data.get("id")),
            status=_as_str(attributes.get("status")),
        )

    def get_subscription_status(self, customer_id: str) -> SubscriptionStatus:
        raise NotImplementedError("Subscription status lookup is not implemented for MVP")

    def create_customer_portal_url(self, customer_id: str) -> str:
        raise NotImplementedError("Customer portal URL creation is not implemented for MVP")


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def get_billing_provider() -> LemonSqueezyProvider:
    return LemonSqueezyProvider()

