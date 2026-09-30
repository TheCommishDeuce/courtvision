"""Tournament recap: lists describe the main draw by default (B4 in
docs/design-handoff/BUILD.md); the draw itself keeps every round."""
from __future__ import annotations

from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from api.main import app

HEADERS = {"X-CourtVision-Client": "dashboard", "Origin": "http://localhost:5173"}

# (round, winner, winner_rank, loser, loser_rank, time, winner_aces, winner_pts)
ROWS = [
    ("Q1", "Qualy Hero", 900, "Seed Qualy", 150, 400, 60, 90),
    ("R32", "Main Man", 5, "Other Guy", 40, 120, 10, 80),
    ("R16", "Main Man", 5, "Dark Horse", 300, 150, 12, 85),
    ("R16", "Dark Horse", 300, "Top Seed", 2, 180, 20, 95),
    ("F", "Main Man", 5, "Dark Horse", 300, 200, 15, 100),
]


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db = tmp_path / "t.duckdb"
    con = duckdb.connect(str(db))
    for stmt in [s.strip() for s in Path("db/schema.sql").read_text().split(";") if s.strip()]:
        con.execute(stmt)
    for i, (rnd, w, wr, lo, lr, time, aces, pts) in enumerate(ROWS):
        con.execute(
            """INSERT INTO matches_main (unique_match_key, date, tournament, surface, level, level_name, round, score,
                   time, winner_name, loser_name, winner_rank, loser_rank, winner_aces, loser_aces, winner_pts, loser_pts,
                   winner_firsts, loser_firsts, winner_fwon, loser_fwon, winner_swon, loser_swon,
                   tour, year, is_walkover, is_upset, rank_diff)
               VALUES (?, DATE '2025-06-30', 'Test Open', 'Grass', 'A', 'ATP 250/500', ?, '6-4 6-4', ?, ?, ?, ?, ?,
                       ?, 1, ?, 80, ?, 50, ?, 30, ?, 15, 'M', 2025, false, ?, ?)""",
            [f"k{i}", rnd, time, w, lo, wr, lr, aces, pts, int(pts * 0.6), int(pts * 0.45), int(pts * 0.2),
             wr > lr, abs(wr - lr)],
        )
    con.close()
    monkeypatch.setenv("TENNIS_DB", str(db))
    return TestClient(app)


def _recap(client: TestClient, **params) -> dict:
    r = client.get("/api/tournament/recap", params={"tournament": "Test Open", "year": 2025, "tour": "M", **params}, headers=HEADERS)
    assert r.status_code == 200, r.text
    return r.json()


def test_lists_default_to_the_main_draw(client: TestClient) -> None:
    r = _recap(client)
    assert r["meta"]["main_draw_matches"] == 4 and r["meta"]["qualifying_matches"] == 1
    assert [u["winner_name"] for u in r["biggest_upsets"]] == ["Dark Horse"]
    assert r["longest_matches"][0]["round"] == "F"
    assert "Qualy Hero" not in [x["player"] for x in r["stats"]["aces"]]
    # The draw keeps qualifying, and every match carries its date.
    rounds = [g["round"] for g in r["matches_by_round"]]
    assert "Q1" in rounds
    assert all(m["date"] for g in r["matches_by_round"] for m in g["matches"])


def test_qualifying_can_be_included(client: TestClient) -> None:
    r = _recap(client, main_draw_only=False)
    assert r["biggest_upsets"][0]["winner_name"] == "Qualy Hero"
    assert r["longest_matches"][0]["round"] == "Q1"
    assert r["stats"]["aces"][0]["player"] == "Qualy Hero"


def test_rate_leaders_need_two_matches(client: TestClient) -> None:
    players = {x["player"] for x in _recap(client)["stats"]["first_serve_won_pct"]}
    assert players == {"Main Man", "Dark Horse"}


def test_draw_strength_counts_the_main_draw(client: TestClient) -> None:
    r = client.get("/api/tournament/draw-strength", params={"tournament": "Test Open", "year": 2025, "tour": "M"}, headers=HEADERS)
    rows = {x["player_name"]: x for x in r.json()}
    assert set(rows) == {"Main Man", "Dark Horse"}
    assert rows["Main Man"]["matches_played"] == 3
