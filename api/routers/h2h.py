"""H2H endpoint."""
from __future__ import annotations

from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import q_h2h

router = APIRouter(tags=["h2h"])


@router.get("", operation_id="get_head_to_head")
def get_h2h(
    player_a: str = Query(..., description="First full player name, e.g. Novak Djokovic."),
    player_b: str = Query(..., description="Second full player name, e.g. Rafael Nadal."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    level: Optional[str] = Query(None, description="Optional tournament level filter such as Grand Slam or Masters 1000."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Compare two tennis players head-to-head with match list, timeline, and surface/level breakdowns."""
    df = q_h2h(
        con,
        player_a=player_a,
        player_b=player_b,
        surface=surface,
        level=level,
        year_min=year_min,
        year_max=year_max,
        tour=tour,
    )

    if df.empty:
        return {
            "summary": {"player_a": player_a, "player_b": player_b, "wins_a": 0, "wins_b": 0},
            "by_surface": [],
            "by_level": [],
            "timeline": [],
            "matches": [],
        }

    wins_a = int((df["winner_name"] == player_a).sum())
    wins_b = int((df["winner_name"] == player_b).sum())

    # by_surface
    by_surface_df = (
        df.groupby(["surface", "winner_name"])
        .size()
        .reset_index(name="wins")
    )
    by_surface = df_to_records(by_surface_df)

    # by_level
    by_level_df = (
        df.groupby(["level_name", "winner_name"])
        .size()
        .reset_index(name="wins")
    )
    by_level = df_to_records(by_level_df)

    return {
        "summary": {
            "player_a": player_a,
            "player_b": player_b,
            "wins_a": wins_a,
            "wins_b": wins_b,
        },
        "by_surface": by_surface,
        "by_level": by_level,
        "timeline": df_to_records(df),
        "matches": df_to_records(df),
    }
