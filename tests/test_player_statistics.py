"""Filter scopes and missing-statistics regressions, using disposable data only."""
from pathlib import Path

import duckdb
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_db
from api.routers import compare, player
from db.queries.player import (
    q_player_matches, q_player_summary, q_player_serve_stats, q_player_return_stats,
    q_player_serve_percentiles, q_player_return_percentiles,
)


@pytest.fixture()
def con():
    connection = duckdb.connect(":memory:")
    connection.execute(Path("db/schema.sql").read_text())
    yield connection
    connection.close()


@pytest.fixture(params=["M", "F"])
def tour(request):
    return request.param


def insert_match(con, key, **overrides):
    row = {
        "unique_match_key": key, "date": "2024-01-01", "year": 2024,
        "tournament": "Test Open", "surface": "Hard", "level": "G", "level_name": "Grand Slam",
        "round": "F", "score": "6-4 6-4", "winner_name": "Player", "loser_name": "Opponent",
        "tour": "M", "winner_rank": 10, "loser_rank": 20,
        "is_walkover": False, "is_retirement": False, "is_complete": True,
        "winner_pts": 100, "winner_aces": 10, "winner_dfs": 2,
        "winner_firsts": 60, "winner_fwon": 40, "winner_swon": 20,
        "winner_saved": 3, "winner_chances": 5, "winner_tb_won": 1, "winner_tb_lost": 1,
        "loser_pts": 100, "loser_firsts": 50, "loser_fwon": 35, "loser_swon": 25,
        "loser_saved": 2, "loser_chances": 4,
    }
    row.update(overrides)
    con.execute(
        f"INSERT INTO matches_main ({', '.join(row)}) VALUES ({', '.join('?' for _ in row)})",
        list(row.values()),
    )


@pytest.fixture()
def history(con):
    for tour_code in ["M", "F"]:
        main_level = "ATP 250/500" if tour_code == "M" else "WTA 250"
        cases = [
            (2018, "Grass", "Grand Slam", "F", True),
            (2024, "Hard", "Grand Slam", "F", True),
            (2024, "Clay", "Grand Slam", "F", False),
            (2024, "Hard", main_level, "F", True),
            (2024, "Hard", "Challenger", "F", True),
            (2024, "Hard", "ITF", "F", True),
            (2024, "Hard", "Grand Slam", "Q1", True),
            (2025, "Hard", "Grand Slam", "F", True),
        ]
        for i, (year, surface, level, round_, won) in enumerate(cases):
            focal, opponent = ("winner", "loser") if won else ("loser", "winner")
            insert_match(con, f"{tour_code}-{i}", **{
                "tour": tour_code, "date": f"{year}-01-0{i + 1}", "year": year,
                "surface": surface, "level": "G" if level == "Grand Slam" else "A",
                "level_name": level, "round": round_,
                f"{focal}_name": "Player", f"{opponent}_name": "Opponent",
                f"{focal}_rank": (1 if tour_code == "M" else 2) if i == 0 else 10 + i,
                f"{focal}_pts": 100, f"{focal}_aces": i + 1,
                f"{focal}_firsts": 60, f"{focal}_fwon": 40 + i, f"{focal}_swon": 20 + i,
                f"{opponent}_pts": 100, f"{opponent}_firsts": 50,
                f"{opponent}_fwon": 35 + i, f"{opponent}_swon": 25 + i,
            })
        con.execute(
            "INSERT INTO players (player_id, tour, name, country, birthdate, hand, height) VALUES (?, ?, 'Player', ?, DATE '2000-01-01', 'R', 180)",
            [tour_code, tour_code, "USA" if tour_code == "M" else "GBR"],
        )
    return con


@pytest.fixture()
def client(con):
    app = FastAPI()
    app.include_router(player.router, prefix="/player")
    app.include_router(compare.router, prefix="/compare")
    app.dependency_overrides[get_db] = lambda: con
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize("filters,total,wins,titles", [
    ({}, 8, 7, 6),
    ({"level": "All"}, 8, 7, 6),
    ({"surface": "Hard"}, 6, 6, 5),
    ({"year_min": 2024, "year_max": 2024}, 6, 5, 4),
    ({"level": "All Tour"}, 5, 4, 4),
    ({"level": "All Dev"}, 3, 3, 2),
    ({"level": "Grand Slam", "surface": "Hard", "year_min": 2024, "year_max": 2024}, 2, 2, 1),
    ({"surface": "Grass", "year_min": 2024}, 0, 0, 0),
])
def test_summary_scopes_counts_and_titles_but_not_career_facts(history, tour, filters, total, wins, titles):
    summary = q_player_summary(history, "Player", tour=tour, **filters)
    matches = q_player_matches(history, "Player", tour=tour, **filters)
    assert summary["total"] == total == len(matches)
    assert summary["wins"] == wins
    assert summary["losses"] == total - wins
    assert sum(summary[k] for k in ["gs_titles", "tour_titles", "challenger_titles", "itf_titles"]) == titles
    assert summary["career_high_rank"] == (1 if tour == "M" else 2)
    assert summary["country"] == ("USA" if tour == "M" else "GBR")
    assert summary["birthdate"] == "2000-01-01"


def test_player_http_endpoints_share_selected_filters(history, client, tour):
    params = {"player": "Player", "tour": tour, "surface": "Hard", "level": "All Tour", "year_min": 2024, "year_max": 2024}
    responses = {name: client.get(f"/player/{name}", params=params) for name in ["summary", "matches", "serve-stats", "return-stats"]}
    assert all(response.status_code == 200 for response in responses.values())
    data = {name: response.json() for name, response in responses.items()}
    assert data["summary"]["total"] == data["matches"]["total"] == 2
    assert data["summary"]["gs_titles"] == data["summary"]["tour_titles"] == 1
    assert data["summary"]["challenger_titles"] == data["summary"]["itf_titles"] == 0
    assert data["serve-stats"]["matches_with_stats"] == data["return-stats"]["matches_with_stats"] == 2
    assert data["serve-stats"]["ace%"] == 3.0
    assert data["return-stats"]["1st_return_win%"] == 26.0
    assert data["return-stats"]["2nd_return_win%"] == 46.0


def test_common_opponents_http_respects_all_filters(con, client, tour):
    insert_match(con, "a", tour=tour, winner_name="A", loser_name="Shared")
    insert_match(con, "b", tour=tour, winner_name="B", loser_name="Shared")
    insert_match(con, "dev", tour=tour, winner_name="A", loser_name="Shared", level_name="ITF")
    insert_match(con, "clay", tour=tour, winner_name="A", loser_name="Shared", surface="Clay")
    insert_match(con, "old", tour=tour, winner_name="B", loser_name="Shared", year=2020)
    response = client.get("/compare/common-opponents", params={
        "player_a": "A", "player_b": "B", "tour": tour, "level": "All Tour",
        "surface": "Hard", "year_min": 2024, "year_max": 2024,
    })
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert summary["common_opponents"] == 1
    assert summary["a_total_wins"] == summary["b_total_wins"] == 1


def test_missing_serve_numerators_are_null_not_errors(con, tour):
    insert_match(con, "missing", tour=tour, winner_aces=None, winner_dfs=None, winner_fwon=None, winner_swon=None, winner_saved=None)
    stats = q_player_serve_stats(con, "Player", tour=tour)
    for key in ["ace%", "df%", "1st_win%", "2nd_win%", "bp_saved%"]:
        assert stats[key] is None
    assert stats["1st_in%"] == 60.0


def test_missing_return_numerators_are_null_not_perfect_rates(con, tour):
    insert_match(con, "missing", tour=tour, loser_fwon=None, loser_swon=None, loser_saved=None)
    stats = q_player_return_stats(con, "Player", tour=tour)
    assert stats["1st_return_win%"] is None
    assert stats["2nd_return_win%"] is None
    assert stats["bp_converted%"] is None


def test_each_serve_rate_uses_only_rows_with_its_inputs(con, tour):
    insert_match(con, "complete", tour=tour)
    expected = q_player_serve_stats(con, "Player", tour=tour)
    insert_match(con, "partial", tour=tour, winner_pts=900, winner_aces=None, winner_dfs=None,
                 winner_firsts=None, winner_fwon=None, winner_swon=None, winner_saved=None, winner_chances=50)
    actual = q_player_serve_stats(con, "Player", tour=tour)
    for key in ["ace%", "df%", "1st_in%", "1st_win%", "2nd_win%", "bp_saved%"]:
        assert actual[key] == expected[key]
    assert actual["matches_with_stats"] == 2


def test_each_return_rate_uses_only_rows_with_its_inputs(con, tour):
    insert_match(con, "complete", tour=tour)
    expected = q_player_return_stats(con, "Player", tour=tour)
    insert_match(con, "partial", tour=tour, loser_pts=900, loser_firsts=600, loser_fwon=None, loser_swon=None, loser_saved=None)
    actual = q_player_return_stats(con, "Player", tour=tour)
    for key in ["1st_return_win%", "2nd_return_win%", "bp_converted%"]:
        assert actual[key] == expected[key]


@pytest.mark.parametrize("lost", [False, True])
def test_return_stats_require_opponent_points_not_focal_points(con, tour, lost):
    focal, opponent = ("loser", "winner") if lost else ("winner", "loser")
    insert_match(con, "return-only", tour=tour, **{
        f"{focal}_name": "Player", f"{opponent}_name": "Opponent",
        f"{focal}_pts": None, f"{opponent}_pts": 100,
        f"{opponent}_firsts": 50, f"{opponent}_fwon": 35,
    })
    stats = q_player_return_stats(con, "Player", tour=tour)
    assert stats["matches_with_stats"] == 1
    assert stats["1st_return_win%"] == 30.0


def test_zero_counts_remain_real_rates_and_zero_denominators_are_unavailable(con, tour):
    insert_match(con, "zero", tour=tour, winner_aces=0, winner_dfs=0, winner_firsts=0,
                 winner_fwon=0, winner_swon=0, winner_saved=0, winner_chances=0,
                 loser_firsts=0, loser_fwon=0, loser_swon=0, loser_saved=0, loser_chances=0)
    serve = q_player_serve_stats(con, "Player", tour=tour)
    assert serve["ace%"] == serve["df%"] == serve["1st_in%"] == serve["2nd_win%"] == 0.0
    assert serve["1st_win%"] is None
    assert serve["bp_saved%"] is None
    ret = q_player_return_stats(con, "Player", tour=tour)
    assert ret["1st_return_win%"] is None
    assert ret["2nd_return_win%"] == 100.0
    assert ret["bp_converted%"] is None


def test_nonpositive_denominators_stay_unavailable(con, tour):
    insert_match(con, "bad-denominators", tour=tour, winner_firsts=200, winner_chances=-1,
                 loser_firsts=200, loser_chances=-1)
    serve = q_player_serve_stats(con, "Player", tour=tour)
    ret = q_player_return_stats(con, "Player", tour=tour)
    assert serve["2nd_win%"] is None
    assert serve["bp_saved%"] is None
    assert ret["2nd_return_win%"] is None
    assert ret["bp_converted%"] is None


def test_walkovers_do_not_contribute_to_player_rates(con, tour):
    insert_match(con, "played", tour=tour)
    expected_serve = q_player_serve_stats(con, "Player", tour=tour)
    expected_return = q_player_return_stats(con, "Player", tour=tour)
    insert_match(con, "walkover", tour=tour, score="W/O", is_walkover=True)
    assert q_player_serve_stats(con, "Player", tour=tour) == expected_serve
    assert q_player_return_stats(con, "Player", tour=tour) == expected_return


@pytest.mark.parametrize("kind", ["serve", "return"])
@pytest.mark.parametrize("rates,expected", [
    ([10, 40, None], [0, 100, None]),
    ([10, 40, 40, None], [0, 50, 50, None]),
    ([10, None], [0, None]),
    ([None, None], [None, None]),
])
def test_percentiles_exclude_missing_values_per_metric(con, tour, kind, rates, expected):
    query = q_player_serve_percentiles if kind == "serve" else q_player_return_percentiles
    key = "ace%" if kind == "serve" else "1st_return_win%"
    for i, rate in enumerate(rates):
        for j in range(20):
            values = {"winner_aces": rate} if kind == "serve" else {"loser_fwon": None if rate is None else 50 * (1 - rate / 100)}
            insert_match(con, f"{i}-{j}", tour=tour, winner_name=f"Player {i}", loser_name=f"Opponent {i}-{j}", **values)
    for i, percentile in enumerate(expected):
        result = query(con, f"Player {i}", tour=tour)
        assert result[key] == percentile
        assert result["tour_size"] == len(rates)
        # A missing value on one axis must not remove a valid value on another.
        other = "1st_in%" if kind == "serve" else "2nd_return_win%"
        assert result[other] == 0.0


@pytest.mark.parametrize("kind", ["serve", "return"])
def test_percentiles_use_the_same_partial_row_populations_as_rates(con, tour, kind):
    for i in range(20):
        for name, ace, fwon in [("High", 20, 20), ("Low", 10, 40)]:
            insert_match(con, f"{name}-{i}", tour=tour, winner_name=name, loser_name=f"Opponent {name}-{i}",
                         winner_aces=ace, loser_fwon=fwon)
    # This row has points but no input for the selected metric. It must not
    # depress High's rate or reverse the rank ordering relative to Low.
    insert_match(con, "partial", tour=tour, winner_name="High", winner_pts=100000,
                 winner_aces=None, loser_pts=100000, loser_firsts=90000, loser_fwon=None)
    query = q_player_serve_percentiles if kind == "serve" else q_player_return_percentiles
    metric = "ace%" if kind == "serve" else "1st_return_win%"
    assert query(con, "High", tour=tour)[metric] == 100.0
    assert query(con, "Low", tour=tour)[metric] == 0.0


@pytest.mark.parametrize("query", [q_player_serve_percentiles, q_player_return_percentiles])
def test_percentiles_keep_the_minimum_sample_and_tour_boundary(con, tour, query):
    for i in range(19):
        insert_match(con, str(i), tour=tour)
    assert query(con, "Player", tour=tour) == {}
    insert_match(con, "other-tour", tour="F" if tour == "M" else "M")
    assert query(con, "Player", tour=tour) == {}
    insert_match(con, "twentieth", tour=tour)
    assert query(con, "Player", tour=tour)["tour_size"] >= 1
