"""DuckDB dependency for FastAPI request handlers."""
from __future__ import annotations

from collections.abc import Generator

import duckdb

from db.connection import get_db as open_db


def get_db() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    # Open/close per request. This is safer than long-lived thread-local
    # connections with native DuckDB objects under high request churn.
    con = open_db(read_only=True)
    try:
        yield con
    finally:
        con.close()
