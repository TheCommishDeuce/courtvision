"""Nationality-based tournament milestones and country leaderboards.

Answers questions like "who was the last Russian woman to reach a Grand Slam
final?" and "which country won the most WTA 250 titles in 2024?" by joining
player_match_view to deduped player attributes (country) from the players table.
"""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import PLAYER_ATTRS_CTE, _filter_extras, _normalize_country
from .analysis import (
    ROUND_ORDER_SQL,
    STAGE_ORDER,
    _qualify_player_match_filters,
    _round_from_order,
)


def q_nationality_stage(
    con: duckdb.DuckDBPyConnection,
    *,
    country: str,
    stage: str = "F",
    tour: Optional[str] = None,
    level: Optional[str] = None,
    surface: Optional[str] = None,
    tournament: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    order: str = "last",
    limit: int = 20,
) -> "pd.DataFrame":
    """Players from a country that reached at least a given tournament stage.

    `order='last'` returns the most recent first (e.g. last Russian woman to
    reach a Grand Slam final); `order='first'` returns the earliest first.
    `tournament` is an optional substring filter to isolate one event
    (e.g. 'Wimbledon') — exposed for MCP/agent queries.
    """
    stage_order = STAGE_ORDER.get(stage.upper())
    if stage_order is None:
        raise ValueError(f"Unsupported stage: {stage}")
    code = _normalize_country(country)
    direction = "ASC" if order.lower() == "first" else "DESC"

    # params: $1 country, $2 stage_order, then _filter_extras (start_idx=3),
    # then optional tournament, then limit.
    extra, extra_params = _filter_extras(tour, surface, year_min, year_max, level, start_idx=3)
    extra = _qualify_player_match_filters(extra)
    params = [code, stage_order, *extra_params]
    if tournament:
        extra += f" AND pmv.tournament ILIKE ${len(params) + 1}"
        params.append(f"%{tournament}%")
    params.append(int(limit))
    limit_idx = len(params)

    sql = f"""
        WITH {PLAYER_ATTRS_CTE},
        stage_matches AS (
            SELECT
                pmv.player_name,
                pmv.tour,
                pa.country,
                pmv.tournament,
                pmv.year,
                pmv.surface,
                pmv.level_name,
                pmv.round,
                pmv.date,
                pmv.result,
                pmv.opponent_name,
                {ROUND_ORDER_SQL} AS round_order
            FROM player_match_view pmv
            JOIN player_attrs pa
              ON pa.name = pmv.player_name AND pa.tour = pmv.tour
            WHERE pa.country = $1
              AND ({ROUND_ORDER_SQL}) >= $2
              {extra}
        ),
        event_runs AS (
            SELECT
                player_name,
                tour,
                ANY_VALUE(country) AS country,
                tournament,
                year,
                ANY_VALUE(surface) AS surface,
                ANY_VALUE(level_name) AS level_name,
                MIN(date) AS reached_date,
                MAX(round_order) AS deepest_round_order,
                MAX(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END) AS won_title
            FROM stage_matches
            GROUP BY player_name, tour, tournament, year
        )
        SELECT
            player_name,
            tour,
            country,
            reached_date,
            tournament,
            year,
            surface,
            level_name,
            deepest_round_order,
            won_title
        FROM event_runs
        ORDER BY reached_date {direction}
        LIMIT ${limit_idx}
    """
    df = con.execute(sql, params).df()
    if not df.empty:
        df["deepest_round"] = df["deepest_round_order"].apply(_round_from_order)
        df = df.drop(columns=["deepest_round_order"])
    return df


_COUNTRY_METRICS = {
    "titles": "SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END)",
    "finals": "SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END)",
    "semis":  "SUM(CASE WHEN round IN ('SF', 'F') THEN 1 ELSE 0 END)",
    "wins":   "SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END)",
}


def q_country_leaders(
    con: duckdb.DuckDBPyConnection,
    *,
    metric: str = "titles",
    tour: Optional[str] = None,
    level: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 20,
) -> "pd.DataFrame":
    """Leaderboard of countries by titles / finals / semifinals / match wins."""
    metric = metric.lower()
    if metric not in _COUNTRY_METRICS:
        raise ValueError(f"Unsupported metric: {metric}. Choose from {sorted(_COUNTRY_METRICS)}.")
    metric_expr = _COUNTRY_METRICS[metric]

    extra, params = _filter_extras(tour, surface, year_min, year_max, level, start_idx=1)
    extra = _qualify_player_match_filters(extra)
    params.append(int(limit))
    limit_idx = len(params)

    sql = f"""
        WITH {PLAYER_ATTRS_CTE}
        SELECT
            pa.country,
            COUNT(DISTINCT pmv.player_name) AS players,
            SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END) AS titles,
            SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) AS finals,
            SUM(CASE WHEN round IN ('SF', 'F') THEN 1 ELSE 0 END) AS semis_or_better,
            SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
            {metric_expr} AS metric_value
        FROM player_match_view pmv
        JOIN player_attrs pa
          ON pa.name = pmv.player_name AND pa.tour = pmv.tour
        WHERE pa.country IS NOT NULL {extra}
        GROUP BY pa.country
        HAVING {metric_expr} > 0
        ORDER BY metric_value DESC, titles DESC, country ASC
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()
