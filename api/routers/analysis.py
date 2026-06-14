"""Composite and tournament-analysis endpoints for agent workflows."""
from __future__ import annotations

from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import (
    q_country_leaders,
    q_match_extremes,
    q_nationality_stage,
    q_tour_level_season_leaders,
    q_youngest_stage_reached,
)

router = APIRouter(tags=["analysis"])

LEVEL_FILTER_DESCRIPTION = (
    "Tournament level filter. Use 'All Tour' for main-tour events "
    "(Grand Slam, Masters 1000, ATP 250/500, WTA 500, WTA 250, Tour Finals, Olympics) "
    "and 'All Dev' for Challenger/ITF plus qualifying rounds. Specific values include "
    "Grand Slam, Masters 1000, ATP 250/500, WTA 500, WTA 250, Challenger, ITF."
)


@router.get("/youngest-stage", operation_id="get_youngest_tournament_stage_reached")
def get_youngest_stage_reached(
    stage: Literal["R16", "QF", "SF", "F"] = Query("QF", description="Minimum stage reached: R16, QF, SF, or F."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    level: Optional[str] = Query("Grand Slam", description=LEVEL_FILTER_DESCRIPTION),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    year_min: Optional[int] = Query(None, description="Earliest tournament year to include."),
    year_max: Optional[int] = Query(None, description="Latest tournament year to include."),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of players/events to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Find the youngest players to reach a tournament stage under tour, level, surface, and year filters."""
    try:
        df = q_youngest_stage_reached(
            con,
            stage=stage,
            tour=tour,
            level=level,
            surface=surface,
            year_min=year_min,
            year_max=year_max,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "filters": {
            "stage": stage,
            "tour": tour,
            "level": level,
            "surface": surface,
            "year_min": year_min,
            "year_max": year_max,
        },
        "results": df_to_records(df),
    }


@router.get("/tour-level-season-leaders", operation_id="get_tour_level_season_leaders")
def get_tour_level_season_leaders(
    year: int = Query(..., description="Season year to analyze, e.g. 2025."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    limit: int = Query(20, ge=1, le=100, description="Maximum rows to return in each leaderboard."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return combined All Tour season leaders for match wins and finals reached in one call."""
    data = q_tour_level_season_leaders(
        con,
        year=year,
        tour=tour,
        surface=surface,
        limit=limit,
    )
    return {
        "filters": data["filters"],
        "wins": df_to_records(data["wins"]),
        "finals": df_to_records(data["finals"]),
    }


@router.get("/match-extremes", operation_id="get_match_extremes")
def get_match_extremes(
    metric: Literal["duration", "aces_match", "aces_player", "games", "sets", "rank_upset"] = Query(
        "duration",
        description="Ranking metric: duration (minutes), aces_match (both players), aces_player (single player), games (total games), sets, or rank_upset (winner-loser ranking gap).",
    ),
    order: Literal["desc", "asc"] = Query("desc", description="desc for the largest (e.g. longest); asc for the smallest (e.g. shortest)."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    level: Optional[str] = Query(None, description=LEVEL_FILTER_DESCRIPTION),
    surface: Optional[str] = Query(None, description="Surface filter: Hard, Clay, Grass, or Carpet."),
    round_: Optional[str] = Query(None, alias="round", description="Round code filter such as F, SF, QF, R16, or R32."),
    tournament: Optional[str] = Query(None, description="Optional tournament-name substring to isolate one event, e.g. 'Wimbledon' or 'Roland Garros'."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    completed_only: bool = Query(True, description="Exclude retirements and walkovers (recommended for duration/games)."),
    limit: int = Query(20, ge=1, le=200, description="Maximum number of matches to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank individual matches by a superlative metric, e.g. the longest Masters 1000 match in 2024 or the most aces in a Wimbledon match."""
    try:
        df = q_match_extremes(
            con,
            metric=metric,
            order=order,
            tour=tour,
            level=level,
            surface=surface,
            round_=round_,
            tournament=tournament,
            year_min=year_min,
            year_max=year_max,
            completed_only=completed_only,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "filters": {
            "metric": metric, "order": order, "tour": tour, "level": level,
            "surface": surface, "round": round_, "tournament": tournament,
            "year_min": year_min, "year_max": year_max,
        },
        "results": df_to_records(df),
    }


@router.get("/nationality-stage", operation_id="get_nationality_stage_reached")
def get_nationality_stage_reached(
    country: str = Query(..., description="Country as a name or 3-letter ISO code, e.g. 'Russia' or 'RUS'."),
    stage: Literal["R16", "QF", "SF", "F"] = Query("F", description="Minimum stage reached: R16, QF, SF, or F."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    level: Optional[str] = Query("Grand Slam", description=LEVEL_FILTER_DESCRIPTION),
    surface: Optional[str] = Query(None, description="Surface filter: Hard, Clay, Grass, or Carpet."),
    tournament: Optional[str] = Query(None, description="Optional tournament-name substring to isolate one event, e.g. 'Wimbledon' or 'US Open'. Use this to split a level like Grand Slam into a single major."),
    year_min: Optional[int] = Query(None, description="Earliest tournament year to include."),
    year_max: Optional[int] = Query(None, description="Latest tournament year to include."),
    order: Literal["last", "first"] = Query("last", description="'last' returns the most recent first (e.g. last Russian woman to reach a Grand Slam final); 'first' returns the earliest."),
    limit: int = Query(20, ge=1, le=200, description="Maximum number of event runs to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Find players from a country that reached a tournament stage, ordered by date (e.g. the last Russian woman to reach a Wimbledon final)."""
    try:
        df = q_nationality_stage(
            con,
            country=country,
            stage=stage,
            tour=tour,
            level=level,
            surface=surface,
            tournament=tournament,
            year_min=year_min,
            year_max=year_max,
            order=order,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "filters": {
            "country": country, "stage": stage, "tour": tour, "level": level,
            "surface": surface, "tournament": tournament,
            "year_min": year_min, "year_max": year_max, "order": order,
        },
        "results": df_to_records(df),
    }


@router.get("/country-leaders", operation_id="get_country_leaders")
def get_country_leaders(
    metric: Literal["titles", "finals", "semis", "wins"] = Query("titles", description="Ranking metric per country: titles, finals, semis (SF or better), or match wins."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    level: Optional[str] = Query(None, description=LEVEL_FILTER_DESCRIPTION),
    surface: Optional[str] = Query(None, description="Surface filter: Hard, Clay, Grass, or Carpet."),
    year_min: Optional[int] = Query(None, description="Earliest year to include."),
    year_max: Optional[int] = Query(None, description="Latest year to include."),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of countries to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank countries by titles, finals, semifinals, or match wins under tour/level/surface/year filters."""
    try:
        df = q_country_leaders(
            con,
            metric=metric,
            tour=tour,
            level=level,
            surface=surface,
            year_min=year_min,
            year_max=year_max,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "filters": {
            "metric": metric, "tour": tour, "level": level,
            "surface": surface, "year_min": year_min, "year_max": year_max,
        },
        "results": df_to_records(df),
    }

