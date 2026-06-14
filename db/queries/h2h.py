"""Head-to-head query builders."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _level_condition, _where

def q_h2h(
    con: duckdb.DuckDBPyConnection,
    player_a: str,
    player_b: str,
    surface: Optional[str] = None,
    level: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    tour: Optional[str] = None,
) -> 'pd.DataFrame':
    conditions = [
        "((winner_name = $1 AND loser_name = $2) OR (winner_name = $2 AND loser_name = $1))",
        "is_walkover = false",
    ]
    params: list = [player_a, player_b]
    idx = 3
    if tour:
        conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if surface:
        conditions.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if level:
        idx = _level_condition(level, conditions, params, idx)
    if year_min:
        conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1

    sql = f"""
        SELECT winner_name, loser_name, date, tournament, surface, level,
               level_name, round, score, time, tour, year,
               winner_rank, loser_rank, is_upset, is_retirement,
               winner_aces, winner_dfs, winner_pts, winner_firsts, winner_fwon, winner_swon,
               winner_chances, winner_saved,
               loser_aces, loser_dfs, loser_pts, loser_firsts, loser_fwon, loser_swon,
               loser_chances, loser_saved
        FROM matches_main
        {_where(conditions)}
        ORDER BY date DESC
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 2. Player profile query
# ---------------------------------------------------------------------------
