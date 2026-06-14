"""Match superlatives / records.

Ranks individual matches by a chosen metric (duration, aces, games, sets,
rank gap) under tour/level/surface/year/round filters. Answers questions like
"the longest Masters 1000 match in 2024" or "the most aces in a match".
"""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _filter_extras, _where

# metric -> (value expression, extra WHERE condition required for the metric)
_METRICS: dict[str, tuple[str, Optional[str]]] = {
    "duration":   ("time", "time IS NOT NULL"),
    "aces_match": ("(COALESCE(winner_aces, 0) + COALESCE(loser_aces, 0))",
                   "winner_aces IS NOT NULL AND loser_aces IS NOT NULL"),
    "aces_player": ("GREATEST(COALESCE(winner_aces, 0), COALESCE(loser_aces, 0))",
                    "winner_aces IS NOT NULL AND loser_aces IS NOT NULL"),
    "games":      ("(COALESCE(winner_games, 0) + COALESCE(loser_games, 0))",
                   "winner_games IS NOT NULL AND loser_games IS NOT NULL"),
    "sets":       ("num_sets", "num_sets IS NOT NULL"),
    "rank_upset": ("rank_diff", "is_upset = true AND rank_diff IS NOT NULL"),
}


def q_match_extremes(
    con: duckdb.DuckDBPyConnection,
    *,
    metric: str = "duration",
    order: str = "desc",
    tour: Optional[str] = None,
    level: Optional[str] = None,
    surface: Optional[str] = None,
    round_: Optional[str] = None,
    tournament: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    completed_only: bool = True,
    limit: int = 20,
) -> "pd.DataFrame":
    """Return matches ranked by a superlative metric."""
    metric = metric.lower()
    if metric not in _METRICS:
        raise ValueError(f"Unsupported metric: {metric}. Choose from {sorted(_METRICS)}.")
    direction = "ASC" if order.lower() == "asc" else "DESC"

    value_expr, metric_cond = _METRICS[metric]

    conditions: list[str] = []
    if completed_only:
        conditions.append("is_complete = true")
    if metric_cond:
        conditions.append(metric_cond)
    if round_:
        conditions.append("round = $r")  # placeholder swapped below
    if tournament:
        conditions.append("tournament ILIKE $t")  # placeholder swapped below

    # _filter_extras builds tour/surface/level/year with positional params.
    extra, params = _filter_extras(tour, surface, year_min, year_max, level, start_idx=1)
    # Splice round + tournament + limit as positional params after the _filter_extras ones.
    next_idx = len(params) + 1
    if round_:
        conditions = [c.replace("$r", f"${next_idx}") for c in conditions]
        params.append(round_)
        next_idx += 1
    if tournament:
        conditions = [c.replace("$t", f"${next_idx}") for c in conditions]
        params.append(f"%{tournament}%")
        next_idx += 1
    params.append(int(limit))
    limit_idx = next_idx

    where = _where(conditions)
    where = f"{where} {extra}" if where else (f"WHERE 1=1 {extra}" if extra else "")

    sql = f"""
        SELECT
            {value_expr} AS metric_value,
            date, tournament, level_name, round, surface, score, time,
            winner_name, winner_rank, loser_name, loser_rank,
            num_sets, is_upset, rank_diff, tour, year, is_retirement,
            CAST(winner_aces AS INT) AS w_aces,
            CAST(loser_aces  AS INT) AS l_aces,
            winner_dfs, loser_dfs, winner_pts, loser_pts,
            winner_firsts, loser_firsts, winner_fwon, loser_fwon,
            winner_swon, loser_swon, winner_saved, loser_saved,
            winner_chances, loser_chances
        FROM matches_main
        {where}
        ORDER BY metric_value {direction}, date DESC
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()
