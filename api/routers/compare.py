"""Comparison endpoints."""
from __future__ import annotations

from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, Query

from api.deps import get_db
from db.queries import q_common_opponents

router = APIRouter(tags=["compare"])


@router.get("/common-opponents", operation_id="compare_common_opponents")
def get_common_opponents(
    player_a: str = Query(..., description="First full player name."),
    player_b: str = Query(..., description="Second full player name."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    surface: Optional[str] = Query(None, description="Optional surface filter: Hard, Clay, Grass, or Carpet."),
    year_min: Optional[int] = Query(None, description="Earliest match year to include."),
    year_max: Optional[int] = Query(None, description="Latest match year to include."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Compare two players against shared opponents under optional filters."""
    return q_common_opponents(
        con,
        player_a=player_a,
        player_b=player_b,
        tour=tour,
        surface=surface,
        year_min=year_min,
        year_max=year_max,
    )
