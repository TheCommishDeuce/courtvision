from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from db.queries import (
    q_all_player_names,
    q_common_opponents,
    q_h2h,
    q_leaders_wins,
    q_match_search,
    q_player_matches,
    q_tournament_years,
)


@pytest.fixture()
def con() -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(":memory:")
    schema = Path("db/schema.sql").read_text()
    for stmt in [s.strip() for s in schema.split(";") if s.strip()]:
        conn.execute(stmt)

    conn.execute(
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
        VALUES
            ('m1', DATE '2024-01-07', 'Adelaide', 'Hard', 'A', 'ATP 250/500',
             'F', '6-4 6-4', 95, 'Alice Ace', 'Bob Base', 5, 20,
             8, 3, 2, 4, 62, 58, 40, 34, 30, 20, 18, 16,
             12, 8, 3, 2, 5, 6, 0, 0, 0, 0,
             'M', 2024, 2, false, false, true, false, false, 15),
            ('m2', DATE '2024-01-06', 'Adelaide', 'Hard', 'A', 'ATP 250/500',
             'SF', '7-6(4) 6-4', 110, 'Bob Base', 'Cara Court', 20, 45,
             6, 2, 3, 3, 70, 68, 42, 39, 31, 25, 17, 15,
             13, 10, 4, 3, 6, 7, 1, 0, 0, 1,
             'M', 2024, 2, false, false, true, true, false, 25),
            ('m3', DATE '2025-02-01', 'Dallas', 'Hard', 'A', 'ATP 250/500',
             'F', '6-3 6-3', 88, 'Alice Ace', 'Cara Court', 4, 40,
             10, 1, 1, 2, 60, 52, 38, 30, 32, 18, 16, 12,
             12, 6, 2, 1, 4, 5, 0, 0, 0, 0,
             'M', 2025, 2, false, false, true, false, false, 36)
        """
    )
    conn.execute(
        """
        INSERT INTO players VALUES
            ('1', 'M', 'Alice Ace', 'AliceAce', 'USA', DATE '1998-01-01', 4, 'R', 175, true),
            ('2', 'M', 'Bob Base', 'BobBase', 'GBR', DATE '1997-01-01', 20, 'L', 180, true),
            ('3', 'M', 'Cara Court', 'CaraCourt', 'CAN', DATE '1999-01-01', 40, 'R', 170, true)
        """
    )
    try:
        yield conn
    finally:
        conn.close()


def test_meta_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    assert q_all_player_names(con, tour="M") == ["Alice Ace", "Bob Base", "Cara Court"]


def test_h2h_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    assert len(q_h2h(con, "Alice Ace", "Bob Base", tour="M")) == 1


def test_player_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    df = q_player_matches(con, "Alice Ace", tour="M")
    assert len(df) == 2


def test_tournament_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    assert q_tournament_years(con, "Adelaide", tour="M") == [2024]


def test_search_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    df = q_match_search(con, winner="Alice", tour="M", limit=10)
    assert len(df) == 2


def test_leaders_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    df = q_leaders_wins(con, tour="M", min_matches=1)
    assert set(df["player_name"]) == {"Alice Ace", "Bob Base", "Cara Court"}


def test_compare_query_module_smoke(con: duckdb.DuckDBPyConnection) -> None:
    data = q_common_opponents(con, "Alice Ace", "Bob Base", tour="M")
    assert data["summary"]["common_opponents"] == 1
    assert data["opponents"][0]["opponent_name"] == "Cara Court"
