"""Billing provider protocol and shared value objects."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class WebhookEvent:
    event_name: str
    user_id: str | None
    tier: str | None
    customer_id: str | None
    subscription_id: str | None
    status: str | None


@dataclass(frozen=True)
class SubscriptionStatus:
    customer_id: str
    status: str
    tier: str


class BillingProvider(Protocol):
    def create_checkout_url(self, user_id: str, tier: str, email: str) -> str:
        """Create a checkout URL for a user and target tier."""

    def handle_webhook(self, payload: bytes, signature: str) -> WebhookEvent:
        """Validate and parse a provider webhook event."""

    def get_subscription_status(self, customer_id: str) -> SubscriptionStatus:
        """Return subscription status for a customer."""

    def create_customer_portal_url(self, customer_id: str) -> str:
        """Create or return a customer billing portal URL."""

