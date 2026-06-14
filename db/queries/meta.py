"""Metadata and homepage query builders."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _DEFAULT_YEAR_MAX, _DEFAULT_YEAR_MIN, _TOUR_LEVELS

def q_all_player_names(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
) -> list[str]:
    if tour:
        sql = "SELECT DISTINCT player_name FROM player_match_view WHERE tour = $1 ORDER BY player_name"
        rows = con.execute(sql, [tour]).fetchall()
    else:
        sql = "SELECT DISTINCT player_name FROM player_match_view ORDER BY player_name"
        rows = con.execute(sql).fetchall()
    return [r[0] for r in rows if r[0]]


def q_all_tournaments(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
) -> list[str]:
    if tour:
        sql = "SELECT DISTINCT tournament FROM matches_main WHERE tour = $1 ORDER BY tournament"
        rows = con.execute(sql, [tour]).fetchall()
    else:
        sql = "SELECT DISTINCT tournament FROM matches_main ORDER BY tournament"
        rows = con.execute(sql).fetchall()
    return [r[0] for r in rows if r[0]]


def q_all_countries(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
) -> list[dict]:
    """Distinct player countries (3-letter ISO codes) with player counts."""
    if tour:
        sql = (
            "SELECT country, COUNT(*) AS players FROM players "
            "WHERE country IS NOT NULL AND tour = $1 "
            "GROUP BY country ORDER BY players DESC, country"
        )
        rows = con.execute(sql, [tour]).fetchall()
    else:
        sql = (
            "SELECT country, COUNT(*) AS players FROM players "
            "WHERE country IS NOT NULL "
            "GROUP BY country ORDER BY players DESC, country"
        )
        rows = con.execute(sql).fetchall()
    return [{"country": r[0], "players": int(r[1])} for r in rows if r[0]]


def q_year_range(con: duckdb.DuckDBPyConnection) -> tuple[int, int]:
    row = con.execute("SELECT MIN(year), MAX(year) FROM matches_main").fetchone()
    if not row:
        return (_DEFAULT_YEAR_MIN, _DEFAULT_YEAR_MAX)
    return (int(row[0] or _DEFAULT_YEAR_MIN), int(row[1] or _DEFAULT_YEAR_MAX))


# Team events excluded from title count
# ---------------------------------------------------------------------------
# Helpers for stat-leaders queries
# ---------------------------------------------------------------------------

def q_meta_stats(con: duckdb.DuckDBPyConnection) -> dict:
    row = con.execute("""
        SELECT COUNT(*)                                        AS total_matches,
               MIN(year)                                       AS year_min,
               MAX(year)                                       AS year_max,
               SUM(CASE WHEN is_upset THEN 1 ELSE 0 END)      AS total_upsets,
               COUNT(DISTINCT tournament)                      AS total_tournaments,
               MAX(date)                                       AS data_through,
               SUM(COALESCE(winner_pts, 0) + COALESCE(loser_pts, 0)) AS total_points_played
        FROM matches_main
    """).fetchone()
    player_count = con.execute(
        "SELECT COUNT(DISTINCT player_name) FROM player_match_view"
    ).fetchone()[0]
    return {
        'total_matches':      int(row[0] or 0),
        'year_min':           int(row[1] or _DEFAULT_YEAR_MIN),
        'year_max':           int(row[2] or _DEFAULT_YEAR_MAX),
        'total_upsets':       int(row[3] or 0),
        'total_tournaments':  int(row[4] or 0),
        'total_players':      int(player_count or 0),
        'data_through':       str(row[5]) if row[5] else None,
        'total_points_played': int(round(row[6] or 0)),
    }


# ---------------------------------------------------------------------------
# 17. Recent upsets (home page feed) — main tour, main draw, dramatic only
# ---------------------------------------------------------------------------

def q_recent_upsets(
    con: duckdb.DuckDBPyConnection,
    tour: Optional[str] = None,
    limit: int = 8,
) -> 'pd.DataFrame':
    tour_lvl = f"({_TOUR_LEVELS})"
    sql = f"""
        SELECT date, tournament, round, level_name,
               winner_name, winner_rank, loser_name, loser_rank, score, tour, rank_diff
        FROM matches_main
        WHERE is_upset = true
          AND ($1 IS NULL OR tour = $1)
          AND (
            (level_name IN {tour_lvl}
             AND round NOT IN ('Q1', 'Q2', 'Q3', 'ER')
             AND rank_diff > 40)
            OR
            (level_name IN {tour_lvl}
             AND round IN ('Q1', 'Q2', 'Q3', 'ER')
             AND rank_diff > 200)
            OR
            (level_name = 'Challenger'
             AND round NOT IN ('Q1', 'Q2', 'Q3', 'ER')
             AND rank_diff > 200)
          )
        ORDER BY date DESC,
                 CASE round
                    WHEN 'F'    THEN 12
                    WHEN 'BR'   THEN 11
                    WHEN 'SF'   THEN 10
                    WHEN 'QF'   THEN 9
                    WHEN 'RR'   THEN 8
                    WHEN 'R16'  THEN 7
                    WHEN 'R32'  THEN 6
                    WHEN 'R64'  THEN 5
                    WHEN 'R128' THEN 4
                    WHEN 'Q3'   THEN 3
                    WHEN 'Q2'   THEN 2
                    WHEN 'Q1'   THEN 1
                    ELSE 0
                 END DESC,
                 rank_diff DESC
        LIMIT $2
    """
    return con.execute(sql, [tour, limit]).df()


# ---------------------------------------------------------------------------
# 18. Recent champions (home page + tournament page default list)
# ---------------------------------------------------------------------------

def q_storylines(
    con: duckdb.DuckDBPyConnection,
    limit: int = 6,
) -> list[dict]:
    stories: list[dict] = []

    hot = con.execute("""
        SELECT player_name, tour,
               SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
               COUNT(*) AS total,
               ROUND(100.0 * SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct
        FROM player_match_view
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY player_name, tour
        HAVING COUNT(*) >= 5
        ORDER BY win_pct DESC, wins DESC
        LIMIT 1
    """).fetchone()
    if hot:
        stories.append({
            'type': 'hot_player',
            'headline': f"{hot[0]} is on a tear",
            'detail': f"{hot[1] == 'M' and 'ATP' or 'WTA'} form: {int(hot[2])}-{int(hot[3] - hot[2])} in the last 30 days.",
            'player_name': hot[0],
            'tour': hot[1],
            'value': f"{hot[4]}%",
            'link': f"/player?p={hot[0]}&tour={hot[1]}",
        })

    upset = con.execute("""
        SELECT winner_name, winner_rank, loser_name, loser_rank, tournament, round, date, tour, rank_diff
        FROM matches_main
        WHERE is_upset = true
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY rank_diff DESC
        LIMIT 1
    """).fetchone()
    if upset:
        stories.append({
            'type': 'biggest_upset',
            'headline': f"{upset[0]} delivered the biggest recent upset",
            'detail': f"Beat {upset[2]} in {upset[4]} ({upset[5]}).",
            'player_name': upset[0],
            'tour': upset[7],
            'value': f"Δ{int(round(upset[8] or 0))}",
            'link': f"/search?tour={upset[7]}&upsets_only=true",
        })

    active = con.execute("""
        SELECT player_name, tour, COUNT(*) AS matches
        FROM player_match_view
        WHERE date >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY player_name, tour
        ORDER BY matches DESC, player_name ASC
        LIMIT 1
    """).fetchone()
    if active:
        stories.append({
            'type': 'most_active',
            'headline': f"{active[0]} has been everywhere",
            'detail': f"Most active player of the last 60 days.",
            'player_name': active[0],
            'tour': active[1],
            'value': str(int(active[2])),
            'link': f"/player?p={active[0]}&tour={active[1]}",
        })

    surface = con.execute("""
        SELECT player_name, tour, surface,
               SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
               COUNT(*) AS total,
               ROUND(100.0 * SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct
        FROM player_match_view
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND surface IS NOT NULL
        GROUP BY player_name, tour, surface
        HAVING COUNT(*) >= 8
        ORDER BY win_pct DESC, wins DESC
        LIMIT 1
    """).fetchone()
    if surface:
        stories.append({
            'type': 'surface_king',
            'headline': f"{surface[0]} owns the {surface[2].lower()} courts",
            'detail': f"Best surface win rate this season with at least 8 matches.",
            'player_name': surface[0],
            'tour': surface[1],
            'value': f"{surface[5]}%",
            'link': f"/player?p={surface[0]}&tour={surface[1]}&surface={surface[2]}",
        })

    return stories[:limit]
