"""Match search query builders."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _level_condition, _where

def q_match_search(
    con: duckdb.DuckDBPyConnection,
    winner: Optional[str] = None,
    loser: Optional[str] = None,
    tournament: Optional[str] = None,
    surface: Optional[str] = None,
    level: Optional[str] = None,
    round_: Optional[str] = None,
    tour: Optional[str] = None,
    upsets_only: bool = False,
    with_stats_only: bool = False,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 500,
    stat_filters: Optional[dict[str, tuple[Optional[float], Optional[float]]]] = None,
) -> 'pd.DataFrame':
    conditions: list[str] = []
    params: list = []
    idx = 1

    if tour:
        conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if winner:
        conditions.append(f"winner_name ILIKE ${idx}"); params.append(f'%{winner}%'); idx += 1
    if loser:
        conditions.append(f"loser_name ILIKE ${idx}"); params.append(f'%{loser}%'); idx += 1
    if tournament:
        conditions.append(f"tournament ILIKE ${idx}"); params.append(f'%{tournament}%'); idx += 1
    if surface:
        conditions.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if level:
        idx = _level_condition(level, conditions, params, idx)
    if round_:
        conditions.append(f"round = ${idx}"); params.append(round_); idx += 1
    if upsets_only:
        conditions.append("is_upset = true")
    if with_stats_only:
        conditions.append("winner_pts IS NOT NULL")
    if year_min:
        conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1

    # Stat-based filters (column_name -> (min, max))
    _STAT_COL_MAP = {
        'w_aces': 'CAST(winner_aces AS INT)',
        'l_aces': 'CAST(loser_aces AS INT)',
        'w_dfs': 'CAST(winner_dfs AS INT)',
        'l_dfs': 'CAST(loser_dfs AS INT)',
        'w_first_in_pct': 'CASE WHEN winner_pts > 0 THEN 100.0 * winner_firsts / winner_pts ELSE NULL END',
        'l_first_in_pct': 'CASE WHEN loser_pts > 0 THEN 100.0 * loser_firsts / loser_pts ELSE NULL END',
        'w_first_won_pct': 'CASE WHEN winner_firsts > 0 THEN 100.0 * winner_fwon / winner_firsts ELSE NULL END',
        'l_first_won_pct': 'CASE WHEN loser_firsts > 0 THEN 100.0 * loser_fwon / loser_firsts ELSE NULL END',
        'w_second_won_pct': 'CASE WHEN (winner_pts - winner_firsts) > 0 THEN 100.0 * winner_swon / (winner_pts - winner_firsts) ELSE NULL END',
        'l_second_won_pct': 'CASE WHEN (loser_pts - loser_firsts) > 0 THEN 100.0 * loser_swon / (loser_pts - loser_firsts) ELSE NULL END',
        'w_bp_saved_pct': 'CASE WHEN winner_chances > 0 THEN 100.0 * winner_saved / winner_chances ELSE NULL END',
        'l_bp_saved_pct': 'CASE WHEN loser_chances > 0 THEN 100.0 * loser_saved / loser_chances ELSE NULL END',
    }
    if stat_filters:
        for col, (lo, hi) in stat_filters.items():
            expr = _STAT_COL_MAP.get(col)
            if not expr:
                continue
            if lo is not None:
                conditions.append(f"({expr}) >= ${idx}"); params.append(lo); idx += 1
            if hi is not None:
                conditions.append(f"({expr}) <= ${idx}"); params.append(hi); idx += 1
    limit_idx = idx
    params.append(int(limit))

    sql = f"""
        SELECT date, tournament, surface, level_name, round, score, time,
               winner_name, winner_rank, loser_name, loser_rank,
               is_upset, is_retirement, tour, year,
               -- raw stat columns for optional display
               CAST(winner_aces AS INT) AS w_aces,
               CAST(loser_aces AS INT) AS l_aces,
               CAST(winner_dfs AS INT) AS w_dfs,
               CAST(loser_dfs AS INT) AS l_dfs,
               CASE WHEN winner_pts > 0
                    THEN ROUND(100.0 * winner_firsts / winner_pts, 1)
                    ELSE NULL END AS w_first_in_pct,
               CASE WHEN loser_pts > 0
                    THEN ROUND(100.0 * loser_firsts / loser_pts, 1)
                    ELSE NULL END AS l_first_in_pct,
               CASE WHEN winner_firsts > 0
                    THEN ROUND(100.0 * winner_fwon / winner_firsts, 1)
                    ELSE NULL END AS w_first_won_pct,
               CASE WHEN loser_firsts > 0
                    THEN ROUND(100.0 * loser_fwon / loser_firsts, 1)
                    ELSE NULL END AS l_first_won_pct,
               CASE WHEN (winner_pts - winner_firsts) > 0
                    THEN ROUND(100.0 * winner_swon / (winner_pts - winner_firsts), 1)
                    ELSE NULL END AS w_second_won_pct,
               CASE WHEN (loser_pts - loser_firsts) > 0
                    THEN ROUND(100.0 * loser_swon / (loser_pts - loser_firsts), 1)
                    ELSE NULL END AS l_second_won_pct,
               CASE WHEN winner_chances > 0
                    THEN ROUND(100.0 * winner_saved / winner_chances, 1)
                    ELSE NULL END AS w_bp_saved_pct,
               CASE WHEN loser_chances > 0
                    THEN ROUND(100.0 * loser_saved / loser_chances, 1)
                    ELSE NULL END AS l_bp_saved_pct
        FROM matches_main
        {_where(conditions)}
        ORDER BY date DESC
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 5. Autocomplete helpers
# ---------------------------------------------------------------------------
