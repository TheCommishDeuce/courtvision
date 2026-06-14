"""Higher-level analysis query builders for MCP and agent workflows."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _filter_extras

ROUND_ORDER_SQL = """
    CASE round
        WHEN 'Q1' THEN 1
        WHEN 'Q2' THEN 2
        WHEN 'Q3' THEN 3
        WHEN 'R128' THEN 4
        WHEN 'R64' THEN 5
        WHEN 'ER' THEN 6
        WHEN 'R32' THEN 7
        WHEN 'R16' THEN 8
        WHEN 'RR' THEN 9
        WHEN 'QF' THEN 10
        WHEN 'SF' THEN 11
        WHEN 'BR' THEN 12
        WHEN 'F' THEN 13
        ELSE 0
    END
"""

STAGE_ORDER = {
    "R128": 4,
    "R64": 5,
    "R32": 7,
    "R16": 8,
    "QF": 10,
    "SF": 11,
    "F": 13,
}


def _round_from_order(order_value: int | None) -> str | None:
    if order_value is None:
        return None
    order_to_round = {value: key for key, value in STAGE_ORDER.items()}
    return order_to_round.get(int(order_value))


def _qualify_player_match_filters(extra: str) -> str:
    """Qualify shared filter SQL for queries that join player_match_view."""
    return (
        extra
        .replace("tour =", "pmv.tour =")
        .replace("surface =", "pmv.surface =")
        .replace("level_name", "pmv.level_name")
        .replace("round ", "pmv.round ")
        .replace("year >=", "pmv.year >=")
        .replace("year <=", "pmv.year <=")
    )


def q_youngest_stage_reached(
    con: duckdb.DuckDBPyConnection,
    *,
    stage: str = "QF",
    tour: Optional[str] = None,
    level: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 20,
) -> "pd.DataFrame":
    """Youngest players to reach at least a given tournament stage."""
    stage_order = STAGE_ORDER.get(stage.upper())
    if stage_order is None:
        raise ValueError(f"Unsupported stage: {stage}")

    extra, params = _filter_extras(tour, surface, year_min, year_max, level, start_idx=2)
    extra = _qualify_player_match_filters(extra)
    params = [stage_order, *params, int(limit)]
    limit_idx = len(params)
    sql = f"""
        WITH stage_matches AS (
            SELECT
                pmv.player_name,
                pmv.tour,
                pmv.tournament,
                pmv.year,
                pmv.surface,
                pmv.level_name,
                pmv.round,
                pmv.date,
                pmv.result,
                pmv.opponent_name,
                players.country,
                players.birthdate,
                date_diff('day', players.birthdate, pmv.date) AS age_days,
                {ROUND_ORDER_SQL} AS round_order
            FROM player_match_view pmv
            JOIN players
              ON players.name = pmv.player_name
             AND players.tour = pmv.tour
            WHERE players.birthdate IS NOT NULL
              AND ({ROUND_ORDER_SQL}) >= $1
              {extra}
        ),
        event_runs AS (
            SELECT
                player_name,
                tour,
                tournament,
                year,
                ANY_VALUE(surface) AS surface,
                ANY_VALUE(level_name) AS level_name,
                ANY_VALUE(country) AS country,
                MIN(birthdate) AS birthdate,
                MIN(date) AS reached_date,
                MIN(age_days) AS age_days,
                MAX(round_order) AS deepest_round_order,
                COUNT(*) AS matches_at_stage_or_later,
                SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins_at_stage_or_later
            FROM stage_matches
            GROUP BY player_name, tour, tournament, year
        )
        SELECT
            player_name,
            tour,
            country,
            birthdate,
            reached_date,
            ROUND(age_days / 365.2425, 2) AS age_years,
            age_days,
            tournament,
            year,
            surface,
            level_name,
            deepest_round_order,
            matches_at_stage_or_later,
            wins_at_stage_or_later
        FROM event_runs
        ORDER BY age_days ASC, reached_date ASC
        LIMIT ${limit_idx}
    """
    df = con.execute(sql, params).df()
    if not df.empty:
        df["deepest_round"] = df["deepest_round_order"].apply(_round_from_order)
        df = df.drop(columns=["deepest_round_order"])
    return df


def q_tour_level_season_leaders(
    con: duckdb.DuckDBPyConnection,
    *,
    tour: Optional[str] = None,
    year: int,
    surface: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Combined All Tour wins and finals leaders for one season."""
    wins_extra, wins_params = _filter_extras(tour, surface, year, year, "All Tour")
    finals_extra, finals_params = _filter_extras(tour, surface, year, year, "All Tour")
    wins_limit_idx = len(wins_params) + 1
    finals_limit_idx = len(finals_params) + 1
    wins_sql = f"""
        SELECT
            player_name,
            tour,
            COUNT(*) AS total,
            SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) AS losses,
            ROUND(100.0 * SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct
        FROM player_match_view
        WHERE 1=1 {wins_extra}
        GROUP BY player_name, tour
        ORDER BY wins DESC, total DESC, player_name ASC
        LIMIT ${wins_limit_idx}
    """
    finals_sql = f"""
        SELECT
            player_name,
            tour,
            SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) AS finals,
            SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END) AS titles,
            SUM(CASE WHEN round = 'F' AND result = 'L' THEN 1 ELSE 0 END) AS runner_ups,
            CASE WHEN SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) > 0
                THEN ROUND(100.0 * SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END)
                    / SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END), 1)
                ELSE NULL END AS finals_win_pct
        FROM player_match_view
        WHERE 1=1 {finals_extra}
        GROUP BY player_name, tour
        HAVING SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) > 0
        ORDER BY finals DESC, titles DESC, player_name ASC
        LIMIT ${finals_limit_idx}
    """
    return {
        "wins": con.execute(wins_sql, [*wins_params, int(limit)]).df(),
        "finals": con.execute(finals_sql, [*finals_params, int(limit)]).df(),
        "filters": {
            "tour": tour,
            "year": year,
            "surface": surface,
            "level": "All Tour",
        },
    }
