"""/api/player/splits: one call for every Player-page split, and "Open in Lab"
SQL that lists exactly the matches each row counts."""
from __future__ import annotations

from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.routers import query as q
from db.queries import q_player_splits, relational_lab_sql

HEADERS = {"X-CourtVision-Client": "dashboard", "Origin": "http://localhost:5173"}
FOCAL = "Rafa D'Angelo"  # the apostrophe exercises literal escaping

# (date, round, level, winner, loser, winner_rank, loser_rank, score)
MATCHES = [
    ("2024-01-10", "F", "G", FOCAL, "Lefty Low", 1, 8, "3-6 4-6 6-4 6-4 6-3"),
    ("2024-02-10", "SF", "A", FOCAL, "Righty Rich", 1, 40, "6-4 6-4"),
    ("2024-03-10", "QF", "A", "Lefty Low", FOCAL, 8, 1, "6-3 3-6 7-5"),
    ("2024-04-10", "R32", "A", FOCAL, "Young Gun", 1, 120, "7-6(4) 6-7(2) 6-1"),
    ("2024-05-10", "F", "M", "Righty Rich", FOCAL, 40, 1, "6-2 6-2"),
    ("2024-06-10", "R16", "A", FOCAL, "Countryman", 2, 30, "6-1 2-0 RET"),
]
PLAYERS = [
    (FOCAL, "ESP", "1990-01-01", "L"),
    ("Lefty Low", "FRA", "1985-01-01", "L"),
    ("Righty Rich", "USA", "1988-01-01", "R"),
    ("Young Gun", "ITA", "2004-01-01", "R"),
    ("Countryman", "ESP", "1992-01-01", "R"),
]


@pytest.fixture()
def db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "t.duckdb"
    con = duckdb.connect(str(path))
    for stmt in [s.strip() for s in Path("db/schema.sql").read_text().split(";") if s.strip()]:
        con.execute(stmt)
    for i, (d, rnd, lvl, w, lo, wr, lr, score) in enumerate(MATCHES):
        con.execute(
            """INSERT INTO matches_main (unique_match_key, date, tournament, level, level_name, round, score,
                   winner_name, loser_name, winner_rank, loser_rank, tour, year, is_walkover)
               VALUES (?, ?, 'Test Open', ?, 'X', ?, ?, ?, ?, ?, ?, 'M', 2024, false)""",
            [f"k{i}", d, lvl, rnd, score, w, lo, wr, lr],
        )
    for i, (name, country, born, hand) in enumerate(PLAYERS):
        con.execute(
            "INSERT INTO players (player_id, tour, name, country, birthdate, hand) VALUES (?, 'M', ?, ?, ?, ?)",
            [str(i), name, country, born, hand],
        )
    con.close()
    monkeypatch.setenv("TENNIS_DB", str(path))
    return path


def _rows(db: Path) -> dict[str, dict]:
    con = duckdb.connect(str(db), read_only=True)
    try:
        groups = q_player_splits(con, player=FOCAL, tour="M")
    finally:
        con.close()
    return {r["id"]: r for g in groups for r in g["rows"]}


def test_split_records(db: Path) -> None:
    rows = _rows(db)
    wl = {k: (r["summary"]["wins"], r["summary"]["losses"]) for k, r in rows.items()}
    assert wl["vs_left"] == (1, 1)
    assert wl["vs_right"] == (3, 1)
    assert wl["vs_top10"] == (1, 1)
    assert wl["vs_younger"] == (2, 0)          # Young Gun and Countryman
    assert wl["vs_compatriots"] == (1, 0)
    assert wl["lost_first"] == (1, 2)          # the retirement is excluded from situations
    assert wl["won_first"] == (2, 0)
    assert wl["trailed_0_2"] == (1, 0)
    assert wl["finals"] == (1, 1)
    assert wl["qf_or_later"] == (2, 2)
    assert rows["finals"]["params"] == {"round": "F"}


def test_lab_sql_lists_exactly_the_counted_matches(db: Path) -> None:
    rows = _rows(db)
    con = q.open_hardened()
    try:
        for rid, row in rows.items():
            cur, _ = q._execute(con, q._wrap(q._clean_sql(row["lab_sql"]), 1000))
            assert len(cur.fetchall()) == row["summary"]["total"], rid
    finally:
        con.close()


def test_lab_sql_inlines_filters_as_escaped_literals() -> None:
    sql = relational_lab_sql(player=FOCAL, tour="M", opp_rank_max=10, surface="Clay", year_min=2020)
    assert "'Rafa D''Angelo'" in sql
    assert "$" not in sql
    assert "'Clay'" in sql and "2020" in sql


def test_splits_endpoint(db: Path) -> None:
    client = TestClient(app)
    r = client.get("/api/player/splits", params={"player": FOCAL, "tour": "M", "surface": "Hard"}, headers=HEADERS)
    assert r.status_code == 200
    groups = r.json()["groups"]
    assert [g["id"] for g in groups] == ["opponent", "situation", "stage"]
    assert sum(len(g["rows"]) for g in groups) == 14
