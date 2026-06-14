"""API key lifecycle and usage helpers."""
from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt

from api.auth.models import auth_db_connection

KEY_PREFIX_LENGTH = 11


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _row_to_dict(row: Any) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def generate_api_key() -> tuple[str, str]:
    """Generate a raw API key and bcrypt hash."""
    raw_key = "cv_" + secrets.token_urlsafe(32)
    key_hash = bcrypt.hashpw(raw_key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return raw_key, key_hash


def create_user(email: str, name: str, tier: str = "free") -> dict[str, Any]:
    """Create a user or return the existing user for the email."""
    user_id = str(uuid.uuid4())
    created_at = _now_iso()
    normalized_email = email.strip().lower()
    with auth_db_connection() as con:
        con.execute(
            """
            INSERT INTO users (id, email, name, tier, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO NOTHING
            """,
            [user_id, normalized_email, name, tier, created_at],
        )
        row = con.execute(
            "SELECT * FROM users WHERE email = ?",
            [normalized_email],
        ).fetchone()
    user = _row_to_dict(row)
    if user is None:
        raise RuntimeError("Failed to create or load user")
    return user


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Return a user by email, if present."""
    with auth_db_connection() as con:
        row = con.execute(
            "SELECT * FROM users WHERE email = ?",
            [email.strip().lower()],
        ).fetchone()
    return _row_to_dict(row)


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Return a user by id, if present."""
    with auth_db_connection() as con:
        row = con.execute(
            "SELECT * FROM users WHERE id = ?",
            [user_id],
        ).fetchone()
    return _row_to_dict(row)


def update_user_tier(
    user_id: str,
    *,
    tier: str,
    billing_customer_id: str | None = None,
) -> dict[str, Any] | None:
    """Update a user's access tier and return the updated user."""
    with auth_db_connection() as con:
        con.execute(
            """
            UPDATE users
            SET tier = ?,
                billing_customer_id = COALESCE(?, billing_customer_id)
            WHERE id = ?
            """,
            [tier, billing_customer_id, user_id],
        )
        row = con.execute("SELECT * FROM users WHERE id = ?", [user_id]).fetchone()
    return _row_to_dict(row)


def update_user_billing(
    user_id: str,
    *,
    tier: str,
    billing_customer_id: str | None = None,
) -> dict[str, Any] | None:
    """Backward-compatible wrapper for older billing integration code."""
    return update_user_tier(
        user_id,
        tier=tier,
        billing_customer_id=billing_customer_id,
    )


def create_api_key_for_user(user_id: str, name: str) -> dict[str, Any]:
    """Create an API key for a user and return the raw key once."""
    raw_key, key_hash = generate_api_key()
    key_id = str(uuid.uuid4())
    created_at = _now_iso()
    key_prefix = raw_key[:KEY_PREFIX_LENGTH]
    with auth_db_connection() as con:
        con.execute(
            """
            INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [key_id, user_id, key_hash, key_prefix, name, created_at],
        )
    return {
        "id": key_id,
        "user_id": user_id,
        "name": name,
        "key": raw_key,
        "key_prefix": key_prefix,
        "created_at": created_at,
    }


def verify_api_key(raw_key: str) -> dict[str, Any] | None:
    """Verify a bearer key and return combined user/key metadata."""
    if not raw_key.startswith("cv_"):
        return None

    key_prefix = raw_key[:KEY_PREFIX_LENGTH]
    with auth_db_connection() as con:
        rows = con.execute(
            """
            SELECT
                api_keys.id AS api_key_id,
                api_keys.user_id,
                api_keys.key_hash,
                api_keys.key_prefix,
                api_keys.name AS api_key_name,
                api_keys.created_at AS api_key_created_at,
                api_keys.last_used_at,
                users.email,
                users.name AS user_name,
                users.tier,
                users.billing_customer_id,
                users.created_at AS user_created_at
            FROM api_keys
            JOIN users ON users.id = api_keys.user_id
            WHERE api_keys.key_prefix = ?
              AND api_keys.is_active = 1
            """,
            [key_prefix],
        ).fetchall()

        for row in rows:
            data = dict(row)
            if bcrypt.checkpw(raw_key.encode("utf-8"), data["key_hash"].encode("utf-8")):
                con.execute(
                    "UPDATE api_keys SET last_used_at = ? WHERE id = ?",
                    [_now_iso(), data["api_key_id"]],
                )
                data.pop("key_hash", None)
                return data
    return None


def revoke_api_key(key_id: str) -> bool:
    """Deactivate an API key."""
    with auth_db_connection() as con:
        cur = con.execute(
            "UPDATE api_keys SET is_active = 0 WHERE id = ? AND is_active = 1",
            [key_id],
        )
        return cur.rowcount > 0


def revoke_api_key_for_user(key_id: str, user_id: str) -> bool:
    """Deactivate an API key owned by a specific user."""
    with auth_db_connection() as con:
        cur = con.execute(
            """
            UPDATE api_keys
            SET is_active = 0
            WHERE id = ?
              AND user_id = ?
              AND is_active = 1
            """,
            [key_id, user_id],
        )
        return cur.rowcount > 0


def list_api_keys_for_user(user_id: str) -> list[dict[str, Any]]:
    """List non-secret API key metadata for a user."""
    with auth_db_connection() as con:
        rows = con.execute(
            """
            SELECT id, user_id, key_prefix, name, is_active, created_at, last_used_at
            FROM api_keys
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            [user_id],
        ).fetchall()
    return [dict(row) for row in rows]


def log_usage(api_key_id: str, endpoint: str, response_ms: int) -> None:
    """Record a single API usage event."""
    with auth_db_connection() as con:
        con.execute(
            """
            INSERT INTO usage_events (api_key_id, endpoint, timestamp, response_ms)
            VALUES (?, ?, ?, ?)
            """,
            [api_key_id, endpoint, _now_iso(), response_ms],
        )


def get_usage_summary(user_id: str, days: int = 30) -> list[dict[str, Any]]:
    """Aggregate usage by endpoint and UTC date for a user's active/inactive keys."""
    since = datetime.now(UTC) - timedelta(days=days)
    with auth_db_connection() as con:
        rows = con.execute(
            """
            SELECT
                substr(usage_events.timestamp, 1, 10) AS day,
                usage_events.endpoint,
                COUNT(*) AS requests,
                ROUND(AVG(usage_events.response_ms), 0) AS avg_response_ms
            FROM usage_events
            JOIN api_keys ON api_keys.id = usage_events.api_key_id
            WHERE api_keys.user_id = ?
              AND usage_events.timestamp >= ?
            GROUP BY day, usage_events.endpoint
            ORDER BY day DESC, requests DESC
            """,
            [user_id, since.isoformat()],
        ).fetchall()
    return [dict(row) for row in rows]
