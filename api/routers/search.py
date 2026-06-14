"""Match search endpoints (JSON + CSV download)."""
from __future__ import annotations

import io
import math
from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import q_match_search, q_relational_match_search, q_relational_summary

router = APIRouter(tags=["search"])

# Valid stat filter column names
_STAT_COLUMNS = {
    'w_aces', 'l_aces', 'w_dfs', 'l_dfs',
    'w_first_in_pct', 'l_first_in_pct',
    'w_first_won_pct', 'l_first_won_pct',
    'w_second_won_pct', 'l_second_won_pct',
    'w_bp_saved_pct', 'l_bp_saved_pct',
}


def _parse_stat_filters(request: Request) -> dict[str, tuple[Optional[float], Optional[float]]] | None:
    """Extract stat filter params from query string.

    Accepts params like: w_aces_min=10&w_aces_max=30&w_first_won_pct_min=80
    """
    filters: dict[str, tuple[Optional[float], Optional[float]]] = {}
    for col in _STAT_COLUMNS:
        lo_str = request.query_params.get(f'{col}_min')
        hi_str = request.query_params.get(f'{col}_max')
        try:
            lo = float(lo_str) if lo_str else None
            hi = float(hi_str) if hi_str else None
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid numeric range for stat filter '{col}'",
            ) from exc

        if lo is not None and not math.isfinite(lo):
            raise HTTPException(status_code=422, detail=f"Invalid min value for stat filter '{col}'")
        if hi is not None and not math.isfinite(hi):
            raise HTTPException(status_code=422, detail=f"Invalid max value for stat filter '{col}'")
        if lo is not None and hi is not None and lo > hi:
            raise HTTPException(status_code=422, detail=f"Invalid range for stat filter '{col}': min > max")

        if lo is not None or hi is not None:
            filters[col] = (lo, hi)
    return filters or None


def _run_search(
    con: duckdb.DuckDBPyConnection,
    winner: Optional[str],
    loser: Optional[str],
    tournament: Optional[str],
    surface: Optional[str],
    level: Optional[str],
    round_: Optional[str],
    tour: Optional[Literal["M", "F"]],
    upsets_only: bool,
    with_stats_only: bool,
    year_min: Optional[int],
    year_max: Optional[int],
    limit: int,
    stat_filters: Optional[dict] = None,
):
    return q_match_search(
        con,
        winner=winner,
        loser=loser,
        tournament=tournament,
        surface=surface,
        level=level,
        round_=round_,
        tour=tour,
        upsets_only=upsets_only,
        with_stats_only=with_stats_only,
        year_min=year_min,
        year_max=year_max,
        limit=limit,
        stat_filters=stat_filters,
    )


@router.get("/matches", operation_id="search_matches")
def search_matches(
    request: Request,
    winner: Optional[str] = Query(None, description="Substring filter for winning player name."),
    loser: Optional[str] = Query(None, description="Substring filter for losing player name."),
    tournament: Optional[str] = Query(None, description="Substring filter for tournament name."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    round_: Optional[str] = Query(None, alias="round", description="Optional round code filter such as F, SF, QF, R16, or R32."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    upsets_only: bool = Query(False, description="When true, return only matches where the winner was lower ranked."),
    with_stats_only: bool = Query(False, description="When true, return only matches with point-level serve stats."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    limit: int = Query(500, ge=1, le=5000, description="Maximum number of matches to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Search historical tennis matches with player, tournament, round, surface, rank-upset, and stat filters."""
    stat_filters = _parse_stat_filters(request)
    df = _run_search(
        con, winner, loser, tournament, surface, level, round_,
        tour, upsets_only, with_stats_only, year_min, year_max, limit,
        stat_filters=stat_filters,
    )
    return {"total": len(df), "matches": df_to_records(df)}


@router.get("/relational", operation_id="search_relational_matches")
def search_relational_matches(
    player: Optional[str] = Query(None, description="Focal player's exact full name, e.g. 'Rafael Nadal'. Required for the compatriot/foreign and younger/older relations."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    opp_hand: Optional[Literal["L", "R"]] = Query(None, description="Opponent handedness: L for left-handers, R for right-handers."),
    opp_country: Optional[str] = Query(None, description="Opponent country as a name or 3-letter ISO code, e.g. 'Spain' or 'ESP'."),
    opp_rank_max: Optional[int] = Query(None, ge=1, description="Only opponents ranked this number or better at match time, e.g. 10 for top-10 opponents."),
    opp_age_min: Optional[float] = Query(None, ge=0, description="Minimum opponent age (years) at match time."),
    opp_age_max: Optional[float] = Query(None, ge=0, description="Maximum opponent age (years) at match time."),
    opp_height_min: Optional[float] = Query(None, description="Minimum opponent height in centimeters."),
    opp_height_max: Optional[float] = Query(None, description="Maximum opponent height in centimeters."),
    relation: Optional[Literal["compatriot", "foreign"]] = Query(None, description="Opponent nationality relative to the focal player: 'compatriot' (same country) or 'foreign'. Requires player."),
    age_relation: Optional[Literal["younger", "older"]] = Query(None, description="Opponent age relative to the focal player at match time: 'younger' or 'older'. Requires player."),
    min_stage: Optional[Literal["R16", "QF", "SF", "F"]] = Query(None, description="Only matches at this tournament stage or later: R16, QF, SF, or F."),
    situation: Optional[Literal["won_first", "lost_first", "deciding_set", "led_2_0", "trailed_0_2", "led_2_1", "trailed_1_2"]] = Query(
        None,
        description=(
            "Score-state filter from the focal player's perspective: 'won_first'/'lost_first' "
            "(after winning/losing the opening set), 'deciding_set' (match went to a final set), "
            "and best-of-5 states (men's Slams) 'led_2_0', 'trailed_0_2', 'led_2_1', 'trailed_1_2'. "
            "Combine with the summary win% to measure conversion/comeback rates."
        ),
    ),
    surface: Optional[str] = Query(None, description="Surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Tournament level filter such as Grand Slam, Masters 1000, 'All Tour', or 'All Dev'."),
    round_: Optional[str] = Query(None, alias="round", description="Round code filter such as F, SF, QF, R16, R32, or RR. Use 'Q' to match any qualifying round (Q1/Q2/Q3)."),
    result: Optional[Literal["W", "L"]] = Query(None, description="Restrict to the focal player's wins ('W') or losses ('L')."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    limit: int = Query(500, ge=1, le=5000, description="Maximum number of matches to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Search a player's matches by opponent attributes — vs left-handers, compatriots, top-ranked, or younger/older opponents."""
    filters = dict(
        player=player, tour=tour, opp_hand=opp_hand, opp_country=opp_country,
        opp_rank_max=opp_rank_max, opp_age_min=opp_age_min, opp_age_max=opp_age_max,
        opp_height_min=opp_height_min, opp_height_max=opp_height_max,
        relation=relation, age_relation=age_relation, min_stage=min_stage,
        situation=situation, surface=surface, level=level, round_=round_, result=result,
        year_min=year_min, year_max=year_max,
    )
    try:
        df = q_relational_match_search(con, limit=limit, **filters)
        summary = q_relational_summary(con, **filters)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"total": summary["total"], "shown": len(df), "summary": summary, "matches": df_to_records(df)}


@router.get("/matches/csv", operation_id="download_matches_csv")
def search_matches_csv(
    request: Request,
    winner: Optional[str] = Query(None, description="Substring filter for winning player name."),
    loser: Optional[str] = Query(None, description="Substring filter for losing player name."),
    tournament: Optional[str] = Query(None, description="Substring filter for tournament name."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    round_: Optional[str] = Query(None, alias="round", description="Optional round code filter such as F, SF, QF, R16, or R32."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    upsets_only: bool = Query(False, description="When true, return only matches where the winner was lower ranked."),
    with_stats_only: bool = Query(False, description="When true, return only matches with point-level serve stats."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    limit: int = Query(5000, ge=1, le=50000, description="Maximum number of matches to export."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Download match search results as CSV using the same filters as JSON match search."""
    stat_filters = _parse_stat_filters(request)
    df = _run_search(
        con, winner, loser, tournament, surface, level, round_,
        tour, upsets_only, with_stats_only, year_min, year_max, limit,
        stat_filters=stat_filters,
    )
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=matches.csv"},
    )
