"""Leaderboard query builders."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _filter_extras

def q_leaders_wins(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 10,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    """All players with >= min_matches; page sorts by wins or win_pct."""
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_matches_idx = len(params) + 1
    params.append(int(min_matches))
    sql = f"""
        SELECT player_name, tour,
               COUNT(*) AS total,
               SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
               ROUND(100.0 * SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct
        FROM player_match_view
        WHERE 1=1 {extra}
        GROUP BY player_name, tour
        HAVING COUNT(*) >= ${min_matches_idx}
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 10. Serve leaders
# ---------------------------------------------------------------------------

def q_leaders_serve(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 10,
    level: Optional[str] = None,
    min_serve_pts: Optional[int] = None,
) -> 'pd.DataFrame':
    """Aggregated serve stats per player (only matches with point data)."""
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_matches_idx = len(params) + 1
    params.append(int(min_matches))
    having_clauses = [f"COUNT(*) >= ${min_matches_idx}"]
    if min_serve_pts is not None:
        min_serve_pts_idx = len(params) + 1
        params.append(int(min_serve_pts))
        having_clauses.append(f"SUM(pts) >= ${min_serve_pts_idx}")
    having_sql = " AND ".join(having_clauses)
    sql = f"""
        SELECT player_name, tour,
               COUNT(*) AS n_matches,
               CAST(SUM(aces) AS INT) AS total_aces,
               ROUND(100.0 * SUM(aces)     / NULLIF(SUM(pts), 0), 1)                        AS ace_pct,
               ROUND(100.0 * SUM(firsts)   / NULLIF(SUM(pts), 0), 1)                        AS first_in_pct,
               ROUND(100.0 * SUM(fwon)     / NULLIF(SUM(firsts), 0), 1)                     AS first_win_pct,
               ROUND(100.0 * SUM(swon)     / NULLIF(SUM(pts) - SUM(firsts), 0), 1)          AS second_win_pct,
               ROUND(100.0 * SUM(bp_saved) / NULLIF(SUM(bp_chances), 0), 1)                 AS bp_saved_pct
        FROM player_match_view
        WHERE pts IS NOT NULL {extra}
        GROUP BY player_name, tour
        HAVING {having_sql}
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 10b. Return leaders
# ---------------------------------------------------------------------------

def q_leaders_return(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 10,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    """Aggregated return stats: opponent serve viewed from returner's perspective."""
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_matches_idx = len(params) + 1
    params.append(int(min_matches))
    sql = f"""
        WITH opp AS (
            SELECT winner_name AS player, tour, level_name, surface, year, round,
                   loser_pts AS opp_pts, loser_firsts AS opp_firsts,
                   loser_fwon AS opp_fwon, loser_swon AS opp_swon,
                   loser_chances AS opp_chances, loser_saved AS opp_saved
            FROM matches_main WHERE winner_pts IS NOT NULL
            UNION ALL
            SELECT loser_name, tour, level_name, surface, year, round,
                   winner_pts, winner_firsts, winner_fwon, winner_swon,
                   winner_chances, winner_saved
            FROM matches_main WHERE winner_pts IS NOT NULL
        )
        SELECT player AS player_name, tour,
               COUNT(*) AS n_matches,
               ROUND(100.0 * SUM(opp_firsts - opp_fwon) / NULLIF(SUM(opp_firsts), 0), 1)                    AS first_return_win_pct,
               ROUND(100.0 * SUM(opp_pts - opp_firsts - opp_swon) / NULLIF(SUM(opp_pts - opp_firsts), 0), 1) AS second_return_win_pct,
               ROUND(100.0 * SUM(opp_chances - opp_saved) / NULLIF(SUM(opp_chances), 0), 1)                 AS bp_converted_pct
        FROM opp
        WHERE 1=1 {extra}
        GROUP BY player, tour
        HAVING COUNT(*) >= ${min_matches_idx}
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 11. Upset leaders
# ---------------------------------------------------------------------------

def q_leaders_upsets(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 20,
    level: Optional[str] = None,
) -> dict:
    """Returns {'wins': DataFrame, 'losses': DataFrame}."""
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    limit_idx = len(params) + 1
    params_with_limit = [*params, int(limit)]
    wins_sql = f"""
        SELECT winner_name AS player, tour, COUNT(*) AS upset_wins
        FROM matches_main WHERE is_upset = true {extra}
        GROUP BY winner_name, tour ORDER BY upset_wins DESC LIMIT ${limit_idx}
    """
    losses_sql = f"""
        SELECT loser_name AS player, tour, COUNT(*) AS upset_losses
        FROM matches_main WHERE is_upset = true {extra}
        GROUP BY loser_name, tour ORDER BY upset_losses DESC LIMIT ${limit_idx}
    """
    return {
        'wins':   con.execute(wins_sql,   params_with_limit).df(),
        'losses': con.execute(losses_sql, params_with_limit).df(),
    }


# ---------------------------------------------------------------------------
# 12. Comeback leaders (won after losing first set)
# ---------------------------------------------------------------------------

def q_leaders_comebacks(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 20,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    limit_idx = len(params) + 1
    params.append(int(limit))
    sql = f"""
        SELECT winner_name AS player, tour, COUNT(*) AS comebacks
        FROM matches_main
        WHERE (
            score LIKE '0-6 %' OR score LIKE '1-6 %' OR score LIKE '2-6 %'
            OR score LIKE '3-6 %' OR score LIKE '4-6 %' OR score LIKE '5-7 %'
            OR score LIKE '6-7%'
        )
        AND is_retirement = false
        {extra}
        GROUP BY winner_name, tour
        ORDER BY comebacks DESC
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 13. Activity leaders (matches played, tiebreaks, finals)
# ---------------------------------------------------------------------------

def q_leaders_activity(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 20,
    level: Optional[str] = None,
    sort_by: str = 'matches',
) -> 'pd.DataFrame':
    valid_sorts = {
        'matches', 'finals_played', 'finals_won', 'finals_win_pct',
        'tb_played', 'tb_won', 'tb_win_pct',
    }
    order_col = sort_by if sort_by in valid_sorts else 'matches'
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    limit_idx = len(params) + 1
    params.append(int(limit))
    sql = f"""
        SELECT player_name, tour,
               COUNT(*) AS matches,
               CAST(SUM(tb_won + tb_lost) AS INT) AS tb_played,
               CAST(SUM(tb_won) AS INT) AS tb_won,
               CASE WHEN SUM(tb_won + tb_lost) > 0
                    THEN ROUND(100.0 * SUM(tb_won) / SUM(tb_won + tb_lost), 1)
                    ELSE NULL END AS tb_win_pct,
               SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) AS finals_played,
               SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END) AS finals_won,
               CASE WHEN SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) > 0
                    THEN ROUND(100.0 * SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END)
                         / SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END), 1)
                    ELSE NULL END AS finals_win_pct
        FROM player_match_view
        WHERE 1=1 {extra}
        GROUP BY player_name, tour
        HAVING COUNT(*) >= 10
        ORDER BY {order_col} DESC NULLS LAST
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()


def q_leaders_bakery(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 20,
    sort_by: str = 'bagels_given',
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    """Count bagels (6-0 sets) and breadsticks (6-1 sets) given and received per player.
    Score is stored from the winner's perspective, so:
      - winner W: '6-0' in score = bagel given, '0-6' = bagel received
      - player as loser: roles reversed
    """
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    valid_sorts = {'bagels_given', 'bagels_received', 'breadsticks_given', 'breadsticks_received', 'matches'}
    order_col = sort_by if sort_by in valid_sorts else 'bagels_given'
    limit_idx = len(params) + 1
    params.append(int(limit))
    sql = f"""
        SELECT player_name, tour,
               COUNT(*) AS matches,
               CAST(SUM(CASE WHEN result='W' THEN (length(score) - length(replace(score, '6-0', ''))) / 3
                              ELSE (length(score) - length(replace(score, '0-6', ''))) / 3 END) AS INT) AS bagels_given,
               CAST(SUM(CASE WHEN result='W' THEN (length(score) - length(replace(score, '0-6', ''))) / 3
                              ELSE (length(score) - length(replace(score, '6-0', ''))) / 3 END) AS INT) AS bagels_received,
               CAST(SUM(CASE WHEN result='W' THEN (length(score) - length(replace(score, '6-1', ''))) / 3
                              ELSE (length(score) - length(replace(score, '1-6', ''))) / 3 END) AS INT) AS breadsticks_given,
               CAST(SUM(CASE WHEN result='W' THEN (length(score) - length(replace(score, '1-6', ''))) / 3
                              ELSE (length(score) - length(replace(score, '6-1', ''))) / 3 END) AS INT) AS breadsticks_received
        FROM player_match_view
        WHERE score IS NOT NULL
          AND score NOT LIKE '%W/O%'
          AND score NOT LIKE '%DEF%'
          {extra}
        GROUP BY player_name, tour
        HAVING COUNT(*) >= 10
        ORDER BY {order_col} DESC
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 13b. Consolidated activity leaders (all player-level counting stats in one pass)
# ---------------------------------------------------------------------------

def q_leaders_activity_combined(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    level: Optional[str] = None,
    min_matches: int = 10,
) -> 'pd.DataFrame':
    """Every player with >= min_matches matches in the filter window. Returns all
    count-based stats (wins, finals, titles, TB, upsets, comebacks, bakery) in
    one aggregation. Client sorts."""
    # Both CTEs reuse the same positional placeholders ($1..$N), so we only pass one set of filter values.
    extra_pmv, params = _filter_extras(tour, surface, year_min, year_max, level)
    extra_mm, _      = _filter_extras(tour, surface, year_min, year_max, level)
    min_idx = len(params) + 1
    params.append(int(min_matches))

    COMEBACK_CLAUSE = """(
        score LIKE '0-6 %' OR score LIKE '1-6 %' OR score LIKE '2-6 %'
        OR score LIKE '3-6 %' OR score LIKE '4-6 %' OR score LIKE '5-7 %'
        OR score LIKE '6-7%'
    ) AND is_retirement = false"""

    sql = f"""
        WITH base AS (
            SELECT
                player_name,
                tour,
                COUNT(*) AS matches,
                SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
                ROUND(100.0 * SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct,
                CAST(SUM(tb_won + tb_lost) AS INT) AS tb_played,
                CAST(SUM(tb_won) AS INT) AS tb_won,
                SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) AS finals,
                SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END) AS titles,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result='W' THEN (length(score) - length(replace(score, '6-0', ''))) / 3
                           ELSE (length(score) - length(replace(score, '0-6', ''))) / 3 END
                    ELSE 0 END) AS INT) AS bagels_given,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result='W' THEN (length(score) - length(replace(score, '0-6', ''))) / 3
                           ELSE (length(score) - length(replace(score, '6-0', ''))) / 3 END
                    ELSE 0 END) AS INT) AS bagels_received,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result='W' THEN (length(score) - length(replace(score, '6-1', ''))) / 3
                           ELSE (length(score) - length(replace(score, '1-6', ''))) / 3 END
                    ELSE 0 END) AS INT) AS breadsticks_given,
                CAST(SUM(CASE
                    WHEN score IS NOT NULL AND score NOT LIKE '%W/O%' AND score NOT LIKE '%DEF%' THEN
                      CASE WHEN result='W' THEN (length(score) - length(replace(score, '1-6', ''))) / 3
                           ELSE (length(score) - length(replace(score, '6-1', ''))) / 3 END
                    ELSE 0 END) AS INT) AS breadsticks_received
            FROM player_match_view
            WHERE 1=1 {extra_pmv}
            GROUP BY player_name, tour
            HAVING COUNT(*) >= ${min_idx}
        ),
        upsets AS (
            SELECT winner_name AS player_name, tour, COUNT(*) AS upset_wins
            FROM matches_main
            WHERE is_upset = true {extra_mm}
            GROUP BY winner_name, tour
        ),
        comebacks AS (
            SELECT winner_name AS player_name, tour, COUNT(*) AS comebacks
            FROM matches_main
            WHERE {COMEBACK_CLAUSE} {extra_mm}
            GROUP BY winner_name, tour
        )
        SELECT
            b.player_name, b.tour, b.matches, b.wins, b.win_pct,
            b.finals, b.titles, b.tb_played, b.tb_won,
            COALESCE(u.upset_wins, 0) AS upset_wins,
            COALESCE(c.comebacks, 0) AS comebacks,
            b.bagels_given, b.bagels_received,
            b.breadsticks_given, b.breadsticks_received
        FROM base b
        LEFT JOIN upsets u ON u.player_name = b.player_name AND u.tour = b.tour
        LEFT JOIN comebacks c ON c.player_name = b.player_name AND c.tour = b.tour
        ORDER BY b.wins DESC
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# Player milestones (career-high rank, first top-10/5, first GS title, etc.)
# ---------------------------------------------------------------------------

def q_leaders_streaks(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    level: Optional[str] = None,
    streak_surface: Optional[str] = None,
) -> 'pd.DataFrame':
    """Longest win streaks. If streak_surface given, partition by surface.

    Ongoing streaks (no subsequent loss in the filtered result set) are only
    considered valid if the last win happened within the last 3 months.
    For valid ongoing streaks, end_date is returned as NULL.
    """
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)

    surface_partition = ", surface" if streak_surface else ""
    surface_select = ", surface" if streak_surface else ", 'All' AS surface"
    surface_join = " AND s.surface = l.surface" if streak_surface else ""

    streak_extra = ""
    if streak_surface:
        idx = len(params) + 1
        streak_extra = f" AND surface = ${idx}"
        params.append(streak_surface)

    sql = f"""
        WITH all_results AS (
            -- Wins: only count completed, non-retirement, non-walkover wins
            SELECT winner_name AS player_name, tour, surface, date, 'W' AS result, tournament, year, level_name, round
            FROM matches_main
            WHERE is_walkover = false AND is_retirement = false
            UNION ALL
            -- Losses: include retirements and walkovers as streak-breaking losses
            SELECT loser_name, tour, surface, date, 'L', tournament, year, level_name, round
            FROM matches_main
        ),
        filtered AS (
            SELECT player_name, tour, surface, date, result, tournament,
                   CASE round
                       WHEN 'Q1'   THEN 1
                       WHEN 'Q2'   THEN 2
                       WHEN 'Q3'   THEN 3
                       WHEN 'R128' THEN 4
                       WHEN 'R64'  THEN 5
                       WHEN 'ER'   THEN 6
                       WHEN 'R32'  THEN 7
                       WHEN 'R16'  THEN 8
                       WHEN 'RR'   THEN 9
                       WHEN 'QF'   THEN 10
                       WHEN 'SF'   THEN 11
                       WHEN 'BR'   THEN 12
                       WHEN 'F'    THEN 13
                       ELSE 99
                   END AS round_ord,
                   ROW_NUMBER() OVER (PARTITION BY player_name, tour{surface_partition}
                                      ORDER BY date, tournament, round_ord, round) AS rn,
                   ROW_NUMBER() OVER (PARTITION BY player_name, tour{surface_partition}, result
                                      ORDER BY date, tournament, round_ord, round) AS rn_result
            FROM all_results
            WHERE 1=1 {extra} {streak_extra}
        ),
        latest AS (
            SELECT player_name, tour{surface_partition},
                   MAX(rn) AS latest_rn
            FROM filtered
            GROUP BY player_name, tour{surface_partition}
        ),
        streaks AS (
            SELECT player_name, tour {surface_select},
                   rn - rn_result AS streak_group,
                   COUNT(*) AS streak_length,
                   MIN(date) AS start_date,
                   MAX(date) AS streak_last_win_date,
                   MAX(rn) AS streak_end_rn
            FROM filtered
            WHERE result = 'W'
            GROUP BY player_name, tour{surface_partition}, streak_group
        ),
        valid_streaks AS (
            SELECT s.player_name, s.tour, s.surface, s.streak_length, s.start_date,
                   CASE
                       WHEN s.streak_end_rn = l.latest_rn THEN NULL
                       ELSE s.streak_last_win_date
                   END AS end_date
            FROM streaks s
            LEFT JOIN latest l
              ON s.player_name = l.player_name
             AND s.tour = l.tour{surface_join}
            WHERE s.streak_end_rn <> l.latest_rn
               OR s.streak_last_win_date >= CURRENT_DATE - INTERVAL '3 months'
        ),
        best AS (
            SELECT player_name, tour, surface,
                   MAX(streak_length) AS streak_length,
                   FIRST(start_date ORDER BY streak_length DESC) AS start_date,
                   FIRST(end_date ORDER BY streak_length DESC) AS end_date
            FROM valid_streaks
            GROUP BY player_name, tour, surface
        )
        SELECT player_name, tour, streak_length, surface, start_date, end_date
        FROM best
        WHERE streak_length >= 5
        ORDER BY streak_length DESC
        LIMIT 100
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# Tournament draw strength (avg opponent rank per player in a tournament)
# ---------------------------------------------------------------------------

def q_leaders_draw_strength(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    """Champions who faced the toughest draws (avg opponent rank in winning run)."""
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)

    sql = f"""
        WITH champions AS (
            SELECT winner_name AS player_name, tournament, year, tour, surface
            FROM matches_main
            WHERE round = 'F'
              AND level_name != 'Tour Finals'
              {extra}
        ),
        champion_matches AS (
            SELECT pm.player_name, pm.tournament, pm.year, pm.tour,
                   pm.opponent_rank,
                   c.surface
            FROM player_match_view pm
            INNER JOIN champions c
              ON pm.player_name = c.player_name
              AND pm.tournament = c.tournament
              AND pm.year = c.year
              AND pm.tour = c.tour
            WHERE pm.result = 'W'
              AND pm.opponent_rank IS NOT NULL
        )
        SELECT player_name, tournament, year, tour, surface,
               ROUND(AVG(opponent_rank), 1) AS avg_opp_rank,
               COUNT(*) AS matches_won,
               MIN(opponent_rank) AS best_opp_beaten
        FROM champion_matches
        GROUP BY player_name, tournament, year, tour, surface
        HAVING COUNT(*) >= 3
        ORDER BY avg_opp_rank ASC
        LIMIT 100
    """
    return con.execute(sql, params).df()


def q_leaders_top10_wins(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 5,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_idx = len(params) + 1
    params.append(int(min_matches))
    sql = f"""
        SELECT player_name, tour,
               COUNT(*) FILTER (WHERE opponent_rank <= 10) AS top10_matches,
               SUM(CASE WHEN result='W' AND opponent_rank <= 10 THEN 1 ELSE 0 END) AS top10_wins,
               ROUND(100.0 * SUM(CASE WHEN result='W' AND opponent_rank <= 10 THEN 1 ELSE 0 END)
                     / NULLIF(COUNT(*) FILTER (WHERE opponent_rank <= 10), 0), 1) AS top10_win_pct
        FROM player_match_view
        WHERE opponent_rank IS NOT NULL {extra}
        GROUP BY player_name, tour
        HAVING COUNT(*) FILTER (WHERE opponent_rank <= 10) >= ${min_idx}
        ORDER BY top10_wins DESC, top10_win_pct DESC NULLS LAST
    """
    return con.execute(sql, params).df()


def q_leaders_finals(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 3,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_idx = len(params) + 1
    params.append(int(min_matches))
    sql = f"""
        SELECT player_name, tour,
               SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) AS finals,
               SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END) AS titles,
               ROUND(100.0 * SUM(CASE WHEN round = 'F' AND result = 'W' THEN 1 ELSE 0 END)
                     / NULLIF(SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END), 0), 1) AS finals_win_pct,
               SUM(CASE WHEN round = 'F' AND level_name = 'Grand Slam' THEN 1 ELSE 0 END) AS gs_finals,
               SUM(CASE WHEN round = 'F' AND level_name = 'Grand Slam' AND result = 'W' THEN 1 ELSE 0 END) AS gs_titles
        FROM player_match_view
        WHERE 1=1 {extra}
        GROUP BY player_name, tour
        HAVING SUM(CASE WHEN round = 'F' THEN 1 ELSE 0 END) >= ${min_idx}
        ORDER BY titles DESC, finals_win_pct DESC NULLS LAST
    """
    return con.execute(sql, params).df()


def q_leaders_slam_record(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 10,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_idx = len(params) + 1
    params.append(int(min_matches))
    sql = f"""
        SELECT player_name, tour,
               COUNT(*) AS slam_matches,
               SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS slam_wins,
               ROUND(100.0 * SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS slam_win_pct
        FROM player_match_view
        WHERE level = 'G' {extra}
        GROUP BY player_name, tour
        HAVING COUNT(*) >= ${min_idx}
        ORDER BY slam_win_pct DESC NULLS LAST, slam_wins DESC
    """
    return con.execute(sql, params).df()


def q_leaders_tiebreaks(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    min_matches: int = 10,
    level: Optional[str] = None,
) -> 'pd.DataFrame':
    extra, params = _filter_extras(tour, surface, year_min, year_max, level)
    min_idx = len(params) + 1
    params.append(int(min_matches))
    sql = f"""
        SELECT player_name, tour,
               CAST(SUM(tb_won + tb_lost) AS INT) AS tb_played,
               CAST(SUM(tb_won) AS INT) AS tb_won,
               CAST(SUM(tb_lost) AS INT) AS tb_lost,
               ROUND(100.0 * SUM(tb_won) / NULLIF(SUM(tb_won + tb_lost), 0), 1) AS tb_win_pct
        FROM player_match_view
        WHERE 1=1 {extra}
        GROUP BY player_name, tour
        HAVING COUNT(*) >= ${min_idx}
           AND SUM(tb_won + tb_lost) > 0
        ORDER BY tb_win_pct DESC NULLS LAST, tb_won DESC
    """
    return con.execute(sql, params).df()
