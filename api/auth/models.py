"""SQLite auth database setup and connection helpers."""
from __future__ import annotations

import os
import sqlite3
import threading
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

DEFAULT_AUTH_DB = Path("data/auth.db")

_SCHEMA_LOCK = threading.Lock()
_INITIALIZED_PATHS: set[Path] = set()

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free',
    billing_customer_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_active
    ON api_keys(key_prefix, is_active);

CREATE INDEX IF NOT EXISTS idx_api_keys_user
    ON api_keys(user_id);

CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    response_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_events_key_time
    ON usage_events(api_key_id, timestamp);
"""


def get_auth_db_path() -> Path:
    """Return the configured auth SQLite path."""
    return Path(os.getenv("TENNIS_AUTH_DB", str(DEFAULT_AUTH_DB)))


def open_auth_db() -> sqlite3.Connection:
    """Open an auth DB connection, creating the schema on first use per path."""
    db_path = get_auth_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path, timeout=30, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA journal_mode = WAL")

    resolved = db_path.resolve()
    if resolved not in _INITIALIZED_PATHS:
        with _SCHEMA_LOCK:
            if resolved not in _INITIALIZED_PATHS:
                con.executescript(SCHEMA_SQL)
                con.commit()
                _INITIALIZED_PATHS.add(resolved)
    return con


@contextmanager
def auth_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Yield an auth DB connection and always close it."""
    con = open_auth_db()
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def get_auth_db() -> Generator[sqlite3.Connection, None, None]:
    """FastAPI dependency that yields a per-request auth DB connection."""
    with auth_db_connection() as con:
        yield con
