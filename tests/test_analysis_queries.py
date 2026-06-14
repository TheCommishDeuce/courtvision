from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from db.queries import q_tour_level_season_leaders, q_youngest_stage_reached


@pytest.fixture()
def con() -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(":memory:")
    schema = Path("db/schema.sql").read_text()
    for stmt in [s.strip() for s in schema.split(";") if s.strip()]:
        conn.execute(stmt)

    conn.execute(
        """
        INSERT INTO players VALUES
            ('1', 'M', 'Young Slammer', 'YoungSlammer', 'ESP', DATE '2005-01-01', 10, 'R', 185, true),
            ('2', 'M', 'Older Slammer', 'OlderSlammer', 'USA', DATE '1995-01-01', 20, 'R', 188, true),
            ('3', 'F', 'Tour Winner', 'TourWinner', 'POL', DATE '2000-01-01', 1, 'R', 176, true),
            ('4', 'F', 'Final Queen', 'FinalQueen', 'USA', DATE '1999-01-01', 2, 'R', 175, true),
            ('5', 'F', 'ITF Grinder', 'ITFGrinder', 'NED', DATE '1998-01-01', 100, 'R', 170, true),
            ('6', 'F', 'Opponent A', 'OpponentA', 'CZE', DATE '1997-01-01', 50, 'R', 170, true),
            ('7', 'F', 'Opponent B', 'OpponentB', 'CAN', DATE '1997-01-01', 50, 'R', 170, true)
        """
    )

    _insert_match(conn, key="m1", dt="2024-06-05", tournament="Roland Garros", level_name="Grand Slam",
                  round_name="QF", winner="Young Slammer", loser="Older Slammer", tour="M")
    _insert_match(conn, key="m2", dt="2024-06-07", tournament="Roland Garros", level_name="Grand Slam",
                  round_name="SF", winner="Older Slammer", loser="Young Slammer", tour="M")
    _insert_match(conn, key="m3", dt="2020-01-20", tournament="Australian Open", level_name="Grand Slam",
                  round_name="QF", winner="Older Slammer", loser="Young Slammer", tour="M")

    # 2025 WTA tour-level wins/finals.
    _insert_match(conn, key="w1", dt="2025-01-01", tournament="United Cup City", level_name="Masters 1000",
                  round_name="R32", winner="Tour Winner", loser="Opponent A", tour="F")
    _insert_match(conn, key="w2", dt="2025-01-02", tournament="Doha", level_name="Masters 1000",
                  round_name="R16", winner="Tour Winner", loser="Opponent B", tour="F")
    _insert_match(conn, key="w3", dt="2025-01-03", tournament="Doha", level_name="Masters 1000",
                  round_name="F", winner="Final Queen", loser="Tour Winner", tour="F")
    _insert_match(conn, key="w4", dt="2025-02-01", tournament="Berlin", level_name="WTA 500",
                  round_name="F", winner="Final Queen", loser="Opponent A", tour="F")
    _insert_match(conn, key="w5", dt="2025-03-01", tournament="Hobart", level_name="WTA 250",
                  round_name="F", winner="Opponent B", loser="Final Queen", tour="F")
    _insert_match(conn, key="w6", dt="2025-04-01", tournament="W75 Test", level_name="ITF",
                  round_name="F", winner="ITF Grinder", loser="Opponent A", tour="F")
    _insert_match(conn, key="w7", dt="2025-05-01", tournament="Rome", level_name="Masters 1000",
                  round_name="Q1", winner="ITF Grinder", loser="Opponent B", tour="F")

    try:
        yield conn
    finally:
        conn.close()


def _insert_match(
    con: duckdb.DuckDBPyConnection,
    *,
    key: str,
    dt: str,
    tournament: str,
    level_name: str,
    round_name: str,
    winner: str,
    loser: str,
    tour: str,
) -> None:
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
            ?, CAST(? AS DATE), ?, 'Hard', 'X', ?, ?, '6-4 6-4', 90, ?, ?, 10, 20,
            5, 2, 1, 2, 60, 55, 38, 35, 28, 20, 15, 13,
            12, 8, 3, 2, 5, 6, 0, 0, 0, 0,
            ?, CAST(substr(?, 1, 4) AS INTEGER), 2, false, false, true, false, false, 10
        )
        """,
        [key, dt, tournament, level_name, round_name, winner, loser, tour, dt],
    )


def test_youngest_stage_reached_returns_youngest_grand_slam_qf(con: duckdb.DuckDBPyConnection) -> None:
    df = q_youngest_stage_reached(
        con,
        stage="QF",
        tour="M",
        level="Grand Slam",
        year_min=1990,
        limit=5,
    )

    assert df.iloc[0]["player_name"] == "Young Slammer"
    assert df.iloc[0]["tournament"] == "Australian Open"
    assert df.iloc[0]["deepest_round"] == "QF"
    assert df.iloc[0]["age_years"] < 20


def test_tour_level_season_leaders_uses_all_tour_and_excludes_itf_and_qualifying(con: duckdb.DuckDBPyConnection) -> None:
    data = q_tour_level_season_leaders(con, tour="F", year=2025, limit=5)
    wins = data["wins"].set_index("player_name")
    finals = data["finals"].set_index("player_name")

    assert data["filters"]["level"] == "All Tour"
    assert wins.loc["Tour Winner"]["wins"] == 2
    assert "ITF Grinder" not in wins.index
    assert finals.loc["Final Queen"]["finals"] == 3
    assert finals.loc["Final Queen"]["titles"] == 2

