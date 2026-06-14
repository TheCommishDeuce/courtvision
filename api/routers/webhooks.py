"""External billing webhook endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status

from api.auth.keys import update_user_billing
from api.billing.lemonsqueezy import BillingSignatureError, get_billing_provider

router = APIRouter(tags=["webhooks"])

PAID_EVENTS = {
    "subscription_created",
    "subscription_resumed",
    "subscription_updated",
    "subscription_payment_success",
}
CANCEL_EVENTS = {
    "subscription_cancelled",
    "subscription_expired",
    "subscription_paused",
    "subscription_payment_failed",
}


@router.post("/lemonsqueezy", operation_id="lemonsqueezy_webhook")
async def lemonsqueezy_webhook(
    request: Request,
    x_signature: str = Header(..., alias="X-Signature"),
):
    """Handle Lemon Squeezy subscription lifecycle webhook events."""
    payload = await request.body()
    provider = get_billing_provider()
    try:
        event = provider.handle_webhook(payload, x_signature)
    except BillingSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload") from exc

    if not event.user_id:
        return {"ok": True, "ignored": True, "reason": "missing user_id"}

    if event.event_name in PAID_EVENTS and event.tier in {"starter", "pro"}:
        update_user_billing(
            event.user_id,
            tier=event.tier,
            billing_customer_id=event.customer_id,
        )
        return {"ok": True, "tier": event.tier}

    if event.event_name in CANCEL_EVENTS:
        update_user_billing(
            event.user_id,
            tier="free",
            billing_customer_id=event.customer_id,
        )
        return {"ok": True, "tier": "free"}

    return {"ok": True, "ignored": True, "event": event.event_name}

