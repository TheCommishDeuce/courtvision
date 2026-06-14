from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from db.queries import (
    q_country_leaders,
    q_match_extremes,
    q_nationality_stage,
    q_relational_match_search,
    q_relational_summary,
)
from db.queries._helpers import _normalize_country


@pytest.fixture()
def con() -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(":memory:")
    schema = Path("db/schema.sql").read_text()
    for stmt in [s.strip() for s in schema.split(";") if s.strip()]:
        conn.execute(stmt)

    conn.execute(
        """
        INSERT INTO players VALUES
            ('1', 'M', 'Lefty Star',  'LeftyStar',  'ESP', DATE '1990-01-01', 5,  'L', 188, true),
            ('2', 'M', 'Young Lefty', 'YoungLefty', 'ESP', DATE '2000-01-01', 30, 'L', 185, true),
            ('3', 'M', 'Old Righty',  'OldRighty',  'USA', DATE '1985-01-01', 12, 'R', 190, true)
        """
    )

    # m1: Lefty Star beats Young Lefty (compatriot + younger + lefty opponent)
    _insert(conn, key="m1", dt="2020-06-01", tournament="Roland Garros", level_name="Grand Slam",
            round_name="F", winner="Lefty Star", loser="Young Lefty", tour="M", time=150, w_aces=10, l_aces=4)
    # m2: Old Righty beats Lefty Star (foreign + older + righty opponent)
    _insert(conn, key="m2", dt="2021-07-01", tournament="Wimbledon", level_name="Grand Slam",
            round_name="SF", winner="Old Righty", loser="Lefty Star", tour="M", time=200, w_aces=25, l_aces=12)
    try:
        yield conn
    finally:
        conn.close()


def _insert(con, *, key, dt, tournament, level_name, round_name, winner, loser, tour,
            time=120, w_aces=5, l_aces=3) -> None:
    con.execute(
        """
        INSERT INTO matches_main (
            unique_match_key, date, tournament, surface, level, level_name,
            round, score, time, winner_name, loser_name, winner_rank, loser_rank,
            winner_aces, loser_aces, winner_dfs, loser_dfs, winner_pts, loser_pts,
            winner_firsts, loser_firsts, winner_fwon, loser_fwon, winner_swon, loser_swon,
            winner_games, loser_games, winner_saved, loser_saved, winner_chances, loser_chances,
            winner_tb_won, winner_tb_lost, loser_tb_won, loser_tb_lost,
            tour, year, num_sets, is_retirement, is_walkover, is_complete, had_tiebreak, is_upset, rank_diff
        )
        VALUES (
            ?, CAST(? AS DATE), ?, 'Clay', 'G', ?, ?, '6-4 6-4', ?, ?, ?, 5, 30,
            ?, ?, 1, 2, 60, 55, 38, 35, 28, 20, 15, 13,
            12, 8, 3, 2, 5, 6, 0, 0, 0, 0,
            ?, CAST(substr(?, 1, 4) AS INTEGER), 3, false, false, true, false, false, 25
        )
        """,
        [key, dt, tournament, level_name, round_name, time, winner, loser, w_aces, l_aces, tour, dt],
    )


# --- relational --------------------------------------------------------------

def test_relational_vs_lefties(con) -> None:
    df = q_relational_match_search(con, player="Lefty Star", opp_hand="L", tour="M")
    assert list(df["opponent_name"]) == ["Young Lefty"]
    assert df.iloc[0]["opp_hand"] == "L"


def test_relational_compatriots(con) -> None:
    df = q_relational_match_search(con, player="Lefty Star", relation="compatriot", tour="M")
    assert set(df["opponent_name"]) == {"Young Lefty"}  # ESP only


def test_relational_foreign(con) -> None:
    df = q_relational_match_search(con, player="Lefty Star", relation="foreign", tour="M")
    assert set(df["opponent_name"]) == {"Old Righty"}  # USA only


def test_relational_younger_and_older(con) -> None:
    younger = q_relational_match_search(con, player="Lefty Star", age_relation="younger", tour="M")
    older = q_relational_match_search(con, player="Lefty Star", age_relation="older", tour="M")
    assert set(younger["opponent_name"]) == {"Young Lefty"}
    assert set(older["opponent_name"]) == {"Old Righty"}


def test_relational_requires_player_for_relations(con) -> None:
    with pytest.raises(ValueError):
        q_relational_match_search(con, age_relation="younger")
    with pytest.raises(ValueError):
        q_relational_match_search(con, relation="compatriot")


# --- superlatives ------------------------------------------------------------

def test_match_extremes_longest(con) -> None:
    df = q_match_extremes(con, metric="duration", order="desc", limit=5)
    assert df.iloc[0]["metric_value"] == 200  # m2 is longest
    assert df.iloc[0]["tournament"] == "Wimbledon"


def test_match_extremes_shortest(con) -> None:
    df = q_match_extremes(con, metric="duration", order="asc", limit=5)
    assert df.iloc[0]["metric_value"] == 150


def test_match_extremes_aces_player(con) -> None:
    df = q_match_extremes(con, metric="aces_player", limit=5)
    assert df.iloc[0]["metric_value"] == 25  # Old Righty's 25 aces in m2


# --- nationality -------------------------------------------------------------

def test_nationality_stage_spanish_gs_final(con) -> None:
    # Both Spaniards reached the m1 final (Lefty Star won it, Young Lefty lost it).
    df = q_nationality_stage(con, country="Spain", tour="M", level="Grand Slam", stage="F", order="last")
    assert set(df["player_name"]) == {"Lefty Star", "Young Lefty"}
    champ = df.set_index("player_name").loc["Lefty Star"]
    assert champ["won_title"] == 1
    runner_up = df.set_index("player_name").loc["Young Lefty"]
    assert runner_up["won_title"] == 0


def test_country_leaders_titles(con) -> None:
    df = q_country_leaders(con, metric="titles", tour="M", level="Grand Slam")
    by_country = df.set_index("country")
    assert by_country.loc["ESP"]["titles"] == 1  # Lefty Star won m1
    assert "USA" not in by_country.index or by_country.loc["USA"]["titles"] == 0


def test_normalize_country() -> None:
    assert _normalize_country("Russia") == "RUS"
    assert _normalize_country("russian") == "RUS"
    assert _normalize_country("esp") == "ESP"
    assert _normalize_country(None) is None


# --- score "situation" filters -----------------------------------------------

def _insert_scored(con, key, dt, winner, loser, score, sets) -> None:
    con.execute(
        """
        INSERT INTO matches_main (
            unique_match_key, date, tournament, surface, level, level_name,
            round, score, time, winner_name, loser_name, winner_rank, loser_rank,
            tour, year, num_sets, is_retirement, is_walkover, is_complete, had_tiebreak, is_upset, rank_diff
        ) VALUES (?, CAST(? AS DATE), 'Test Open', 'Hard', 'G', 'Grand Slam',
            'R32', ?, 180, ?, ?, 5, 30, 'M', CAST(substr(?, 1, 4) AS INTEGER),
            ?, false, false, true, false, false, 25)
        """,
        [key, dt, score, winner, loser, dt, sets],
    )


@pytest.fixture()
def scon() -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(":memory:")
    schema = Path("db/schema.sql").read_text()
    for stmt in [s.strip() for s in schema.split(";") if s.strip()]:
        conn.execute(stmt)
    conn.execute(
        "INSERT INTO players VALUES ('1','M','Hero','Hero','ESP',DATE '1990-01-01',5,'R',188,true)"
    )
    # Hero wins from 0-2 down (5-setter); won sets 3,4,5 -> lost first two.
    _insert_scored(conn, "c1", "2021-06-01", "Hero", "Foe A", "4-6 4-6 6-3 6-2 6-3", 5)
    # Hero loses after leading 2-0 (blew a 2-0 lead) -> Hero is the loser, score is Foe's view.
    _insert_scored(conn, "c2", "2021-07-01", "Foe B", "Hero", "6-7 6-7 6-3 6-4 6-4", 5)
    # Hero wins a straightforward best-of-3, won first set.
    _insert_scored(conn, "c3", "2021-08-01", "Hero", "Foe C", "6-4 6-4", 2)
    try:
        yield conn
    finally:
        conn.close()


def test_situation_won_lost_first(scon) -> None:
    # c1: Hero lost set 1 (4-6). c2 score is Foe B's view ("6-7" => Hero won set 1). c3: Hero won set 1.
    won = q_relational_match_search(scon, player="Hero", tour="M", situation="won_first")
    lost = q_relational_match_search(scon, player="Hero", tour="M", situation="lost_first")
    assert set(won["opponent_name"]) == {"Foe B", "Foe C"}
    assert set(lost["opponent_name"]) == {"Foe A"}


def test_situation_led_and_trailed_bo5(scon) -> None:
    led_20 = q_relational_match_search(scon, player="Hero", tour="M", situation="led_2_0")
    trailed_02 = q_relational_match_search(scon, player="Hero", tour="M", situation="trailed_0_2")
    # Only c2 (a 5-setter) counts; c3 finished 2-0 in two sets (a bo3 straights win) and is excluded.
    assert set(led_20["opponent_name"]) == {"Foe B"}
    assert set(trailed_02["opponent_name"]) == {"Foe A"}  # Hero trailed 0-2 then won
    # The win/loss summary captures the comeback (c1 win) and the collapse (c2 loss):
    assert q_relational_summary(scon, player="Hero", tour="M", situation="trailed_0_2")["wins"] == 1
    assert q_relational_summary(scon, player="Hero", tour="M", situation="led_2_0")["losses"] == 1


def test_situation_deciding_set(scon) -> None:
    dec = q_relational_match_search(scon, player="Hero", tour="M", situation="deciding_set")
    assert set(dec["opponent_name"]) == {"Foe A", "Foe B"}  # both 5-setters; c3 was 2-0
