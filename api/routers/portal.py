"""Developer portal endpoints for API key and usage management."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field

from api.auth.keys import (
    create_api_key_for_user,
    create_user,
    get_usage_summary,
    get_user_by_email,
    list_api_keys_for_user,
    revoke_api_key_for_user,
)

router = APIRouter(tags=["portal"])


class SignupRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=120)
    key_name: str = Field("default", min_length=1, max_length=120)


class CreateKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


def _auth(request: Request) -> dict:
    auth = getattr(request.state, "auth", None)
    if auth is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return auth


@router.post("/signup", operation_id="portal_signup")
def signup(payload: SignupRequest):
    """Create a free developer account and return the first API key once."""
    if get_user_by_email(str(payload.email)) is not None:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user = create_user(email=str(payload.email), name=payload.name, tier="free")
    key = create_api_key_for_user(user["id"], payload.key_name)
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "tier": user["tier"],
            "created_at": user["created_at"],
        },
        "api_key": {
            "id": key["id"],
            "name": key["name"],
            "key_prefix": key["key_prefix"],
            "created_at": key["created_at"],
            "key": key["key"],
        },
    }


@router.get("/me", operation_id="portal_get_me")
def get_me(request: Request):
    """Return the authenticated developer account profile."""
    auth = _auth(request)
    return {
        "id": auth["user_id"],
        "email": auth["email"],
        "name": auth["user_name"],
        "tier": auth["tier"],
        "created_at": auth["user_created_at"],
    }


@router.get("/keys", operation_id="portal_list_keys")
def list_keys(request: Request):
    """List API keys for the authenticated developer account."""
    auth = _auth(request)
    return {"keys": list_api_keys_for_user(auth["user_id"])}


@router.post("/keys", operation_id="portal_create_key")
def create_key(payload: CreateKeyRequest, request: Request):
    """Create an API key for the authenticated developer account and return it once."""
    auth = _auth(request)
    key = create_api_key_for_user(auth["user_id"], payload.name)
    return {
        "id": key["id"],
        "name": key["name"],
        "key_prefix": key["key_prefix"],
        "created_at": key["created_at"],
        "key": key["key"],
    }


@router.delete("/keys/{key_id}", operation_id="portal_revoke_key")
def revoke_key(key_id: str, request: Request):
    """Revoke an API key owned by the authenticated developer account."""
    auth = _auth(request)
    if not revoke_api_key_for_user(key_id, auth["user_id"]):
        raise HTTPException(status_code=404, detail="API key not found")
    return {"revoked": True, "key_id": key_id}


@router.get("/usage", operation_id="portal_get_usage")
def get_usage(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of trailing UTC days to summarize."),
):
    """Return API usage grouped by endpoint and UTC day for the authenticated account."""
    auth = _auth(request)
    return {"usage": get_usage_summary(auth["user_id"], days=days)}
