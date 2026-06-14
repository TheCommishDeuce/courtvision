"""Shared SQL query-builder helpers."""
from __future__ import annotations

from datetime import date
from typing import Optional

_DEFAULT_YEAR_MIN = 2000
_DEFAULT_YEAR_MAX = date.today().year


def _where(conditions: list[str]) -> str:
    if not conditions:
        return ''
    return 'WHERE ' + ' AND '.join(conditions)


_TOUR_LEVELS = (
    "'Grand Slam', 'Masters 1000', 'ATP 250/500', "
    "'WTA 500', 'WTA 250', 'Tour Finals', 'Olympics', 'WTA'"
)


def _level_condition(level: str, conditions: list[str], params: list, idx: int) -> int:
    """Append level filter condition(s). Returns updated param index."""
    if level == 'All Tour':
        conditions.append(
            f"(level_name IN ({_TOUR_LEVELS}) "
            "AND round NOT IN ('Q1', 'Q2', 'Q3', 'ER'))"
        )
    elif level == 'All Dev':
        conditions.append(
            f"(level_name = 'Challenger' OR "
            f"(level_name IN ({_TOUR_LEVELS}) "
            "AND round IN ('Q1', 'Q2', 'Q3', 'ER')))"
        )
    else:
        conditions.append(f"level_name = ${idx}"); params.append(level); idx += 1
    return idx


def _filter_extras(
    tour: Optional[str],
    surface: Optional[str],
    year_min: Optional[int],
    year_max: Optional[int],
    level: Optional[str] = None,
    start_idx: int = 1,
) -> tuple[str, list]:
    """Return (extra_AND_sql, params) appended after existing WHERE conditions."""
    conds: list[str] = []
    params: list = []
    idx = start_idx
    if tour:
        conds.append(f"tour = ${idx}"); params.append(tour); idx += 1
    if surface:
        conds.append(f"surface = ${idx}"); params.append(surface); idx += 1
    if level:
        idx = _level_condition(level, conds, params, idx)
    if year_min:
        conds.append(f"year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conds.append(f"year <= ${idx}"); params.append(year_max); idx += 1
    sql = (' AND ' + ' AND '.join(conds)) if conds else ''
    return sql, params


_TEAM_EVENT_FILTER = """
    AND tournament NOT ILIKE '%Davis%'
    AND tournament NOT ILIKE '%Atp Cup%'
    AND tournament NOT ILIKE '%United Cup%'
    AND tournament NOT ILIKE '%Fed Cup%'
    AND tournament NOT ILIKE '%BJK Cup%'
    AND tournament NOT ILIKE '%Hopman%'
    AND tournament NOT ILIKE '%Laver Cup%'
"""


# Deduped player-attributes CTE body. The `players` table can hold several rows
# per (name, tour) — pick the most authoritative one (ranked players first, then
# best current rank). Compose into a query's WITH clause:
#     WITH {PLAYER_ATTRS_CTE}, other AS (...) SELECT ...
PLAYER_ATTRS_CTE = """
player_attrs AS (
    SELECT name, tour, country, birthdate, hand, height
    FROM players
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY name, tour
        ORDER BY historically_ranked DESC, current_rank ASC NULLS LAST
    ) = 1
)
"""


# Map common country names / demonyms to the 3-letter ISO codes stored in
# players.country. Anything not found falls through as an upper-cased code.
COUNTRY_ALIASES = {
    "russia": "RUS", "russian": "RUS",
    "usa": "USA", "united states": "USA", "america": "USA", "american": "USA",
    "spain": "ESP", "spanish": "ESP",
    "france": "FRA", "french": "FRA",
    "italy": "ITA", "italian": "ITA",
    "germany": "GER", "german": "GER",
    "serbia": "SRB", "serbian": "SRB",
    "switzerland": "SUI", "swiss": "SUI",
    "great britain": "GBR", "britain": "GBR", "british": "GBR", "uk": "GBR", "england": "GBR",
    "australia": "AUS", "australian": "AUS",
    "argentina": "ARG", "argentine": "ARG", "argentinian": "ARG",
    "poland": "POL", "polish": "POL",
    "czech republic": "CZE", "czechia": "CZE", "czech": "CZE",
    "croatia": "CRO", "croatian": "CRO",
    "greece": "GRE", "greek": "GRE",
    "canada": "CAN", "canadian": "CAN",
    "japan": "JPN", "japanese": "JPN",
    "china": "CHN", "chinese": "CHN",
    "belarus": "BLR", "belarusian": "BLR",
    "kazakhstan": "KAZ", "kazakh": "KAZ",
    "ukraine": "UKR", "ukrainian": "UKR",
    "netherlands": "NED", "dutch": "NED", "holland": "NED",
    "belgium": "BEL", "belgian": "BEL",
    "austria": "AUT", "austrian": "AUT",
    "sweden": "SWE", "swedish": "SWE",
    "denmark": "DEN", "danish": "DEN",
    "norway": "NOR", "norwegian": "NOR",
    "tunisia": "TUN", "tunisian": "TUN",
    "brazil": "BRA", "brazilian": "BRA",
    "romania": "ROU", "romanian": "ROU",
    "bulgaria": "BUL", "bulgarian": "BUL",
    "south africa": "RSA", "south african": "RSA",
    "india": "IND", "indian": "IND",
    "chile": "CHI", "chilean": "CHI",
    "portugal": "POR", "portuguese": "POR",
    "hungary": "HUN", "hungarian": "HUN",
    "slovakia": "SVK", "slovak": "SVK",
    "slovenia": "SLO", "slovenian": "SLO",
    "finland": "FIN", "finnish": "FIN",
    "latvia": "LAT", "latvian": "LAT",
    "georgia": "GEO", "georgian": "GEO",
}


def _normalize_country(value: Optional[str]) -> Optional[str]:
    """Normalize a country name/demonym/ISO code to the stored 3-letter code."""
    if not value:
        return None
    key = value.strip().lower()
    if key in COUNTRY_ALIASES:
        return COUNTRY_ALIASES[key]
    # Fall through: assume the caller passed a code (e.g. 'rus', 'CRO').
    return value.strip().upper()


# --- both-sides match stats from a player-perspective view ------------------
# player_match_view only carries the focal player's stats. To surface the
# opponent's serve stats too (needed for return% / total-points-won%), join
# matches_main back. We expose it as a subquery with RENAMED join keys so its
# columns never collide with the view's (level_name, round, surface, …).
_STAT_FIELDS = ["aces", "dfs", "pts", "firsts", "fwon", "swon",
                "games", "saved", "chances", "tb_won", "tb_lost"]


def perspective_stats_join(view_alias: str) -> str:
    """A matches_main join (subquery `mm`) keyed 1:1 on the unique-match tuple."""
    stat_sel = ", ".join(f"winner_{s}, loser_{s}" for s in _STAT_FIELDS)
    a = view_alias
    return f"""
    JOIN (
        SELECT date AS k_date, round AS k_round,
               winner_name AS k_w, loser_name AS k_l,
               is_retirement, num_sets, {stat_sel}
        FROM matches_main
    ) mm
      ON mm.k_date = {a}.date
     AND mm.k_round = {a}.round
     AND mm.k_w = (CASE WHEN {a}.result = 'W' THEN {a}.player_name ELSE {a}.opponent_name END)
     AND mm.k_l = (CASE WHEN {a}.result = 'W' THEN {a}.opponent_name ELSE {a}.player_name END)
    """


def perspective_stat_columns(view_alias: str, focal_prefix: str = "p_", opp_prefix: str = "o_") -> str:
    """Per-match stat columns for the focal player and opponent via the `mm` join."""
    a = view_alias
    cols = []
    for s in _STAT_FIELDS:
        cols.append(f"CASE WHEN {a}.result = 'W' THEN mm.winner_{s} ELSE mm.loser_{s} END AS {focal_prefix}{s}")
        cols.append(f"CASE WHEN {a}.result = 'W' THEN mm.loser_{s} ELSE mm.winner_{s} END AS {opp_prefix}{s}")
    return ",\n            ".join(cols)
