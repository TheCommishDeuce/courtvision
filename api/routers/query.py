"""Read-only ad-hoc SQL over the tennis database.

This is the one endpoint that runs SQL the caller wrote, so the defences are
layered and each one is independently sufficient to stop a whole class of abuse:

1. **Read-only connection.** Opened with ``read_only=True``, so nothing can
   write to the database file.
2. **External access disabled, then locked.** ``enable_external_access=false``
   blocks ``read_csv`` on local paths, ``COPY … TO`` writes, ``ATTACH`` of other
   databases, and httpfs exfiltration. ``lock_configuration=true`` is applied
   last so the submitted SQL cannot ``SET`` any of it back on.
3. **Subquery wrapping.** Every statement runs as
   ``SELECT * FROM ( <sql> ) LIMIT n``. Only a query is grammatical in subquery
   position, so ``DROP``, ``COPY``, ``ATTACH`` and semicolon-chained statements
   fail to parse rather than needing to be blacklisted.
4. **Prefix check and length cap** as a fast, legible rejection before the
   database is touched at all.
5. **Statement timeout.** The query runs on a worker thread; on expiry the
   connection is interrupted so a cartesian join cannot pin a CPU forever.

The database file contains exactly the four relations advertised by
``/api/query/schema`` and nothing else, so the file itself is the data boundary.
"""
from __future__ import annotations

import csv
import io
import re
import time
from collections.abc import Generator, Iterator
from typing import Any

import duckdb
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from db.connection import get_db as open_db

router = APIRouter()

# Rows returned to the browser. The grid stays responsive and the JSON stays small.
MAX_DISPLAY_ROWS = 1_000
# Rows in a CSV download.
MAX_CSV_ROWS = 50_000
# Wall-clock ceiling for a single statement.
STATEMENT_TIMEOUT_S = 20.0
MAX_SQL_LENGTH = 20_000
CSV_CHUNK = 2_000

EXPOSED_RELATIONS = ("matches_main", "player_match_view", "h2h_view", "players")

# Leading SQL comments and whitespace, so the prefix check sees real syntax.
_LEADING_NOISE = re.compile(r"^(?:\s|--[^\n]*\n|/\*.*?\*/)+", re.DOTALL)


class QueryRequest(BaseModel):
    sql: str = Field(..., description="A single SELECT (or WITH … SELECT) statement.")
    limit: int | None = Field(
        None, ge=1, le=MAX_DISPLAY_ROWS, description="Row cap, defaults to the maximum."
    )


class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    truncated: bool
    limit: int
    elapsed_ms: int


def open_hardened() -> duckdb.DuckDBPyConnection:
    """Open a read-only connection locked down for untrusted SQL."""
    con = open_db(read_only=True)
    try:
        con.execute("SET enable_external_access=false")
        con.execute("SET allow_community_extensions=false")
        con.execute("SET autoinstall_known_extensions=false")
        con.execute("SET autoload_known_extensions=false")
        # Must come last: it freezes every setting above for this connection.
        con.execute("SET lock_configuration=true")
    except BaseException:
        con.close()
        raise
    return con


def get_query_db() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Request-scoped hardened connection, for handlers that return a value.

    Not usable for streaming responses: FastAPI closes dependencies when the
    handler returns, which for a StreamingResponse is before the body is read.
    """
    con = open_hardened()
    try:
        yield con
    finally:
        con.close()


def _clean_sql(raw: str) -> str:
    """Normalise and sanity-check the statement, or raise 400 with the reason."""
    sql = (raw or "").strip()
    if not sql:
        raise HTTPException(status_code=400, detail="Enter a query to run.")
    if len(sql) > MAX_SQL_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Query is too long ({len(sql)} characters). The limit is {MAX_SQL_LENGTH}.",
        )

    # A trailing semicolon is habitual; strip it so the subquery wrap stays valid.
    sql = sql.rstrip().rstrip(";").rstrip()
    if not sql:
        raise HTTPException(status_code=400, detail="Enter a query to run.")

    body = _LEADING_NOISE.sub("", sql)
    if not re.match(r"^(select|with)\b", body, re.IGNORECASE):
        raise HTTPException(
            status_code=400,
            detail="Only SELECT statements run here. Start the query with SELECT or WITH.",
        )
    return sql


def _wrap(sql: str, limit: int) -> str:
    """Force the statement into subquery position and cap its rows."""
    return f"SELECT * FROM (\n{sql}\n) AS courtvision_query LIMIT {int(limit)}"


def _execute(
    con: duckdb.DuckDBPyConnection, sql: str
) -> tuple[duckdb.DuckDBPyConnection, list[str]]:
    """Run `sql` under the statement timeout, returning the live cursor.

    DuckDB has no statement_timeout setting, so the query runs on a worker
    thread and the connection is interrupted if it overruns.
    """
    import threading

    error: list[BaseException] = []
    done = threading.Event()

    def run() -> None:
        try:
            con.execute(sql)
        except BaseException as exc:  # noqa: BLE001 - re-raised on the caller's thread
            error.append(exc)
        finally:
            done.set()

    worker = threading.Thread(target=run, daemon=True)
    worker.start()

    if not done.wait(STATEMENT_TIMEOUT_S):
        con.interrupt()
        done.wait(5.0)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Query took longer than {int(STATEMENT_TIMEOUT_S)} seconds and was stopped. "
                "Add filters, or narrow the year range."
            ),
        )

    if error:
        exc = error[0]
        if isinstance(exc, duckdb.Error):
            raise HTTPException(status_code=400, detail=str(exc).strip()) from exc
        raise exc

    description = con.description or []
    return con, [d[0] for d in description]


@router.post("", response_model=QueryResponse)
def run_query(
    body: QueryRequest,
    con: duckdb.DuckDBPyConnection = Depends(get_query_db),
) -> QueryResponse:
    """Run one read-only SELECT and return up to `MAX_DISPLAY_ROWS` rows."""
    sql = _clean_sql(body.sql)
    limit = body.limit or MAX_DISPLAY_ROWS

    started = time.perf_counter()
    # Fetch one extra row to tell "exactly at the cap" from "there is more".
    cur, columns = _execute(con, _wrap(sql, limit + 1))
    records = cur.fetchall()
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    truncated = len(records) > limit
    if truncated:
        records = records[:limit]

    return QueryResponse(
        columns=columns,
        rows=[[_jsonable(v) for v in row] for row in records],
        row_count=len(records),
        truncated=truncated,
        limit=limit,
        elapsed_ms=elapsed_ms,
    )


@router.post("/csv")
def run_query_csv(body: QueryRequest) -> StreamingResponse:
    """Stream the same query as CSV, up to `MAX_CSV_ROWS` rows.

    This route owns its connection rather than taking it from a dependency: the
    rows are fetched while the response body streams, which is after FastAPI
    would have closed a dependency-provided one.
    """
    sql = _clean_sql(body.sql)

    con = open_hardened()
    try:
        # Execute before streaming starts so a bad query still returns 400
        # rather than a truncated download.
        cur, columns = _execute(con, _wrap(sql, MAX_CSV_ROWS))
    except BaseException:
        con.close()
        raise

    def rows() -> Iterator[str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        def flush() -> str:
            out = buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)
            return out

        try:
            writer.writerow(columns)
            yield flush()

            while True:
                batch = cur.fetchmany(CSV_CHUNK)
                if not batch:
                    break
                writer.writerows([[_csvable(v) for v in row] for row in batch])
                yield flush()
        finally:
            con.close()

    return StreamingResponse(
        rows(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="courtvision-query.csv"'},
    )


@router.get("/schema")
def query_schema(
    con: duckdb.DuckDBPyConnection = Depends(get_query_db),
) -> dict[str, Any]:
    """Columns and row counts for the relations this endpoint exposes."""
    placeholders = ", ".join("?" for _ in EXPOSED_RELATIONS)
    columns = con.execute(
        f"""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_name IN ({placeholders})
        ORDER BY table_name, ordinal_position
        """,
        list(EXPOSED_RELATIONS),
    ).fetchall()

    grouped: dict[str, list[dict[str, str]]] = {name: [] for name in EXPOSED_RELATIONS}
    for table, column, dtype in columns:
        grouped[table].append({"name": column, "type": dtype})

    relations = []
    for name in EXPOSED_RELATIONS:
        # Identifier is from our own constant, never from the request.
        rows = con.execute(f'SELECT count(*) FROM "{name}"').fetchone()
        relations.append(
            {
                "name": name,
                "rows": int(rows[0]) if rows else 0,
                "columns": grouped[name],
            }
        )

    return {
        "relations": relations,
        "limits": {
            "display_rows": MAX_DISPLAY_ROWS,
            "csv_rows": MAX_CSV_ROWS,
            "timeout_seconds": int(STATEMENT_TIMEOUT_S),
        },
    }


def _jsonable(value: Any) -> Any:
    """DuckDB scalars → JSON-safe values."""
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return value if value == value and value not in (float("inf"), float("-inf")) else None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    return str(value)


def _csvable(value: Any) -> Any:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value
