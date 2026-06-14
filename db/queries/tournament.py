"""Tournament query builders."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _TOUR_LEVELS, _filter_extras, _where

def q_tournament_matches(
    con: duckdb.DuckDBPyConnection,
    tournament: str,
    year: Optional[int] = None,
    tour: Optional[str] = None,
) -> 'pd.DataFrame':
    conditions = ["tournament = $1"]
    params: list = [tournament]
    idx = 2
    if year:
        conditions.append(f"year = ${idx}"); params.append(year); idx += 1
    if tour:
        conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1

    sql = f"""
        SELECT unique_match_key, date, tournament, surface, level, level_name,
               round, score, time, winner_name, loser_name,
               winner_rank, loser_rank, winner_aces, loser_aces,
               winner_dfs, loser_dfs,
               winner_pts, loser_pts, winner_firsts, loser_firsts,
               winner_fwon, loser_fwon, winner_swon, loser_swon,
               winner_saved, loser_saved, winner_chances, loser_chances,
               is_upset, is_retirement, rank_diff, tour, year
        FROM matches_main
        {_where(conditions)}
        ORDER BY date, round
    """
    return con.execute(sql, params).df()


def q_tournament_years(
    con: duckdb.DuckDBPyConnection,
    tournament: str,
    tour: Optional[str] = None,
) -> list[int]:
    conditions = ["tournament = $1"]
    params: list = [tournament]
    if tour:
        conditions.append("tour = $2"); params.append(tour)
    sql = f"SELECT DISTINCT year FROM matches_main {_where(conditions)} ORDER BY year DESC"
    rows = con.execute(sql, params).fetchall()
    return [r[0] for r in rows if r[0] is not None]


# ---------------------------------------------------------------------------
# 4. Match search / filter query
# ---------------------------------------------------------------------------

def q_tournament_draw_strength(
    con: duckdb.DuckDBPyConnection,
    tournament: str,
    year: Optional[int] = None,
    tour: Optional[str] = None,
) -> 'pd.DataFrame':
    conditions = ["tournament = $1", "level_name != 'Tour Finals'"]
    params: list = [tournament]
    idx = 2
    if year:
        conditions.append(f"year = ${idx}"); params.append(year); idx += 1
    if tour:
        conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1

    sql = f"""
        SELECT player_name,
               ROUND(AVG(opponent_rank), 1) AS avg_opp_rank,
               COUNT(*) AS matches_played,
               MIN(opponent_rank) AS best_opp_rank,
               MAX(opponent_rank) AS worst_opp_rank
        FROM player_match_view
        {_where(conditions)}
          AND opponent_rank IS NOT NULL
        GROUP BY player_name
        HAVING COUNT(*) >= 2
        ORDER BY avg_opp_rank ASC
    """
    return con.execute(sql, params).df()


def q_recent_champions(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    limit: int = 20,
) -> 'pd.DataFrame':
    """Latest set of main-tour finals (however old) + latest week's Challenger finals."""
    tour_lvl = f"({_TOUR_LEVELS})"
    sql = f"""
        WITH latest_tour_week AS (
            SELECT MAX(date) AS md
            FROM matches_main
            WHERE round = 'F'
              AND level_name IN {tour_lvl}
              AND ($1 IS NULL OR tour = $1)
        ),
        tour_finals AS (
            SELECT tournament, year, MAX(date) AS max_date
            FROM matches_main, latest_tour_week
            WHERE round = 'F'
              AND level_name IN {tour_lvl}
              AND date >= latest_tour_week.md - INTERVAL '6' DAY
              AND ($1 IS NULL OR tour = $1)
            GROUP BY tournament, year
        ),
        latest_ch_week AS (
            SELECT MAX(date) AS md
            FROM matches_main
            WHERE round = 'F'
              AND level_name = 'Challenger'
              AND ($1 IS NULL OR tour = $1)
        ),
        ch_finals AS (
            SELECT tournament, year, MAX(date) AS max_date
            FROM matches_main, latest_ch_week
            WHERE round = 'F'
              AND level_name = 'Challenger'
              AND date >= latest_ch_week.md - INTERVAL '6' DAY
              AND ($1 IS NULL OR tour = $1)
            GROUP BY tournament, year
        ),
        all_finals AS (
            SELECT * FROM tour_finals
            UNION ALL
            SELECT * FROM ch_finals
        )
        SELECT m.tournament, m.year, m.winner_name, m.loser_name,
               m.score, m.surface, m.level, m.level_name, m.date
        FROM matches_main m
        JOIN all_finals sub ON m.tournament = sub.tournament
              AND m.year = sub.year
              AND m.date = sub.max_date
        WHERE m.round = 'F'
          AND ($1 IS NULL OR tour = $1)
        ORDER BY CASE m.level_name
                    WHEN 'Grand Slam'   THEN 1
                    WHEN 'Masters 1000' THEN 2
                    WHEN 'Tour Finals'  THEN 2
                    WHEN 'Olympics'     THEN 2
                    WHEN 'ATP 250/500'  THEN 3
                    WHEN 'WTA 500'      THEN 3
                    WHEN 'WTA 250'      THEN 4
                    WHEN 'WTA'          THEN 4
                    WHEN 'Challenger'   THEN 5
                    ELSE 6
                 END, m.date DESC
        LIMIT $2
    """
    return con.execute(sql, [tour, limit]).df()
