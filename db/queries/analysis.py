"""Higher-level analysis query builders for MCP and agent workflows."""
from __future__ import annotations

from typing import Optional

import duckdb
import pandas as pd

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


def q_metric_scatter(
    con: duckdb.DuckDBPyConnection,
    *,
    target_players: pd.DataFrame,
    tour: str,
    year_min: int,
    year_max: Optional[int] = None,
    surface: Optional[str] = None,
    level: Optional[str] = "All Tour",
) -> "pd.DataFrame":
    """Chart-ready serve/return metrics for a live-ranked cohort scatterplot."""
    con.register("target_players", target_players)
    if surface == "All":
        surface = None
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    sql = f"""
        WITH target AS (
            SELECT player_name, current_rank, country
            FROM target_players
        ),
        pmv AS (
            SELECT pm.*
            FROM player_match_view pm
            JOIN target t
              ON t.player_name = pm.player_name
            WHERE 1=1 {extra}
        ),
        player_agg AS (
            SELECT
                player_name,
                COUNT(*) AS total_matches,
                COUNT(*) FILTER (WHERE result = 'W') AS total_wins,
                CAST(SUM(tb_won + tb_lost) AS INTEGER) AS tb_played,
                ROUND(100.0 * SUM(tb_won) / NULLIF(SUM(tb_won + tb_lost), 0), 1) AS tb_win_pct,
                ROUND(100.0 * SUM(aces) / NULLIF(SUM(pts), 0), 1) AS ace_pct,
                ROUND(100.0 * SUM(dfs) / NULLIF(SUM(pts), 0), 1) AS df_pct,
                ROUND(100.0 * SUM(firsts) / NULLIF(SUM(pts), 0), 1) AS first_in_pct,
                ROUND(100.0 * SUM(fwon) / NULLIF(SUM(firsts), 0), 1) AS first_win_pct,
                ROUND(100.0 * SUM(swon) / NULLIF(SUM(pts) - SUM(firsts), 0), 1) AS second_win_pct,
                ROUND(100.0 * SUM(fwon + swon) / NULLIF(SUM(pts), 0), 1) AS serve_points_won_pct,
                ROUND(100.0 * SUM(bp_saved) / NULLIF(SUM(bp_chances), 0), 1) AS bp_saved_pct,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result = 'W' THEN (length(score) - length(replace(score, '6-0', ''))) / 3
                           ELSE (length(score) - length(replace(score, '0-6', ''))) / 3 END
                    ELSE 0 END) AS INTEGER) AS bagels_given,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result = 'W' THEN (length(score) - length(replace(score, '0-6', ''))) / 3
                           ELSE (length(score) - length(replace(score, '6-0', ''))) / 3 END
                    ELSE 0 END) AS INTEGER) AS bagels_received,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result = 'W' THEN (length(score) - length(replace(score, '6-1', ''))) / 3
                           ELSE (length(score) - length(replace(score, '1-6', ''))) / 3 END
                    ELSE 0 END) AS INTEGER) AS breadsticks_given,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result = 'W' THEN (length(score) - length(replace(score, '1-6', ''))) / 3
                           ELSE (length(score) - length(replace(score, '6-1', ''))) / 3 END
                    ELSE 0 END) AS INTEGER) AS breadsticks_received
            FROM pmv
            GROUP BY player_name
        ),
        return_rows AS (
            SELECT winner_name AS player_name,
                   loser_pts AS opp_pts,
                   loser_firsts AS opp_firsts,
                   loser_fwon AS opp_fwon,
                   loser_swon AS opp_swon,
                   loser_chances AS opp_bp_chances,
                   loser_saved AS opp_bp_saved
            FROM matches_main
            JOIN target t
              ON t.player_name = winner_name
            WHERE is_walkover = false {extra}
            UNION ALL
            SELECT loser_name AS player_name,
                   winner_pts AS opp_pts,
                   winner_firsts AS opp_firsts,
                   winner_fwon AS opp_fwon,
                   winner_swon AS opp_swon,
                   winner_chances AS opp_bp_chances,
                   winner_saved AS opp_bp_saved
            FROM matches_main
            JOIN target t
              ON t.player_name = loser_name
            WHERE is_walkover = false {extra}
        ),
        return_agg AS (
            SELECT
                player_name,
                ROUND(100.0 * SUM(opp_firsts - opp_fwon) / NULLIF(SUM(opp_firsts), 0), 1) AS first_return_win_pct,
                ROUND(100.0 * SUM(opp_pts - opp_firsts - opp_swon) / NULLIF(SUM(opp_pts - opp_firsts), 0), 1) AS second_return_win_pct,
                ROUND(100.0 * SUM(opp_pts - opp_fwon - opp_swon) / NULLIF(SUM(opp_pts), 0), 1) AS return_points_won_pct
            FROM return_rows
            GROUP BY player_name
        ),
        winner_agg AS (
            SELECT
                winner_name AS player_name,
                COUNT(*) FILTER (
                    WHERE (
                        score LIKE '0-6 %' OR score LIKE '1-6 %' OR score LIKE '2-6 %'
                        OR score LIKE '3-6 %' OR score LIKE '4-6 %' OR score LIKE '5-7 %'
                        OR score LIKE '6-7%'
                    )
                    AND is_retirement = false
                ) AS comeback_wins,
                COUNT(*) FILTER (WHERE is_upset = true) AS upset_wins
            FROM matches_main
            JOIN target t
              ON t.player_name = winner_name
            WHERE is_walkover = false {extra}
            GROUP BY winner_name
        ),
        loser_agg AS (
            SELECT loser_name AS player_name,
                   COUNT(*) FILTER (WHERE is_upset = true) AS upset_losses
            FROM matches_main
            JOIN target t
              ON t.player_name = loser_name
            WHERE is_walkover = false {extra}
            GROUP BY loser_name
        ),
        scored AS (
            SELECT
                t.current_rank,
                t.player_name,
                t.country,
                COALESCE(pa.total_matches, 0)::INTEGER AS total_matches,
                COALESCE(pa.total_wins, 0)::INTEGER AS total_wins,
                COALESCE(pa.tb_played, 0)::INTEGER AS tb_played,
                pa.tb_win_pct,
                pa.ace_pct,
                pa.df_pct,
                pa.first_in_pct,
                pa.first_win_pct,
                pa.second_win_pct,
                pa.serve_points_won_pct,
                pa.bp_saved_pct,
                COALESCE(pa.bagels_given, 0)::INTEGER AS bagels_given,
                COALESCE(pa.bagels_received, 0)::INTEGER AS bagels_received,
                COALESCE(pa.breadsticks_given, 0)::INTEGER AS breadsticks_given,
                COALESCE(pa.breadsticks_received, 0)::INTEGER AS breadsticks_received,
                COALESCE(wa.comeback_wins, 0)::INTEGER AS comeback_wins,
                COALESCE(wa.upset_wins, 0)::INTEGER AS upset_wins,
                COALESCE(la.upset_losses, 0)::INTEGER AS upset_losses,
                ra.first_return_win_pct,
                ra.second_return_win_pct,
                ra.return_points_won_pct,
                t.current_rank <= 10 AS is_live_top10,
                false AS is_highlight
            FROM target t
            LEFT JOIN player_agg pa ON pa.player_name = t.player_name
            LEFT JOIN return_agg ra ON ra.player_name = t.player_name
            LEFT JOIN winner_agg wa ON wa.player_name = t.player_name
            LEFT JOIN loser_agg la ON la.player_name = t.player_name
        )
        SELECT *,
               ROW_NUMBER() OVER (
                   ORDER BY total_wins DESC, current_rank ASC
               ) <= 10 AS is_top10_comebacker
        FROM scored
        ORDER BY current_rank;
    """
    try:
        return con.execute(sql, params).df()
    finally:
        try:
            con.unregister("target_players")
        except duckdb.CatalogException:
            pass


# Backwards-compatible name for the original chart endpoint/query.
def q_comeback_scatter(*args, **kwargs) -> "pd.DataFrame":
    kwargs.pop("highlight", None)
    return q_metric_scatter(*args, **kwargs)

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
