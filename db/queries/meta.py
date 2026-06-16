"""Metadata and homepage query builders."""
from __future__ import annotations

import random
from datetime import date
from typing import Optional

import duckdb

from ._helpers import _DEFAULT_YEAR_MAX, _DEFAULT_YEAR_MIN, _TOUR_LEVELS
from .leaders import (
    q_leaders_activity_combined,
    q_leaders_serve,
    q_leaders_return,
    q_leaders_streaks,
)

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

# Tour-level stat "stories" surfaced on the home page. Each entry mirrors a
# stat shown on the Leaders tab. Picked randomly each request, restricted to a
# single randomly-chosen tour (all ATP or all WTA) at main-tour level for the
# current season, so the shelf reads as a coherent season snapshot instead of
# random low-tier players.
#
# source: which Leaders query feeds the stat
# sort:   column to rank by (descending) within that query result
# pct:    True if the value is a percentage
# label:  kicker shown on the card
# tab:    Leaders tab the card links to
_STORY_STATS = [
    {'key': 'most_wins',       'source': 'activity', 'sort': 'wins',                 'label': 'Win Leader',  'tab': 'activity',
     'head': '{name} leads the {tn} in wins', 'detail': 'Most tour-level match wins this season.'},
    {'key': 'best_win_pct',    'source': 'activity', 'sort': 'win_pct', 'pct': True,  'label': 'Win Rate',    'tab': 'activity',
     'head': '{name} has the best {tn} win rate', 'detail': 'Highest tour-level win rate this season.'},
    {'key': 'most_titles',     'source': 'activity', 'sort': 'titles',               'label': 'Titles',      'tab': 'activity',
     'head': '{name} is collecting titles', 'detail': 'Most tour-level titles won this season.'},
    {'key': 'most_finals',     'source': 'activity', 'sort': 'finals',               'label': 'Finals',      'tab': 'activity',
     'head': '{name} keeps reaching finals', 'detail': 'Most tour-level finals reached this season.'},
    {'key': 'most_tb_won',     'source': 'activity', 'sort': 'tb_won',               'label': 'Tiebreaks',   'tab': 'activity',
     'head': '{name} thrives in tiebreaks', 'detail': 'Most tiebreaks won this season at tour level.'},
    {'key': 'most_upsets',     'source': 'activity', 'sort': 'upset_wins',           'label': 'Upsets',      'tab': 'activity',
     'head': '{name} is the giant-killer', 'detail': 'Most upset wins this season at tour level.'},
    {'key': 'most_comebacks',  'source': 'activity', 'sort': 'comebacks',            'label': 'Comebacks',   'tab': 'activity',
     'head': '{name} never folds', 'detail': 'Most wins after dropping the first set this season.'},
    {'key': 'most_aces',       'source': 'serve',    'sort': 'total_aces',           'label': 'Aces',        'tab': 'serve',
     'head': '{name} is the {tn} ace machine', 'detail': 'Most aces struck this season at tour level.'},
    {'key': 'best_ace_pct',    'source': 'serve',    'sort': 'ace_pct',  'pct': True, 'label': 'Ace Rate',    'tab': 'serve',
     'head': '{name} aces at will', 'detail': 'Highest ace rate this season at tour level.'},
    {'key': 'best_first_win',  'source': 'serve',    'sort': 'first_win_pct', 'pct': True, 'label': 'First Serve', 'tab': 'serve',
     'head': '{name} owns the first serve', 'detail': 'Best first-serve points won this season.'},
    {'key': 'best_bp_saved',   'source': 'serve',    'sort': 'bp_saved_pct', 'pct': True, 'label': 'BP Saved',  'tab': 'serve',
     'head': "{name} won't be broken", 'detail': 'Best break points saved rate this season.'},
    {'key': 'best_return',     'source': 'return',   'sort': 'first_return_win_pct', 'pct': True, 'label': 'Return', 'tab': 'return',
     'head': '{name} is a wall on return', 'detail': 'Best first-serve return points won this season.'},
    {'key': 'best_bp_conv',    'source': 'return',   'sort': 'bp_converted_pct', 'pct': True, 'label': 'BP Converted', 'tab': 'return',
     'head': '{name} pounces on break points', 'detail': 'Best break-point conversion this season.'},
    {'key': 'longest_streak',  'source': 'streak',   'sort': 'streak_length',        'label': 'Win Streak',  'tab': 'streaks',
     'head': '{name} is on a roll', 'detail': 'Longest tour-level win streak this season.'},
]

_TOUR_NAME = {'M': 'ATP', 'F': 'WTA'}


def q_storylines(
    con: duckdb.DuckDBPyConnection,
    limit: int = 4,
) -> list[dict]:
    """Random selection of tour-level Leaders stats for the current season.

    Surfaces a random set of distinct stats from the Leaders tab, each showing
    this season's leader at main-tour level. The tour (ATP/WTA) is chosen
    independently per card so the shelf mixes both tours.
    """
    year = date.today().year
    LEVEL = 'All Tour'

    # Lazily fetch each (source, tour) query at most once.
    cache: dict[tuple[str, str], 'object'] = {}

    def source_df(source: str, tour: str):
        key = (source, tour)
        if key in cache:
            return cache[key]
        if source == 'activity':
            df = q_leaders_activity_combined(con, tour, None, year, year, LEVEL, min_matches=12)
        elif source == 'serve':
            df = q_leaders_serve(con, tour, None, year, year, 10, LEVEL)
        elif source == 'return':
            df = q_leaders_return(con, tour, None, year, year, 10, LEVEL)
        elif source == 'streak':
            df = q_leaders_streaks(con, tour, None, year, year, LEVEL)
        else:
            df = None
        cache[key] = df
        return df

    stats = _STORY_STATS[:]
    random.shuffle(stats)

    stories: list[dict] = []
    used_players: set[str] = set()

    for stat in stats:
        if len(stories) >= limit:
            break
        tour = random.choice(['M', 'F'])
        tn = _TOUR_NAME[tour]
        df = source_df(stat['source'], tour)
        if df is None or df.empty or stat['sort'] not in df.columns:
            continue
        ranked = df.sort_values(stat['sort'], ascending=False)
        for _, row in ranked.iterrows():
            val = row[stat['sort']]
            if val is None or float(val) <= 0:
                continue
            name = row['player_name']
            if name in used_players:
                continue
            if stat.get('pct'):
                value = f"{round(float(val), 1)}%"
            else:
                value = str(int(round(float(val))))
            used_players.add(name)
            stories.append({
                'type': stat['key'],
                'label': stat['label'],
                'headline': stat['head'].format(name=name, tn=tn),
                'detail': stat['detail'],
                'player_name': name,
                'tour': tour,
                'value': value,
                'link': f"/leaders?tab={stat['tab']}&tour={tour}&level=All%20Tour&y0={year}&y1={year}",
            })
            break

    return stories[:limit]
