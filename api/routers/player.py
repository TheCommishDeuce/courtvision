"""Player profile endpoints."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, Query

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import (
    q_player_matches,
    q_player_matches_with_walkovers,
    q_player_summary,
    q_player_serve_stats,
    q_player_return_stats,
    q_player_serve_percentiles,
    q_player_return_percentiles,
    q_top_n_records,
    q_player_rank_history,
    q_surface_level_heatmap,
    q_player_milestones,
    q_similar_players,
    q_similar_players_return,
    q_player_form,
)

router = APIRouter(tags=["player"])


def _as_date(value: object) -> Optional[date]:
    if value is None:
        return None
    s = str(value)[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


@router.get("/summary", operation_id="get_player_summary")
def get_summary(
    player: str = Query(..., description="Full player name, e.g. Novak Djokovic."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Summarize a player's career record, titles, rankings, and filtered win/loss totals."""
    return q_player_summary(con, player_name=player, tour=tour,
                            year_min=year_min, year_max=year_max, surface=surface)


@router.get("/matches", operation_id="get_player_matches")
def get_matches(
    player: str = Query(..., description="Full player name, e.g. Serena Williams."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or WTA 500."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return a player's match history summaries, recent form, and breakdowns by surface, level, and year."""
    df = q_player_matches(
        con,
        player_name=player,
        surface=surface,
        level=level,
        year_min=year_min,
        year_max=year_max,
        tour=tour,
    )
    df_recent = q_player_matches_with_walkovers(
        con,
        player_name=player,
        surface=surface,
        level=level,
        year_min=year_min,
        year_max=year_max,
        tour=tour,
    )

    if df.empty:
        return {"total": 0, "by_surface": [], "by_level": [], "by_year": [], "last20": [], "recent52w": []}

    by_surface_df = (
        df.groupby("surface")
        .agg(wins=("result", lambda x: (x == "W").sum()), total=("result", "count"))
        .assign(win_pct=lambda d: round(d["wins"] / d["total"] * 100, 1))
        .reset_index()
    )
    by_level_df = (
        df.groupby("level_name")
        .agg(wins=("result", lambda x: (x == "W").sum()), total=("result", "count"))
        .assign(win_pct=lambda d: round(d["wins"] / d["total"] * 100, 1))
        .reset_index()
    )
    by_year_df = (
        df.groupby("year")
        .agg(wins=("result", lambda x: (x == "W").sum()), total=("result", "count"))
        .assign(win_pct=lambda d: round(d["wins"] / d["total"] * 100, 1))
        .reset_index()
    )

    most_recent = None
    for raw in df_recent["date"]:
        d = _as_date(raw)
        if d is not None:
            most_recent = d
            break
    if most_recent is not None:
        cutoff = most_recent - timedelta(days=364)
        recent52_df = df_recent[df_recent["date"].apply(lambda v: (d := _as_date(v)) is not None and d >= cutoff)]
    else:
        recent52_df = df_recent.head(0)

    return {
        "total": len(df),
        "by_surface": df_to_records(by_surface_df),
        "by_level": df_to_records(by_level_df),
        "by_year": df_to_records(by_year_df),
        "last20": df_to_records(df.head(20)),
        "recent52w": df_to_records(recent52_df),
    }


@router.get("/serve-stats", operation_id="get_player_serve_stats")
def get_serve_stats(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return aggregated serve metrics for a player, including ace rate, first-serve rates, and break points saved."""
    return q_player_serve_stats(con, player_name=player, tour=tour,
                                surface=surface, year_min=year_min, year_max=year_max)


@router.get("/return-stats", operation_id="get_player_return_stats")
def get_return_stats(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return aggregated return metrics for a player, including first- and second-serve return points won."""
    return q_player_return_stats(con, player_name=player, tour=tour,
                                 surface=surface, year_min=year_min, year_max=year_max)


@router.get("/serve-percentiles", operation_id="get_player_serve_percentiles")
def get_serve_percentiles(
    player: str = Query(..., description="Full player name."),
    tour: Literal["M", "F"] = Query(..., description="Tour to compare against: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Compare a player's serve statistics against tour-wide percentile distributions."""
    return q_player_serve_percentiles(con, player_name=player, tour=tour)


@router.get("/return-percentiles", operation_id="get_player_return_percentiles")
def get_return_percentiles(
    player: str = Query(..., description="Full player name."),
    tour: Literal["M", "F"] = Query(..., description="Tour to compare against: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Compare a player's return statistics against tour-wide percentile distributions."""
    return q_player_return_percentiles(con, player_name=player, tour=tour)


@router.get("/top-n-records", operation_id="get_player_top_n_records")
def get_top_n_records(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return a player's record against top-5, top-10, top-20, top-50, and top-100 opponents."""
    return q_top_n_records(
        con,
        player_name=player,
        tour=tour,
        surface=surface,
        level=level,
        year_min=year_min,
        year_max=year_max,
    )


@router.get("/rank-history", operation_id="get_player_rank_history")
def get_rank_history(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    year_min: Optional[int] = Query(None, description="Earliest ranking year to include."),
    year_max: Optional[int] = Query(None, description="Latest ranking year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return a player's match-by-match ranking history for trend charts."""
    df = q_player_rank_history(con, player_name=player, tour=tour,
                               year_min=year_min, year_max=year_max)
    return df_to_records(df)


@router.get("/surface-heatmap", operation_id="get_player_surface_heatmap")
def get_surface_heatmap(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return win percentage by surface and tournament level for a player."""
    df = q_surface_level_heatmap(con, player_name=player, tour=tour,
                                  year_min=year_min, year_max=year_max)
    return df_to_records(df)


@router.get("/milestones", operation_id="get_player_milestones")
def get_milestones(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return career milestones such as first top ranking thresholds and first title."""
    return q_player_milestones(con, player_name=player, tour=tour)


@router.get("/similar", operation_id="get_similar_serve_players")
def get_similar_players(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    min_matches: int = Query(50, ge=10, le=1000, description="Minimum matches required for comparison candidates."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Find players with similar serve profiles using distance across serve metrics."""
    df = q_similar_players(con, player_name=player, tour=tour, min_matches=min_matches)
    return df_to_records(df)


@router.get("/similar-return", operation_id="get_similar_return_players")
def get_similar_players_return(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    min_matches: int = Query(50, ge=10, le=1000, description="Minimum matches required for comparison candidates."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Find players with similar return profiles using distance across return metrics."""
    df = q_similar_players_return(con, player_name=player, tour=tour, min_matches=min_matches)
    return df_to_records(df)


@router.get("/form", operation_id="get_player_form")
def get_player_form(
    player: str = Query(..., description="Full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return recent form metrics and trend summaries for a player."""
    return q_player_form(con, player_name=player, tour=tour,
                         surface=surface, level=level,
                         year_min=year_min, year_max=year_max)
