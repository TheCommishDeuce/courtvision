"""Global search and slug resolution (api/directory.py, /api/directory/*)."""
from __future__ import annotations

import json
import os
from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from api import directory
from api.directory import slugify
from api.main import app

HEADERS = {"X-CourtVision-Client": "dashboard", "Origin": "http://localhost:5173"}
VECTORS = json.loads(Path("tests/fixtures/slug_vectors.json").read_text())["vectors"]

# (date, tournament, level, level_name, round, winner, winner_rank, loser, loser_rank, tour)
MATCHES = [
    ("2025-06-30", "Wimbledon", "G", "Grand Slam", "F", "Jannik Sinner", 1, "Carlos Alcaraz", 2, "M"),
    ("2025-05-26", "Roland Garros", "G", "Grand Slam", "F", "Carlos Alcaraz", 2, "Jannik Sinner", 1, "M"),
    ("2024-06-10", "'s-Hertogenbosch", "A", "ATP 250/500", "F", "Martin Sinner", 42, "Jan Jones", 300, "M"),
    ("2025-06-30", "Wimbledon", "G", "Grand Slam", "F", "Iga Swiatek", 4, "Amanda Anisimova", 12, "F"),
    ("2025-03-01", "Indian Wells", "PM", "Masters 1000", "SF", "Aryna Sabalenka", 1, "Iga Swiatek", 2, "F"),
    ("2023-02-01", "Wimbledon Plate", "A", "ATP 250/500", "F", "Jan Jones", None, "Jannik Minor", None, "M"),
    # One name on both tours shares a slug.
    ("2020-01-01", "Adelaide", "A", "ATP 250/500", "R32", "Alex Smith", 500, "Jan Jones", 300, "M"),
    ("2020-01-01", "Adelaide", "I", "WTA 250", "R32", "Alex Smith", 700, "Iga Swiatek", 50, "F"),
]


def _make_db(path: Path) -> None:
    con = duckdb.connect(str(path))
    for stmt in [s.strip() for s in Path("db/schema.sql").read_text().split(";") if s.strip()]:
        con.execute(stmt)
    for i, (d, t, lvl, lname, rnd, w, wr, lo, lr, tour) in enumerate(MATCHES):
        con.execute(
            """INSERT INTO matches_main (unique_match_key, date, tournament, surface, level, level_name, round,
                   score, winner_name, loser_name, winner_rank, loser_rank, tour, year, is_walkover)
               VALUES (?, ?, ?, 'Grass', ?, ?, ?, '6-4 6-4', ?, ?, ?, ?, ?, ?, false)""",
            [f"k{i}", d, t, lvl, lname, rnd, w, lo, wr, lr, tour, int(d[:4])],
        )
    con.execute("INSERT INTO players (player_id, tour, name, country) VALUES ('1', 'M', 'Jannik Sinner', 'ITA')")
    con.close()


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db = tmp_path / "tennis.duckdb"
    _make_db(db)
    monkeypatch.setenv("TENNIS_DB", str(db))
    monkeypatch.setattr(directory, "_cached", None)
    return TestClient(app)


def _suggest(client: TestClient, **params) -> dict:
    r = client.get("/api/directory/suggest", params=params, headers=HEADERS)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.parametrize("name,slug", VECTORS)
def test_slugify_matches_shared_vectors(name: str, slug: str) -> None:
    assert slugify(name) == slug


def test_players_rank_by_career_high_not_alphabetically(client: TestClient) -> None:
    body = _suggest(client, q="sinn")
    assert [p["name"] for p in body["players"]] == ["Jannik Sinner", "Martin Sinner"]
    top = body["players"][0]
    assert top == {
        "name": "Jannik Sinner", "slug": "jannik-sinner", "tour": "M", "country": "ITA",
        "first_year": 2025, "last_year": 2025, "career_high": 1, "matches": 2,
    }


def test_every_token_must_prefix_a_distinct_word(client: TestClient) -> None:
    assert [p["name"] for p in _suggest(client, q="jan sin")["players"]] == ["Jannik Sinner"]
    assert _suggest(client, q="sinner sinner")["players"] == []


def test_two_names_become_a_matchup_on_their_tour(client: TestClient) -> None:
    body = _suggest(client, q="sinner alcaraz")
    assert body["matchup"]["tour"] == "M"
    assert (body["matchup"]["a"]["name"], body["matchup"]["b"]["name"]) == ("Jannik Sinner", "Carlos Alcaraz")
    explicit = _suggest(client, q="Sabalenka vs Swiatek")["matchup"]
    assert (explicit["a"]["name"], explicit["b"]["name"], explicit["tour"]) == ("Aryna Sabalenka", "Iga Swiatek", "F")


def test_a_full_player_name_is_not_split_into_a_matchup(client: TestClient) -> None:
    body = _suggest(client, q="jannik sinner")
    assert body["matchup"] is None
    assert [p["name"] for p in body["players"]] == ["Jannik Sinner"]


def test_no_matchup_across_tours(client: TestClient) -> None:
    assert _suggest(client, q="sinner vs swiatek")["matchup"] is None


def test_name_and_year_offer_the_tournament_year(client: TestClient) -> None:
    body = _suggest(client, q="wimbledon 2025")
    assert [(t["name"], t["year"], t["tour"]) for t in body["tournament_years"]] == [
        ("Wimbledon", 2025, "M"), ("Wimbledon", 2025, "F"),
    ]
    assert _suggest(client, q="wimbledon 1990")["tournament_years"] == []


def test_tournaments_rank_by_level(client: TestClient) -> None:
    names = [t["name"] for t in _suggest(client, q="wimb", tour="M")["tournaments"]]
    assert names == ["Wimbledon", "Wimbledon Plate"]


def test_pair_picker_filters(client: TestClient) -> None:
    body = _suggest(client, q="s", kind="players", tour="M", exclude="Jannik Sinner")
    assert "Jannik Sinner" not in [p["name"] for p in body["players"]]
    assert all(p["tour"] == "M" for p in body["players"])
    assert body["tournaments"] == [] and body["matchup"] is None


def test_resolve_player_and_shared_slug(client: TestClient) -> None:
    r = client.get("/api/directory/players/jannik-sinner", headers=HEADERS)
    assert [p["name"] for p in r.json()["players"]] == ["Jannik Sinner"]

    both = client.get("/api/directory/players/alex-smith", headers=HEADERS).json()["players"]
    assert [p["tour"] for p in both] == ["M", "F"]  # more prominent first
    wta = client.get("/api/directory/players/alex-smith", params={"tour": "F"}, headers=HEADERS).json()
    assert [p["tour"] for p in wta["players"]] == ["F"]

    assert client.get("/api/directory/players/nobody", headers=HEADERS).status_code == 404


def test_resolve_tournament_returns_years(client: TestClient) -> None:
    r = client.get("/api/directory/tournaments/s-hertogenbosch", headers=HEADERS)
    assert r.json()["tournaments"] == [{
        "name": "'s-Hertogenbosch", "slug": "s-hertogenbosch", "tour": "M", "level_name": "ATP 250/500",
        "surface": "Grass", "first_year": 2024, "last_year": 2024, "matches": 1, "years": [2024],
    }]
    assert client.get("/api/directory/tournaments/nowhere", headers=HEADERS).status_code == 404


def test_directory_rebuilds_when_the_database_file_changes(client: TestClient) -> None:
    assert _suggest(client, q="newcomer")["players"] == []
    con = duckdb.connect(os.environ["TENNIS_DB"])
    con.execute(
        """INSERT INTO matches_main (unique_match_key, date, tournament, level, level_name, round, score,
               winner_name, loser_name, tour, year, is_walkover)
           VALUES ('new', DATE '2026-01-01', 'Brisbane', 'A', 'ATP 250/500', 'R32', '6-0 6-0',
                   'Nina Newcomer', 'Jan Jones', 'M', 2026, false)"""
    )
    con.close()
    assert [p["name"] for p in _suggest(client, q="newcomer")["players"]] == ["Nina Newcomer"]


def test_directory_routes_are_gated(client: TestClient) -> None:
    assert client.get("/api/directory/suggest", params={"q": "sinner"}).status_code == 403
