"""Player profile query builders."""
from __future__ import annotations

from datetime import date
from typing import Optional

import duckdb

from ._helpers import _TOUR_LEVELS, _level_condition, _where

def q_player_matches(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    surface: Optional[str] = None,
    level: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    tour: Optional[str] = None,
) -> 'pd.DataFrame':
    common_conditions: list[str] = []
    params: list = [player_name]
    idx = 2
    if tour:
        common_conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if surface:
        common_conditions.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if level:
        idx = _level_condition(level, common_conditions, params, idx)
    if year_min:
        common_conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        common_conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1

    common_extra = (' AND ' + ' AND '.join(common_conditions)) if common_conditions else ''

    sql = f"""
        SELECT player_name, opponent_name, result, player_rank, opponent_rank,
               aces, dfs, fwon, swon, firsts, pts, bp_saved, bp_chances,
               tb_won, tb_lost, date, tournament, surface, level, level_name,
               round, score, time, tour, year, is_upset,
               o_aces, o_dfs, o_pts, o_firsts, o_fwon, o_swon, o_saved, o_chances
        FROM (
            SELECT winner_name AS player_name, loser_name AS opponent_name, 'W' AS result,
                   winner_rank AS player_rank, loser_rank AS opponent_rank,
                   winner_aces AS aces, winner_dfs AS dfs, winner_fwon AS fwon,
                   winner_swon AS swon, winner_firsts AS firsts, winner_pts AS pts,
                   winner_saved AS bp_saved, winner_chances AS bp_chances,
                   winner_tb_won AS tb_won, winner_tb_lost AS tb_lost,
                   date, tournament, surface, level, level_name, round, score, time, tour, year, is_upset,
                   loser_aces AS o_aces, loser_dfs AS o_dfs, loser_pts AS o_pts,
                   loser_firsts AS o_firsts, loser_fwon AS o_fwon, loser_swon AS o_swon,
                   loser_saved AS o_saved, loser_chances AS o_chances
            FROM matches_main
            WHERE is_walkover = false
              AND winner_name = $1
              {common_extra}
            UNION ALL
            SELECT loser_name AS player_name, winner_name AS opponent_name, 'L' AS result,
                   loser_rank AS player_rank, winner_rank AS opponent_rank,
                   loser_aces AS aces, loser_dfs AS dfs, loser_fwon AS fwon,
                   loser_swon AS swon, loser_firsts AS firsts, loser_pts AS pts,
                   loser_saved AS bp_saved, loser_chances AS bp_chances,
                   loser_tb_won AS tb_won, loser_tb_lost AS tb_lost,
                   date, tournament, surface, level, level_name, round, score, time, tour, year, is_upset,
                   winner_aces AS o_aces, winner_dfs AS o_dfs, winner_pts AS o_pts,
                   winner_firsts AS o_firsts, winner_fwon AS o_fwon, winner_swon AS o_swon,
                   winner_saved AS o_saved, winner_chances AS o_chances
            FROM matches_main
            WHERE is_walkover = false
              AND loser_name = $1
              {common_extra}
        ) pm
        ORDER BY date DESC,
            CASE round
                WHEN 'F'    THEN 12
                WHEN 'BR'   THEN 11
                WHEN 'SF'   THEN 10
                WHEN 'QF'   THEN 9
                WHEN 'RR'   THEN 8
                WHEN 'R16'  THEN 7
                WHEN 'R32'  THEN 6
                WHEN 'ER'   THEN 5
                WHEN 'R64'  THEN 4
                WHEN 'R128' THEN 3
                WHEN 'Q3'   THEN 2
                WHEN 'Q2'   THEN 1
                WHEN 'Q1'   THEN 0
                ELSE 99
            END DESC
    """
    return con.execute(sql, params).df()


def q_player_matches_with_walkovers(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    surface: Optional[str] = None,
    level: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    tour: Optional[str] = None,
) -> 'pd.DataFrame':
    """Player-perspective matches from matches_main, including walkovers.

    This is used for display-only feeds (e.g. recent tournament timeline).
    Record/stat calculations should continue using q_player_matches().
    """
    conditions: list[str] = []
    params: list = [player_name]
    idx = 2
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

    extra = (' AND ' + ' AND '.join(conditions)) if conditions else ''

    sql = f"""
        SELECT *
        FROM (
            SELECT winner_name AS player_name, loser_name AS opponent_name, 'W' AS result,
                   winner_rank AS player_rank, loser_rank AS opponent_rank,
                   winner_aces AS aces, winner_dfs AS dfs, winner_fwon AS fwon,
                   winner_swon AS swon, winner_firsts AS firsts, winner_pts AS pts,
                   winner_saved AS bp_saved, winner_chances AS bp_chances,
                   winner_tb_won AS tb_won, winner_tb_lost AS tb_lost,
                   loser_aces AS o_aces, loser_dfs AS o_dfs, loser_pts AS o_pts,
                   loser_firsts AS o_firsts, loser_fwon AS o_fwon, loser_swon AS o_swon,
                   loser_saved AS o_saved, loser_chances AS o_chances,
                   date, tournament, surface, level, level_name, round, score, time, tour, year, is_upset
            FROM matches_main
            WHERE winner_name = $1 {extra}
            UNION ALL
            SELECT loser_name AS player_name, winner_name AS opponent_name, 'L' AS result,
                   loser_rank AS player_rank, winner_rank AS opponent_rank,
                   loser_aces AS aces, loser_dfs AS dfs, loser_fwon AS fwon,
                   loser_swon AS swon, loser_firsts AS firsts, loser_pts AS pts,
                   loser_saved AS bp_saved, loser_chances AS bp_chances,
                   loser_tb_won AS tb_won, loser_tb_lost AS tb_lost,
                   winner_aces AS o_aces, winner_dfs AS o_dfs, winner_pts AS o_pts,
                   winner_firsts AS o_firsts, winner_fwon AS o_fwon, winner_swon AS o_swon,
                   winner_saved AS o_saved, winner_chances AS o_chances,
                   date, tournament, surface, level, level_name, round, score, time, tour, year, is_upset
            FROM matches_main
            WHERE loser_name = $1 {extra}
        ) pm
        ORDER BY date DESC,
            CASE round
                WHEN 'F'    THEN 12
                WHEN 'BR'   THEN 11
                WHEN 'SF'   THEN 10
                WHEN 'QF'   THEN 9
                WHEN 'RR'   THEN 8
                WHEN 'R16'  THEN 7
                WHEN 'R32'  THEN 6
                WHEN 'ER'   THEN 5
                WHEN 'R64'  THEN 4
                WHEN 'R128' THEN 3
                WHEN 'Q3'   THEN 2
                WHEN 'Q2'   THEN 1
                WHEN 'Q1'   THEN 0
                ELSE 99
            END DESC
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 3. Tournament recap query
# ---------------------------------------------------------------------------

def q_player_milestones(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
) -> dict:
    """Career milestones: first top-100/50/20/10, first title, first tour title."""
    tour_lvl = f"({_TOUR_LEVELS})"
    sql = f"""
    WITH top_entries AS (
        SELECT
            MIN(date) FILTER (WHERE player_rank <= 100) AS first_top100,
            MIN(date) FILTER (WHERE player_rank <= 50) AS first_top50,
            MIN(date) FILTER (WHERE player_rank <= 20) AS first_top20,
            MIN(date) FILTER (WHERE player_rank <= 10) AS first_top10
        FROM player_match_view
        WHERE player_name = $1
          AND ($2 IS NULL OR tour = $2)
    ),
    first_title AS (
        SELECT MIN(date) AS first_title_date,
               FIRST(tournament ORDER BY date) AS first_title_tournament
        FROM matches_main
        WHERE winner_name = $1
          AND round = 'F'
          AND ($2 IS NULL OR tour = $2)
    ),
    first_tour_title AS (
        SELECT MIN(date) AS first_tour_title_date,
               FIRST(tournament ORDER BY date) AS first_tour_title_tournament
        FROM matches_main
        WHERE winner_name = $1
          AND round = 'F'
          AND level_name IN {tour_lvl}
          AND ($2 IS NULL OR tour = $2)
    )
    SELECT
        te.first_top100,
        te.first_top50,
        te.first_top20,
        te.first_top10,
        ft.first_title_date,
        ft.first_title_tournament,
        ftt.first_tour_title_date,
        ftt.first_tour_title_tournament
    FROM top_entries te
    LEFT JOIN first_title ft ON true
    LEFT JOIN first_tour_title ftt ON true
    """
    row = con.execute(sql, [player_name, tour]).fetchone()
    if not row:
        return {}

    def fmt_date(d):
        return str(d)[:10] if d else None

    return {
        'first_top100': fmt_date(row[0]),
        'first_top50': fmt_date(row[1]),
        'first_top20': fmt_date(row[2]),
        'first_top10': fmt_date(row[3]),
        'first_title_date': fmt_date(row[4]),
        'first_title_tournament': row[5],
        'first_tour_title_date': fmt_date(row[6]),
        'first_tour_title_tournament': row[7],
    }


# ---------------------------------------------------------------------------
# Similar players (Euclidean distance on normalized serve stats)
# ---------------------------------------------------------------------------

def q_similar_players(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    min_matches: int = 50,
) -> 'pd.DataFrame':
    """Top 5 players with most similar serve profile."""
    sql = """
    WITH player_stats AS (
        SELECT player_name, tour,
               COUNT(*) AS n_matches,
               100.0 * SUM(aces)     / NULLIF(SUM(pts), 0)                AS ace_pct,
               100.0 * SUM(firsts)   / NULLIF(SUM(pts), 0)                AS first_in_pct,
               100.0 * SUM(fwon)     / NULLIF(SUM(firsts), 0)             AS first_win_pct,
               100.0 * SUM(swon)     / NULLIF(SUM(pts) - SUM(firsts), 0)  AS second_win_pct,
               100.0 * SUM(bp_saved) / NULLIF(SUM(bp_chances), 0)         AS bp_saved_pct
        FROM player_match_view
        WHERE pts IS NOT NULL
          AND ($2 IS NULL OR tour = $2)
        GROUP BY player_name, tour
        HAVING COUNT(*) >= $3
    ),
    target AS (
        SELECT * FROM player_stats WHERE player_name = $1
    ),
    stat_range AS (
        SELECT
            MAX(ace_pct) - MIN(ace_pct) AS r_ace,
            MAX(first_in_pct) - MIN(first_in_pct) AS r_first_in,
            MAX(first_win_pct) - MIN(first_win_pct) AS r_first_win,
            MAX(second_win_pct) - MIN(second_win_pct) AS r_second_win,
            MAX(bp_saved_pct) - MIN(bp_saved_pct) AS r_bp_saved
        FROM player_stats
    )
    SELECT p.player_name, p.tour, p.n_matches,
           ROUND(p.ace_pct, 1) AS ace_pct,
           ROUND(p.first_in_pct, 1) AS first_in_pct,
           ROUND(p.first_win_pct, 1) AS first_win_pct,
           ROUND(p.second_win_pct, 1) AS second_win_pct,
           ROUND(p.bp_saved_pct, 1) AS bp_saved_pct,
           ROUND(SQRT(
               POWER((p.ace_pct - t.ace_pct) / NULLIF(sr.r_ace, 0), 2) +
               POWER((p.first_in_pct - t.first_in_pct) / NULLIF(sr.r_first_in, 0), 2) +
               POWER((p.first_win_pct - t.first_win_pct) / NULLIF(sr.r_first_win, 0), 2) +
               POWER((p.second_win_pct - t.second_win_pct) / NULLIF(sr.r_second_win, 0), 2) +
               POWER((p.bp_saved_pct - t.bp_saved_pct) / NULLIF(sr.r_bp_saved, 0), 2)
           ), 4) AS distance
    FROM player_stats p, target t, stat_range sr
    WHERE p.player_name != $1
      AND p.ace_pct IS NOT NULL
      AND p.first_in_pct IS NOT NULL
      AND p.first_win_pct IS NOT NULL
      AND p.second_win_pct IS NOT NULL
      AND p.bp_saved_pct IS NOT NULL
    ORDER BY distance ASC
    LIMIT 5
    """
    return con.execute(sql, [player_name, tour, min_matches]).df()


# ---------------------------------------------------------------------------
# Similar players — return profile (1st/2nd return win%, BP converted%)
# ---------------------------------------------------------------------------

def q_similar_players_return(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    min_matches: int = 50,
) -> 'pd.DataFrame':
    """Top 5 players with most similar return profile."""
    sql = """
    WITH opp_raw AS (
        SELECT winner_name AS player_name, tour,
               loser_firsts AS opp_firsts, loser_fwon AS opp_fwon,
               loser_swon AS opp_swon, loser_pts AS opp_pts,
               loser_chances AS opp_bp_chances, loser_saved AS opp_bp_saved
        FROM matches_main
        WHERE winner_pts IS NOT NULL AND is_walkover = false
          AND ($2 IS NULL OR tour = $2)
        UNION ALL
        SELECT loser_name, tour,
               winner_firsts, winner_fwon, winner_swon, winner_pts,
               winner_chances, winner_saved
        FROM matches_main
        WHERE winner_pts IS NOT NULL AND is_walkover = false
          AND ($2 IS NULL OR tour = $2)
    ),
    player_stats AS (
        SELECT player_name, tour,
               COUNT(*) AS n_matches,
               100.0 * SUM(opp_firsts - opp_fwon) / NULLIF(SUM(opp_firsts), 0) AS first_return_win_pct,
               100.0 * SUM((opp_pts - opp_firsts) - opp_swon) / NULLIF(SUM(opp_pts - opp_firsts), 0) AS second_return_win_pct,
               100.0 * SUM(opp_bp_chances - opp_bp_saved) / NULLIF(SUM(opp_bp_chances), 0) AS bp_converted_pct
        FROM opp_raw
        GROUP BY player_name, tour
        HAVING COUNT(*) >= $3
    ),
    target AS (
        SELECT * FROM player_stats WHERE player_name = $1
    ),
    stat_range AS (
        SELECT
            MAX(first_return_win_pct) - MIN(first_return_win_pct) AS r_first_ret,
            MAX(second_return_win_pct) - MIN(second_return_win_pct) AS r_second_ret,
            MAX(bp_converted_pct) - MIN(bp_converted_pct) AS r_bp_conv
        FROM player_stats
    )
    SELECT p.player_name, p.tour, p.n_matches,
           ROUND(p.first_return_win_pct, 1) AS first_return_win_pct,
           ROUND(p.second_return_win_pct, 1) AS second_return_win_pct,
           ROUND(p.bp_converted_pct, 1) AS bp_converted_pct,
           ROUND(SQRT(
               POWER((p.first_return_win_pct - t.first_return_win_pct) / NULLIF(sr.r_first_ret, 0), 2) +
               POWER((p.second_return_win_pct - t.second_return_win_pct) / NULLIF(sr.r_second_ret, 0), 2) +
               POWER((p.bp_converted_pct - t.bp_converted_pct) / NULLIF(sr.r_bp_conv, 0), 2)
           ), 4) AS distance
    FROM player_stats p, target t, stat_range sr
    WHERE p.player_name != $1
      AND p.first_return_win_pct IS NOT NULL
      AND p.second_return_win_pct IS NOT NULL
      AND p.bp_converted_pct IS NOT NULL
    ORDER BY distance ASC
    LIMIT 5
    """
    return con.execute(sql, [player_name, tour, min_matches]).df()


# ---------------------------------------------------------------------------
# Streaks leaders (longest win streaks using island-gap technique)
# ---------------------------------------------------------------------------

def q_player_summary(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    surface: Optional[str] = None,
) -> dict:
    # Team-event exclusion condition (without leading AND, for use in FILTER clauses)
    _TEAM_COND = """
        tournament NOT ILIKE '%Davis%'
        AND tournament NOT ILIKE '%Atp Cup%'
        AND tournament NOT ILIKE '%United Cup%'
        AND tournament NOT ILIKE '%Fed Cup%'
        AND tournament NOT ILIKE '%BJK Cup%'
        AND tournament NOT ILIKE '%Hopman%'
        AND tournament NOT ILIKE '%Laver Cup%'
    """

    # Single CTE query replacing 5 sequential round-trips
    sql = f"""
    WITH wl AS (
        SELECT
            COUNT(*)                                     AS total_matches,
            SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) AS losses,
            MIN(player_rank)                             AS career_high_rank
        FROM player_match_view
        WHERE player_name = $1
          AND ($2 IS NULL OR tour = $2)
          AND ($3 IS NULL OR year >= $3)
          AND ($4 IS NULL OR year <= $4)
    ),
    player_ref AS (
        SELECT country, birthdate, hand, height
        FROM players
        WHERE name = $1
          AND ($2 IS NULL OR tour = $2)
        ORDER BY historically_ranked DESC, current_rank ASC NULLS LAST
        LIMIT 1
    ),
    titles AS (
        SELECT
            COUNT(*) FILTER (WHERE level = 'G')  AS gs_titles,
            COUNT(*) FILTER (WHERE level_name IN (
                'Masters 1000', 'ATP 250/500',
                'WTA 500', 'WTA 250', 'Tour Finals', 'Olympics', 'WTA'
            ) AND {_TEAM_COND})                  AS tour_titles,
            COUNT(*) FILTER (WHERE level_name = 'Challenger') AS challenger_titles,
            COUNT(*) FILTER (WHERE level_name = 'ITF')        AS itf_titles
        FROM matches_main
        WHERE winner_name = $1 AND round = 'F'
          AND ($2 IS NULL OR tour = $2)
          AND ($3 IS NULL OR year >= $3)
          AND ($4 IS NULL OR year <= $4)
          AND ($5 IS NULL OR surface = $5)
    )
    SELECT wl.*, player_ref.country, player_ref.birthdate, player_ref.hand, player_ref.height, titles.*
    FROM wl
    LEFT JOIN player_ref ON TRUE
    CROSS JOIN titles
    """

    row = con.execute(sql, [player_name, tour, year_min, year_max, surface]).fetchone()
    if not row or row[0] is None:
        return {}

    career_high = row[3]
    birthdate = row[5]
    age = None
    if birthdate:
        try:
            today = date.today()
            age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        except Exception:
            age = None
    return {
        'total':             row[0] or 0,
        'wins':              row[1] or 0,
        'losses':            row[2] or 0,
        'career_high_rank':  int(career_high) if career_high else None,
        'country':           row[4],
        'birthdate':         birthdate.isoformat() if birthdate else None,
        'age':               age,
        'hand':              row[6],
        'height':            row[7],
        'gs_titles':         row[8] or 0,
        'tour_titles':       row[9] or 0,
        'challenger_titles': row[10] or 0,
        'itf_titles':        row[11] or 0,
    }


# ---------------------------------------------------------------------------
# 7. Aggregated serve stats (sum-then-divide, per mod.py logic)
# ---------------------------------------------------------------------------

def q_player_serve_stats(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
) -> dict:
    base_conditions = ["player_name = $1"]
    params: list = [player_name]
    idx = 2
    if tour:
        base_conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if surface:
        base_conditions.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if year_min:
        base_conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        base_conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1

    base_where = _where(base_conditions)

    serve_sql = f"""
        SELECT
            SUM(pts)        AS total_pts,
            SUM(aces)       AS total_aces,
            SUM(dfs)        AS total_dfs,
            SUM(firsts)     AS total_firsts,
            SUM(fwon)       AS total_fwon,
            SUM(swon)       AS total_swon,
            SUM(bp_saved)   AS total_bp_saved,
            SUM(bp_chances) AS total_bp_chances,
            COUNT(*)        AS matches_with_stats
        FROM player_match_view
        {base_where} AND pts IS NOT NULL
    """

    tb_sql = f"""
        SELECT SUM(tb_won), SUM(tb_lost)
        FROM player_match_view
        {base_where}
    """

    serve_row = con.execute(serve_sql, params).fetchone()
    tb_row    = con.execute(tb_sql,    params).fetchone()

    if not serve_row or not serve_row[0]:
        return {}

    pts, aces, dfs, firsts, fwon, swon, bp_saved, bp_chances, n = serve_row
    tb_won  = tb_row[0] or 0 if tb_row else 0
    tb_lost = tb_row[1] or 0 if tb_row else 0
    second_serves = (pts or 0) - (firsts or 0)

    def pct(num, den):
        return round(100.0 * num / den, 1) if den and den > 0 else None

    return {
        'matches_with_stats': n,
        'ace%':      pct(aces, pts),
        'df%':       pct(dfs, pts),
        '1st_in%':   pct(firsts, pts),
        '1st_win%':  pct(fwon, firsts),
        '2nd_win%':  pct(swon, second_serves),
        'bp_saved%': pct(bp_saved, bp_chances),
        'tb_won':    int(tb_won),
        'tb_lost':   int(tb_lost),
        'tb_W-L':    f"{int(tb_won)}-{int(tb_lost)}",
        'tb_win%':   pct(tb_won, tb_won + tb_lost),
    }


# ---------------------------------------------------------------------------
# 7b. Aggregated return stats
# ---------------------------------------------------------------------------

def q_player_return_stats(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
) -> dict:
    """Return stats from opponent's serve perspective."""
    extra_conds: list[str] = []
    params: list = [player_name]
    idx = 2
    if tour:
        extra_conds.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if surface:
        extra_conds.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if year_min:
        extra_conds.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        extra_conds.append(f"year <= ${idx}"); params.append(year_max); idx += 1

    extra = (' AND ' + ' AND '.join(extra_conds)) if extra_conds else ''

    sql = f"""
        WITH opp AS (
            SELECT loser_pts AS opp_pts, loser_firsts AS opp_firsts,
                   loser_fwon AS opp_fwon, loser_swon AS opp_swon,
                   loser_chances AS opp_chances, loser_saved AS opp_saved
            FROM matches_main
            WHERE winner_name = $1 AND winner_pts IS NOT NULL {extra}
            UNION ALL
            SELECT winner_pts, winner_firsts, winner_fwon, winner_swon,
                   winner_chances, winner_saved
            FROM matches_main
            WHERE loser_name = $1 AND winner_pts IS NOT NULL {extra}
        )
        SELECT
            SUM(opp_pts)                         AS total_opp_pts,
            SUM(opp_firsts)                      AS total_opp_firsts,
            SUM(opp_fwon)                        AS total_opp_fwon,
            SUM(opp_swon)                        AS total_opp_swon,
            SUM(opp_pts - opp_firsts)            AS total_opp_seconds,
            SUM(opp_chances)                     AS total_opp_chances,
            SUM(opp_saved)                       AS total_opp_saved,
            COUNT(*)                             AS matches
        FROM opp
    """

    row = con.execute(sql, params).fetchone()

    if not row or not row[0]:
        return {}

    opp_pts, opp_firsts, opp_fwon, opp_swon, opp_seconds, opp_chances, opp_saved, n = row

    def pct(num, den):
        return round(100.0 * num / den, 1) if den and den > 0 else None

    return {
        'matches_with_stats': n,
        '1st_return_win%':   pct((opp_firsts or 0) - (opp_fwon or 0), opp_firsts),
        '2nd_return_win%':   pct((opp_seconds or 0) - (opp_swon or 0), opp_seconds),
        'bp_converted%':     pct((opp_chances or 0) - (opp_saved or 0), opp_chances),
    }


# ---------------------------------------------------------------------------
# 7c. Serve/return percentiles vs. tour
# ---------------------------------------------------------------------------

_SERVE_PERCENTILE_MIN_MATCHES = 20


def q_player_serve_percentiles(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: str,
) -> dict:
    """Percentile rank (0-100) for this player's serve metrics vs all tour players
    with at least _SERVE_PERCENTILE_MIN_MATCHES of stat-bearing matches."""
    sql = """
        WITH per_player AS (
            SELECT
                player_name,
                SUM(pts)        AS total_pts,
                SUM(aces)       AS total_aces,
                SUM(dfs)        AS total_dfs,
                SUM(firsts)     AS total_firsts,
                SUM(fwon)       AS total_fwon,
                SUM(swon)       AS total_swon,
                SUM(bp_saved)   AS total_bp_saved,
                SUM(bp_chances) AS total_bp_chances,
                SUM(tb_won)     AS total_tb_won,
                SUM(tb_lost)    AS total_tb_lost,
                COUNT(*)        AS n
            FROM player_match_view
            WHERE pts IS NOT NULL AND tour = $1
            GROUP BY player_name
            HAVING n >= $2
        ),
        rates AS (
            SELECT
                player_name,
                CASE WHEN total_pts > 0 THEN total_aces * 1.0 / total_pts END AS ace_rate,
                CASE WHEN total_pts > 0 THEN total_firsts * 1.0 / total_pts END AS first_in_rate,
                CASE WHEN total_firsts > 0 THEN total_fwon * 1.0 / total_firsts END AS first_win_rate,
                CASE WHEN (total_pts - total_firsts) > 0 THEN total_swon * 1.0 / (total_pts - total_firsts) END AS second_win_rate,
                CASE WHEN total_bp_chances > 0 THEN total_bp_saved * 1.0 / total_bp_chances END AS bp_saved_rate,
                CASE WHEN (total_tb_won + total_tb_lost) > 0 THEN total_tb_won * 1.0 / (total_tb_won + total_tb_lost) END AS tb_win_rate
            FROM per_player
        ),
        ranked AS (
            SELECT
                player_name,
                PERCENT_RANK() OVER (ORDER BY ace_rate) * 100        AS ace_pct,
                PERCENT_RANK() OVER (ORDER BY first_in_rate) * 100   AS first_in_pct,
                PERCENT_RANK() OVER (ORDER BY first_win_rate) * 100  AS first_win_pct,
                PERCENT_RANK() OVER (ORDER BY second_win_rate) * 100 AS second_win_pct,
                PERCENT_RANK() OVER (ORDER BY bp_saved_rate) * 100   AS bp_saved_pct,
                PERCENT_RANK() OVER (ORDER BY tb_win_rate) * 100     AS tb_win_pct,
                COUNT(*) OVER ()                                      AS tour_size
            FROM rates
        )
        SELECT * FROM ranked WHERE player_name = $3
    """
    row = con.execute(sql, [tour, _SERVE_PERCENTILE_MIN_MATCHES, player_name]).fetchone()
    if not row:
        return {}

    def r(v):
        return round(float(v), 1) if v is not None else None

    return {
        'ace%':      r(row[1]),
        '1st_in%':   r(row[2]),
        '1st_win%':  r(row[3]),
        '2nd_win%':  r(row[4]),
        'bp_saved%': r(row[5]),
        'tb_win%':   r(row[6]),
        'tour_size': int(row[7]) if row[7] is not None else 0,
    }


def q_player_return_percentiles(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: str,
) -> dict:
    """Percentile rank (0-100) for this player's return metrics vs all tour players
    with at least _SERVE_PERCENTILE_MIN_MATCHES stat-bearing matches."""
    sql = """
        WITH opp AS (
            SELECT
                winner_name AS player_name,
                loser_pts     AS opp_pts,
                loser_firsts  AS opp_firsts,
                loser_fwon    AS opp_fwon,
                loser_swon    AS opp_swon,
                loser_chances AS opp_chances,
                loser_saved   AS opp_saved,
                tour
            FROM matches_main
            WHERE winner_pts IS NOT NULL
            UNION ALL
            SELECT
                loser_name,
                winner_pts, winner_firsts, winner_fwon, winner_swon,
                winner_chances, winner_saved, tour
            FROM matches_main
            WHERE winner_pts IS NOT NULL
        ),
        per_player AS (
            SELECT
                player_name,
                SUM(opp_firsts)               AS total_opp_firsts,
                SUM(opp_fwon)                 AS total_opp_fwon,
                SUM(opp_pts - opp_firsts)     AS total_opp_seconds,
                SUM(opp_swon)                 AS total_opp_swon,
                SUM(opp_chances)              AS total_opp_chances,
                SUM(opp_saved)                AS total_opp_saved,
                COUNT(*)                       AS n
            FROM opp
            WHERE tour = $1
            GROUP BY player_name
            HAVING n >= $2
        ),
        rates AS (
            SELECT
                player_name,
                CASE WHEN total_opp_firsts > 0
                     THEN (total_opp_firsts - total_opp_fwon) * 1.0 / total_opp_firsts END AS r1_rate,
                CASE WHEN total_opp_seconds > 0
                     THEN (total_opp_seconds - total_opp_swon) * 1.0 / total_opp_seconds END AS r2_rate,
                CASE WHEN total_opp_chances > 0
                     THEN (total_opp_chances - total_opp_saved) * 1.0 / total_opp_chances END AS bpc_rate
            FROM per_player
        ),
        ranked AS (
            SELECT
                player_name,
                PERCENT_RANK() OVER (ORDER BY r1_rate) * 100  AS first_return_win_pct,
                PERCENT_RANK() OVER (ORDER BY r2_rate) * 100  AS second_return_win_pct,
                PERCENT_RANK() OVER (ORDER BY bpc_rate) * 100 AS bp_converted_pct,
                COUNT(*) OVER ()                               AS tour_size
            FROM rates
        )
        SELECT * FROM ranked WHERE player_name = $3
    """
    row = con.execute(sql, [tour, _SERVE_PERCENTILE_MIN_MATCHES, player_name]).fetchone()
    if not row:
        return {}

    def r(v):
        return round(float(v), 1) if v is not None else None

    return {
        '1st_return_win%': r(row[1]),
        '2nd_return_win%': r(row[2]),
        'bp_converted%':   r(row[3]),
        'tour_size':       int(row[4]) if row[4] is not None else 0,
    }


# ---------------------------------------------------------------------------
# 8. Top-N opponent records (per mod.py logic)
# ---------------------------------------------------------------------------

def q_top_n_records(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    level: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    top_n_brackets: tuple = (5, 10, 20, 50, 100),
) -> dict:
    """Win-loss record vs. top-N ranked opponents."""
    conditions = ["player_name = $1", "opponent_rank IS NOT NULL"]
    params: list = [player_name]
    idx = 2
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
        SELECT opponent_rank, result
        FROM player_match_view
        {_where(conditions)}
    """
    df = con.execute(sql, params).df()
    if df.empty:
        return {}

    result = {}
    for n in top_n_brackets:
        sub = df[df['opponent_rank'] <= n]
        wins = int((sub['result'] == 'W').sum())
        losses = int((sub['result'] == 'L').sum())
        total = wins + losses
        result[f'top{n}'] = {
            'W-L': f'{wins}-{losses}',
            'win%': round(wins / total * 100, 1) if total > 0 else 0.0,
        }
    return result


# ---------------------------------------------------------------------------
# 14. Rank history (date → rank, for chart)
# ---------------------------------------------------------------------------

def q_player_rank_history(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
) -> 'pd.DataFrame':
    conditions = ["player_name = $1", "player_rank IS NOT NULL"]
    params: list = [player_name]
    idx = 2
    if tour:
        conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if year_min:
        conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1
    sql = f"""
        SELECT date, MIN(player_rank) AS rank
        FROM player_match_view
        {_where(conditions)}
        GROUP BY date
        ORDER BY date
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 15. Surface × Level win% heatmap
# ---------------------------------------------------------------------------

def q_surface_level_heatmap(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
) -> 'pd.DataFrame':
    conditions = ["player_name = $1"]
    params: list = [player_name]
    idx = 2
    if tour:
        conditions.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if year_min:
        conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1
    sql = f"""
        SELECT surface, level_name,
               SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
               COUNT(*) AS total,
               ROUND(100.0 * SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct
        FROM player_match_view
        {_where(conditions)}
        GROUP BY surface, level_name
        HAVING COUNT(*) >= 5
        ORDER BY surface, level_name
    """
    return con.execute(sql, params).df()


# ---------------------------------------------------------------------------
# 16. Meta stats (home page counts)
# ---------------------------------------------------------------------------

def q_player_form(
    con: duckdb.DuckDBPyConnection,
    player_name: str,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    level: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
) -> dict:
    from datetime import timedelta

    _empty = {
        'last10': {'wins': 0, 'losses': 0},
        'last20': {'wins': 0, 'losses': 0},
        'last52w': {'wins': 0, 'losses': 0, 'win_pct': None},
        'top_wins_recent': [],
        'upset_losses_recent': [],
    }

    # Build dynamic filter clause
    conditions = ["player_name = $1", "($2 IS NULL OR tour = $2)"]
    params: list = [player_name, tour]
    idx = 3
    if surface:
        conditions.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if level:
        idx = _level_condition(level, conditions, params, idx)
    if year_min:
        conditions.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conditions.append(f"year <= ${idx}"); params.append(year_max); idx += 1

    where = _where(conditions)
    # Extra conditions (without WHERE keyword) for appending with AND
    extra = ' AND '.join(conditions)

    _ROUND_ORDER = """
        CASE round
            WHEN 'F'    THEN 12 WHEN 'BR'   THEN 11 WHEN 'SF'   THEN 10
            WHEN 'QF'   THEN 9  WHEN 'RR'   THEN 8  WHEN 'R16'  THEN 7
            WHEN 'R32'  THEN 6  WHEN 'ER'   THEN 5  WHEN 'R64'  THEN 4
            WHEN 'R128' THEN 3  WHEN 'Q3'   THEN 2  WHEN 'Q2'   THEN 1
            WHEN 'Q1'   THEN 0  ELSE 99
        END DESC
    """

    # Use a CTE for max_date so we only need one set of params
    recent_df = con.execute(f"""
        SELECT date, opponent_name, opponent_rank, tournament, surface, round, result, tour, score
        FROM player_match_view
        {where}
        ORDER BY date DESC, {_ROUND_ORDER}
    """, params).df()

    if recent_df.empty:
        return _empty

    def wl_dict(df):
        wins = int((df['result'] == 'W').sum()) if not df.empty else 0
        losses = int((df['result'] == 'L').sum()) if not df.empty else 0
        total = wins + losses
        return {'wins': wins, 'losses': losses, 'win_pct': round(100.0 * wins / total, 1) if total else None}

    recent_df = recent_df.copy()
    recent_df['date'] = recent_df['date'].astype(str).str.slice(0, 10)

    # 52-week window relative to latest match in filtered set
    latest_date = con.execute(f"SELECT MAX(date) FROM player_match_view {where}", params).fetchone()[0]
    if latest_date:
        cutoff = str(latest_date - timedelta(days=364))[:10]
        recent52_df = recent_df[recent_df['date'] >= cutoff]
    else:
        recent52_df = recent_df.head(0)

    # Top-50 wins — use CTE for max_date to avoid param duplication
    top_wins_df = con.execute(f"""
        WITH _md AS (SELECT MAX(date) AS md FROM player_match_view {where})
        SELECT date, opponent_name, opponent_rank, tournament, surface, round
        FROM player_match_view, _md
        {where}
          AND result = 'W'
          AND opponent_rank IS NOT NULL
          AND opponent_rank <= 50
          AND date >= _md.md - INTERVAL '26 weeks'
        ORDER BY date DESC, opponent_rank ASC
        LIMIT 5
    """, params).df()

    # Upset losses — use CTE for max_date, join with matches_main for is_upset
    # Build pm-prefixed conditions for the join query
    pm_conds_str = extra.replace('player_name', 'pm.player_name') \
                        .replace('tour =', 'pm.tour =').replace('tour)', 'pm.tour)') \
                        .replace('surface =', 'pm.surface =') \
                        .replace('year >=', 'pm.year >=').replace('year <=', 'pm.year <=')
    # Fix level_name references
    pm_conds_str = pm_conds_str.replace('level_name', 'pm.level_name') \
                               .replace('round NOT', 'pm.round NOT').replace('round IN', 'pm.round IN')

    upset_losses_df = con.execute(f"""
        WITH _md AS (SELECT MAX(date) AS md FROM player_match_view {where})
        SELECT pm.date, pm.opponent_name, pm.opponent_rank, pm.tournament, pm.surface, pm.round
        FROM player_match_view pm
        JOIN matches_main mm
          ON pm.date = mm.date
         AND pm.tournament = mm.tournament
         AND pm.round = mm.round
         AND ((pm.player_name = mm.winner_name AND pm.opponent_name = mm.loser_name)
              OR (pm.player_name = mm.loser_name AND pm.opponent_name = mm.winner_name)),
        _md
        WHERE {pm_conds_str}
          AND pm.result = 'L'
          AND mm.is_upset = true
          AND pm.date >= _md.md - INTERVAL '26 weeks'
        ORDER BY pm.date DESC
        LIMIT 5
    """, params).df()

    return {
        'last10': wl_dict(recent_df.head(10)),
        'last20': wl_dict(recent_df.head(20)),
        'last52w': wl_dict(recent52_df),
        'top_wins_recent': top_wins_df.assign(date=top_wins_df['date'].astype(str).str.slice(0, 10)).to_dict(orient='records') if not top_wins_df.empty else [],
        'upset_losses_recent': upset_losses_df.assign(date=upset_losses_df['date'].astype(str).str.slice(0, 10)).to_dict(orient='records') if not upset_losses_df.empty else [],
    }
