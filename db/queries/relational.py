"""Player-centric relational match search.

Answers questions framed *relative to a focal player* — matches against
left-handers, compatriots, younger opponents, top-ranked opponents, etc. —
by joining player_match_view to deduped player attributes for both the focal
player and the opponent.
"""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import (
    PLAYER_ATTRS_CTE,
    _level_condition,
    _normalize_country,
    _where,
    perspective_stat_columns,
    perspective_stats_join,
)
from .analysis import ROUND_ORDER_SQL, STAGE_ORDER

# Qualify the round-ordering CASE to pmv.round (pmv is the only `round` source
# once the stats subquery is joined under a renamed key).
_ROUND_ORDER_PMV = ROUND_ORDER_SQL.replace("CASE round", "CASE pmv.round")

_OPP_AGE_EXPR = "date_diff('day', opp.birthdate, pmv.date) / 365.2425"
_SELF_AGE_EXPR = "date_diff('day', slf.birthdate, pmv.date) / 365.2425"

_STATS_JOIN = perspective_stats_join("pmv")

# --- score-based "situation" filters (focal-player perspective) -------------
# The score string is stored from the match-winner's perspective. We split it
# into completed-set tokens ("6-4", "7-6(5)"), decide who won each set, then XOR
# with the focal player's result to get a per-set "did the focal player win
# set i?" boolean list. All situation predicates are derived from that list.
_SET_TOKENS = (
    r"list_filter(str_split(pmv.score, ' '), "
    r"x -> regexp_full_match(x, '^[0-9]+-[0-9]+(\([0-9-]+\))?$'))"
)
_WINNER_WON_SET = (
    "CAST(regexp_extract(t, '([0-9]+)-([0-9]+)', 1) AS INTEGER) > "
    "CAST(regexp_extract(t, '([0-9]+)-([0-9]+)', 2) AS INTEGER)"
)
_FOCAL_FLAGS = f"list_transform({_SET_TOKENS}, t -> ({_WINNER_WON_SET}) = (pmv.result = 'W'))"
_F_WON = f"len(list_filter({_FOCAL_FLAGS}, b -> b))"
_F_LEN = f"len({_FOCAL_FLAGS})"
_FIRST3 = (
    f"(CAST(({_FOCAL_FLAGS})[1] AS INTEGER) + CAST(({_FOCAL_FLAGS})[2] AS INTEGER) "
    f"+ CAST(({_FOCAL_FLAGS})[3] AS INTEGER))"
)

_SITUATIONS = {
    "won_first":    f"({_FOCAL_FLAGS})[1] = true",
    "lost_first":   f"({_FOCAL_FLAGS})[1] = false",
    "deciding_set": f"abs(2 * {_F_WON} - {_F_LEN}) = 1",
    # Best-of-5 (men's Slams) two/three-set states. The `len >= 3` guard keeps
    # genuine best-of-5 matches only — a 2-set "2-0" finish is just a best-of-3
    # straight-sets win, not a 2-0 lead in a longer match.
    "led_2_0":      f"{_F_LEN} >= 3 AND ({_FOCAL_FLAGS})[1] = true AND ({_FOCAL_FLAGS})[2] = true",
    "trailed_0_2":  f"{_F_LEN} >= 3 AND ({_FOCAL_FLAGS})[1] = false AND ({_FOCAL_FLAGS})[2] = false",
    "led_2_1":      f"{_F_LEN} >= 3 AND {_FIRST3} = 2",
    "trailed_1_2":  f"{_F_LEN} >= 3 AND {_FIRST3} = 1",
}
# Skip retirements/walkovers/defaults — their partial scores misparse sets.
_SITUATION_CLEAN = (
    "pmv.score IS NOT NULL AND pmv.score NOT ILIKE '%RET%' "
    "AND pmv.score NOT ILIKE '%W/O%' AND pmv.score NOT ILIKE '%DEF%'"
)

_FROM_JOIN = """
    FROM player_match_view pmv
    LEFT JOIN player_attrs opp
           ON opp.name = pmv.opponent_name AND opp.tour = pmv.tour
    LEFT JOIN player_attrs slf
           ON slf.name = pmv.player_name AND slf.tour = pmv.tour
"""


def _relational_filters(
    *,
    player: Optional[str],
    tour: Optional[str],
    opp_hand: Optional[str],
    opp_country: Optional[str],
    opp_rank_max: Optional[int],
    opp_age_min: Optional[float],
    opp_age_max: Optional[float],
    opp_height_min: Optional[float],
    opp_height_max: Optional[float],
    relation: Optional[str],
    age_relation: Optional[str],
    min_stage: Optional[str],
    situation: Optional[str],
    surface: Optional[str],
    level: Optional[str],
    round_: Optional[str],
    result: Optional[str],
    year_min: Optional[int],
    year_max: Optional[int],
) -> tuple[list[str], list]:
    """Build the shared WHERE conditions + positional params (no LIMIT)."""
    relation = relation.lower() if relation else None
    age_relation = age_relation.lower() if age_relation else None
    situation = situation.lower() if situation else None

    if (relation or age_relation) and not player:
        raise ValueError(
            "relation and age_relation require a focal 'player' to compare against."
        )
    if relation and relation not in ("compatriot", "foreign"):
        raise ValueError(f"Unsupported relation: {relation}")
    if age_relation and age_relation not in ("younger", "older"):
        raise ValueError(f"Unsupported age_relation: {age_relation}")
    if opp_hand and opp_hand.upper() not in ("L", "R"):
        raise ValueError(f"Unsupported opp_hand: {opp_hand}")
    if result and result.upper() not in ("W", "L"):
        raise ValueError(f"Unsupported result: {result}")
    if min_stage and min_stage.upper() not in STAGE_ORDER:
        raise ValueError(f"Unsupported min_stage: {min_stage}")
    if situation and situation not in _SITUATIONS:
        raise ValueError(f"Unsupported situation: {situation}. Choose from {sorted(_SITUATIONS)}.")

    conditions: list[str] = []
    params: list = []
    idx = 1

    if player:
        conditions.append(f"pmv.player_name = ${idx}"); params.append(player); idx += 1
    if tour:
        conditions.append(f"pmv.tour = ${idx}"); params.append(tour); idx += 1
    if opp_hand:
        conditions.append(f"opp.hand = ${idx}"); params.append(opp_hand.upper()); idx += 1
    if opp_country:
        conditions.append(f"opp.country = ${idx}")
        params.append(_normalize_country(opp_country)); idx += 1
    if opp_rank_max is not None:
        conditions.append(f"pmv.opponent_rank <= ${idx}"); params.append(opp_rank_max); idx += 1
    if opp_age_min is not None:
        conditions.append(f"opp.birthdate IS NOT NULL AND ({_OPP_AGE_EXPR}) >= ${idx}")
        params.append(opp_age_min); idx += 1
    if opp_age_max is not None:
        conditions.append(f"opp.birthdate IS NOT NULL AND ({_OPP_AGE_EXPR}) <= ${idx}")
        params.append(opp_age_max); idx += 1
    if opp_height_min is not None:
        conditions.append(f"opp.height >= ${idx}"); params.append(opp_height_min); idx += 1
    if opp_height_max is not None:
        conditions.append(f"opp.height <= ${idx}"); params.append(opp_height_max); idx += 1
    if result:
        conditions.append(f"pmv.result = ${idx}"); params.append(result.upper()); idx += 1

    if relation == "compatriot":
        conditions.append("opp.country IS NOT NULL AND opp.country = slf.country")
    elif relation == "foreign":
        conditions.append(
            "opp.country IS NOT NULL AND slf.country IS NOT NULL "
            "AND opp.country <> slf.country"
        )

    if age_relation == "younger":  # opponent born later than focal player
        conditions.append("opp.birthdate IS NOT NULL AND slf.birthdate IS NOT NULL "
                          "AND opp.birthdate > slf.birthdate")
    elif age_relation == "older":
        conditions.append("opp.birthdate IS NOT NULL AND slf.birthdate IS NOT NULL "
                          "AND opp.birthdate < slf.birthdate")

    if min_stage:
        conditions.append(f"({_ROUND_ORDER_PMV}) >= {STAGE_ORDER[min_stage.upper()]}")

    if situation:
        conditions.append(_SITUATION_CLEAN)
        conditions.append(f"({_SITUATIONS[situation]})")

    if surface:
        conditions.append(f"pmv.surface = ${idx}"); params.append(surface); idx += 1
    if level:
        idx = _level_condition(level, conditions, params, idx)  # bare level_name/round → pmv
    if round_:
        if round_.strip().upper() == "Q":  # any qualifying round
            conditions.append("pmv.round IN ('Q1', 'Q2', 'Q3')")
        else:
            conditions.append(f"pmv.round = ${idx}"); params.append(round_); idx += 1
    if year_min:
        conditions.append(f"pmv.year >= ${idx}"); params.append(year_min); idx += 1
    if year_max:
        conditions.append(f"pmv.year <= ${idx}"); params.append(year_max); idx += 1

    return conditions, params


def q_relational_match_search(
    con: duckdb.DuckDBPyConnection,
    *,
    player: Optional[str] = None,
    tour: Optional[str] = None,
    opp_hand: Optional[str] = None,
    opp_country: Optional[str] = None,
    opp_rank_max: Optional[int] = None,
    opp_age_min: Optional[float] = None,
    opp_age_max: Optional[float] = None,
    opp_height_min: Optional[float] = None,
    opp_height_max: Optional[float] = None,
    relation: Optional[str] = None,      # 'compatriot' | 'foreign'
    age_relation: Optional[str] = None,  # 'younger' | 'older'
    min_stage: Optional[str] = None,     # 'R16' | 'QF' | 'SF' | 'F' (round reached or later)
    situation: Optional[str] = None,     # score-state filter, see _SITUATIONS
    surface: Optional[str] = None,
    level: Optional[str] = None,
    round_: Optional[str] = None,
    result: Optional[str] = None,        # 'W' | 'L'
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    limit: int = 500,
) -> "pd.DataFrame":
    """Search a focal player's matches by opponent attributes/relationship.

    `relation` and `age_relation` are relative to the focal player and require
    `player` to be set; a ValueError is raised otherwise.
    """
    conditions, params = _relational_filters(
        player=player, tour=tour, opp_hand=opp_hand, opp_country=opp_country,
        opp_rank_max=opp_rank_max, opp_age_min=opp_age_min, opp_age_max=opp_age_max,
        opp_height_min=opp_height_min, opp_height_max=opp_height_max,
        relation=relation, age_relation=age_relation, min_stage=min_stage,
        situation=situation, surface=surface, level=level, round_=round_,
        result=result, year_min=year_min, year_max=year_max,
    )
    params = [*params, int(limit)]
    limit_idx = len(params)

    sql = f"""
        WITH {PLAYER_ATTRS_CTE}
        SELECT
            pmv.date,
            pmv.tournament,
            pmv.level_name,
            pmv.round,
            pmv.surface,
            pmv.result,
            pmv.player_name,
            pmv.player_rank,
            pmv.opponent_name,
            pmv.opponent_rank,
            opp.hand    AS opp_hand,
            opp.country AS opp_country,
            opp.height  AS opp_height,
            ROUND({_OPP_AGE_EXPR}, 1)  AS opp_age,
            ROUND({_SELF_AGE_EXPR}, 1) AS player_age,
            pmv.score,
            pmv.time,
            pmv.tour,
            pmv.year,
            pmv.is_upset,
            mm.is_retirement,
            mm.num_sets,
            {perspective_stat_columns("pmv")}
        {_FROM_JOIN}
        {_STATS_JOIN}
        {_where(conditions)}
        ORDER BY pmv.date DESC, ({_ROUND_ORDER_PMV}) DESC
        LIMIT ${limit_idx}
    """
    return con.execute(sql, params).df()


def q_relational_summary(
    con: duckdb.DuckDBPyConnection,
    **filters,
) -> dict:
    """Aggregate win/loss totals for a relational search (all-time / 5y / 52w)."""
    conditions, params = _relational_filters(
        player=filters.get("player"), tour=filters.get("tour"),
        opp_hand=filters.get("opp_hand"), opp_country=filters.get("opp_country"),
        opp_rank_max=filters.get("opp_rank_max"), opp_age_min=filters.get("opp_age_min"),
        opp_age_max=filters.get("opp_age_max"), opp_height_min=filters.get("opp_height_min"),
        opp_height_max=filters.get("opp_height_max"), relation=filters.get("relation"),
        age_relation=filters.get("age_relation"), min_stage=filters.get("min_stage"),
        situation=filters.get("situation"),
        surface=filters.get("surface"), level=filters.get("level"),
        round_=filters.get("round_"), result=filters.get("result"),
        year_min=filters.get("year_min"), year_max=filters.get("year_max"),
    )

    win = "pmv.result = 'W'"
    y5 = "pmv.date >= current_date - INTERVAL '5' YEAR"
    w52 = "pmv.date >= current_date - INTERVAL '364' DAY"

    sql = f"""
        WITH {PLAYER_ATTRS_CTE}
        SELECT
            COUNT(*)                                          AS total,
            COUNT(*) FILTER (WHERE {win})                     AS wins,
            COUNT(*) FILTER (WHERE pmv.result = 'L')          AS losses,
            COUNT(*) FILTER (WHERE {y5})                      AS y5_total,
            COUNT(*) FILTER (WHERE {y5} AND {win})            AS y5_wins,
            COUNT(*) FILTER (WHERE {y5} AND pmv.result = 'L') AS y5_losses,
            COUNT(*) FILTER (WHERE {w52})                     AS w52_total,
            COUNT(*) FILTER (WHERE {w52} AND {win})           AS w52_wins,
            COUNT(*) FILTER (WHERE {w52} AND pmv.result = 'L') AS w52_losses
        {_FROM_JOIN}
        {_where(conditions)}
    """
    row = con.execute(sql, params).fetchone()
    keys = [
        "total", "wins", "losses",
        "y5_total", "y5_wins", "y5_losses",
        "w52_total", "w52_wins", "w52_losses",
    ]
    data = {k: int(row[i] or 0) for i, k in enumerate(keys)}

    def _pct(w: int, t: int) -> Optional[float]:
        return round(100.0 * w / t, 1) if t else None

    data["win_pct"] = _pct(data["wins"], data["total"])
    data["y5_win_pct"] = _pct(data["y5_wins"], data["y5_total"])
    data["w52_win_pct"] = _pct(data["w52_wins"], data["w52_total"])
    return data
