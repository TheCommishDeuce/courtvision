"""Containment tests for the ad-hoc SQL endpoint.

These lock in the guarantees documented in ``api/routers/query.py``: a caller
can read the four exposed relations and nothing else, cannot write anywhere,
and cannot reach the filesystem or the network. If one of these starts failing,
the endpoint has become unsafe — do not weaken the test.
"""
from __future__ import annotations

import duckdb
import pytest
from fastapi import HTTPException

from api.routers import query as q


@pytest.fixture()
def con(tmp_path, monkeypatch):
    """A hardened connection over a throwaway database with the real relations."""
    db = tmp_path / "t.duckdb"
    setup = duckdb.connect(str(db))
    setup.execute("CREATE TABLE matches_main (winner_name VARCHAR, year INTEGER, tour VARCHAR)")
    setup.execute("INSERT INTO matches_main VALUES ('Ada', 2020, 'M'), ('Bo', 2021, 'F')")
    setup.execute("CREATE TABLE players (name VARCHAR)")
    setup.execute("INSERT INTO players VALUES ('Ada')")
    setup.close()

    monkeypatch.setenv("TENNIS_DB", str(db))
    connection = q.open_hardened()
    yield connection
    connection.close()


def run(con, sql: str, limit: int = 10):
    cur, columns = q._execute(con, q._wrap(q._clean_sql(sql), limit))
    return columns, cur.fetchall()


# ── What should work ────────────────────────────────────────────────────────


def test_plain_select(con):
    columns, rows = run(con, "SELECT winner_name FROM matches_main ORDER BY winner_name")
    assert columns == ["winner_name"]
    assert rows == [("Ada",), ("Bo",)]


def test_cte_and_aggregate(con):
    _, rows = run(con, "WITH t AS (SELECT count(*) n FROM matches_main) SELECT n FROM t")
    assert rows == [(2,)]


def test_trailing_semicolon_is_tolerated(con):
    _, rows = run(con, "SELECT 1 AS a;")
    assert rows == [(1,)]


def test_leading_comment_is_allowed(con):
    _, rows = run(con, "-- how many?\nSELECT count(*) FROM players")
    assert rows == [(1,)]


def test_wrap_applies_the_row_cap(con):
    _, rows = run(con, "SELECT winner_name FROM matches_main", limit=1)
    assert len(rows) == 1


# ── What must not work ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE players",
        "DELETE FROM players",
        "INSERT INTO players VALUES ('x')",
        "UPDATE players SET name = 'x'",
        "CREATE TABLE evil (a INT)",
        "ATTACH '/tmp/other.db' AS o",
        "COPY (SELECT 1) TO '/tmp/pwn.csv'",
        "INSTALL httpfs",
        "SET enable_external_access=true",
        "PRAGMA database_list",
    ],
)
def test_non_select_statements_are_refused(con, sql):
    with pytest.raises(HTTPException) as exc:
        run(con, sql)
    assert exc.value.status_code == 400


def test_chained_statement_cannot_smuggle_a_write(con):
    # The subquery wrap makes the semicolon a parse error, so this never runs.
    with pytest.raises(HTTPException) as exc:
        run(con, "SELECT 1; DROP TABLE players")
    assert exc.value.status_code == 400
    assert con.execute("SELECT count(*) FROM players").fetchone() == (1,)


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT * FROM read_csv_auto('/etc/hosts')",
        "SELECT * FROM read_json_auto('/etc/hosts')",
        "SELECT * FROM read_parquet('/etc/hosts')",
    ],
)
def test_filesystem_reads_are_blocked(con, sql):
    with pytest.raises(HTTPException) as exc:
        run(con, sql)
    assert exc.value.status_code == 400


def test_empty_sql_is_refused(con):
    for raw in ("", "   ", ";"):
        with pytest.raises(HTTPException) as exc:
            run(con, raw)
        assert exc.value.status_code == 400


def test_overlong_sql_is_refused(con):
    with pytest.raises(HTTPException) as exc:
        run(con, "SELECT 1 -- " + "x" * (q.MAX_SQL_LENGTH + 1))
    assert exc.value.status_code == 400


def test_configuration_is_locked(con):
    # Belt and braces: even if a future change let a SET through, the lock holds.
    with pytest.raises(duckdb.Error):
        con.execute("SET enable_external_access=true")


def test_exposed_relations_match_the_documented_set():
    assert q.EXPOSED_RELATIONS == ("matches_main", "player_match_view", "h2h_view", "players")
