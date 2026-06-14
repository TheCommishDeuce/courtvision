"""Shared DuckDB connection helper."""
from __future__ import annotations

import os
from pathlib import Path

import duckdb

DEFAULT_DB_PATH = Path("data/tennis.duckdb")
DEFAULT_THREADS = 1


def db_path() -> Path:
    return Path(os.environ.get("TENNIS_DB", DEFAULT_DB_PATH))


def db_threads() -> int:
    raw = os.environ.get("TENNIS_DB_THREADS")
    if raw is None:
        return DEFAULT_THREADS
    try:
        return int(raw)
    except ValueError:
        return DEFAULT_THREADS


def get_db(
    read_only: bool = True,
    path: str | Path | None = None,
) -> duckdb.DuckDBPyConnection:
    target = Path(path) if path is not None else db_path()
    if not read_only:
        target.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(
        str(target),
        read_only=read_only,
        config={"threads": str(db_threads())},
    )
