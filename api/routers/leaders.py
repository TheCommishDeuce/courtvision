"""Stat leaders endpoints."""
from __future__ import annotations

from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, Query

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import (
    q_leaders_wins,
    q_leaders_serve,
    q_leaders_return,
    q_leaders_upsets,
    q_leaders_comebacks,
    q_leaders_activity,
    q_leaders_activity_combined,
    q_leaders_bakery,
    q_leaders_streaks,
    q_leaders_draw_strength,
    q_leaders_top10_wins,
    q_leaders_finals,
    q_leaders_slam_record,
    q_leaders_tiebreaks,
)

router = APIRouter(tags=["leaders"])


@router.get("/activity-combined", operation_id="get_activity_combined_leaders")
def get_activity_combined(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(10, ge=1, le=10000, description="Minimum matches required to appear on the leaderboard."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return combined activity leaderboards covering matches, finals, titles, and tiebreak counts."""
    df = q_leaders_activity_combined(con, tour, surface, year_min, year_max, level, min_matches)
    return df_to_records(df)


@router.get("/wins", operation_id="get_wins_leaders")
def get_wins_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(10, ge=1, le=10000, description="Minimum matches required to appear on the leaderboard."),
    sort_by: str = Query("wins", description="Sort column: wins, win_pct, or total."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by wins, total matches, or win percentage under optional filters."""
    df = q_leaders_wins(con, tour, surface, year_min, year_max, min_matches, level)
    if not df.empty and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=False)
    return df_to_records(df.head(100))


@router.get("/serve", operation_id="get_serve_leaders")
def get_serve_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(10, ge=1, le=10000, description="Minimum matches required to appear on the leaderboard."),
    sort_by: str = Query("ace_pct", description="Serve metric sort column such as ace_pct, first_win_pct, or bp_saved_pct."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by serve metrics such as ace rate, first-serve points won, and break points saved."""
    df = q_leaders_serve(con, tour, surface, year_min, year_max, min_matches, level)
    if not df.empty and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=False)
    return df_to_records(df)


@router.get("/return", operation_id="get_return_leaders")
def get_return_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(10, ge=1, le=10000, description="Minimum matches required to appear on the leaderboard."),
    sort_by: str = Query("first_return_win_pct", description="Return metric sort column such as first_return_win_pct or bp_converted_pct."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by return metrics such as first-return points won and break-point conversion."""
    df = q_leaders_return(con, tour, surface, year_min, year_max, min_matches, level)
    if not df.empty and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=False)
    return df_to_records(df)


@router.get("/upsets", operation_id="get_upset_leaders")
def get_upset_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by upset wins and upset losses under optional filters."""
    data = q_leaders_upsets(con, tour, surface, year_min, year_max, level=level)
    return {
        "wins":   df_to_records(data["wins"]),
        "losses": df_to_records(data["losses"]),
    }


@router.get("/comebacks", operation_id="get_comeback_leaders")
def get_comeback_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by wins after losing the first set."""
    df = q_leaders_comebacks(con, tour, surface, year_min, year_max, level=level)
    return df_to_records(df)


@router.get("/activity", operation_id="get_activity_leaders")
def get_activity_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    sort_by: str = Query("matches", description="Activity sort column such as matches, finals, or tiebreaks."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by activity metrics such as matches played, finals reached, and tiebreaks."""
    df = q_leaders_activity(con, tour, surface, year_min, year_max, level=level, sort_by=sort_by)
    return df_to_records(df)


@router.get("/bakery", operation_id="get_bakery_leaders")
def get_bakery_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    sort_by: str = Query("bagels_given", description="Bakery sort column such as bagels_given or breadsticks_received."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by 6-0 bagels and 6-1 breadsticks given or received."""
    df = q_leaders_bakery(con, tour, surface, year_min, year_max, sort_by=sort_by, level=level)
    return df_to_records(df)


@router.get("/streaks", operation_id="get_streak_leaders")
def get_streaks_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional match surface filter for the underlying matches."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    streak_surface: Optional[str] = Query(None, description="Optional surface restriction for streak calculation."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank the longest win streaks, including fresh active streaks and completed streaks."""
    df = q_leaders_streaks(con, tour, surface, year_min, year_max, level, streak_surface)
    return df_to_records(df)


@router.get("/draw-strength", operation_id="get_draw_strength_leaders")
def get_draw_strength_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest tournament year to include."),
    year_max: Optional[int] = Query(None, description="Latest tournament year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank champions by the average opponent rank they faced in title runs."""
    df = q_leaders_draw_strength(con, tour, surface, year_min, year_max, level)
    return df_to_records(df)


@router.get("/top10-wins", operation_id="get_top10_wins_leaders")
def get_top10_wins_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(5, ge=1, le=1000, description="Minimum matches against top-10 opponents required."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by wins and record against top-10 opponents."""
    df = q_leaders_top10_wins(con, tour, surface, year_min, year_max, min_matches, level)
    return df_to_records(df)


@router.get("/finals", operation_id="get_finals_leaders")
def get_finals_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(3, ge=1, le=1000, description="Minimum finals required to appear on the leaderboard."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by finals reached, titles won, and finals record."""
    df = q_leaders_finals(con, tour, surface, year_min, year_max, min_matches, level)
    return df_to_records(df)


@router.get("/slam-record", operation_id="get_slam_record_leaders")
def get_slam_record_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter, normally Grand Slam."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(10, ge=1, le=1000, description="Minimum Grand Slam matches required."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by Grand Slam match record under optional filters."""
    df = q_leaders_slam_record(con, tour, surface, year_min, year_max, min_matches, level)
    return df_to_records(df)


@router.get("/tiebreaks", operation_id="get_tiebreak_leaders")
def get_tiebreak_leaders(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    min_matches: int = Query(10, ge=1, le=1000, description="Minimum tiebreaks required to appear on the leaderboard."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players by tiebreak wins, losses, and win percentage."""
    df = q_leaders_tiebreaks(con, tour, surface, year_min, year_max, min_matches, level)
    return df_to_records(df)
