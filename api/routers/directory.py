"""Directory API: global search suggestions and slug resolution."""
from __future__ import annotations

from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from api import directory
from api.deps import get_db

router = APIRouter(tags=["directory"])

Tour = Optional[Literal["M", "F"]]


@router.get("/suggest", operation_id="suggest")
def suggest(
    q: str = Query(..., min_length=1, max_length=100, description="What the user has typed."),
    tour: Tour = Query(None, description="Limit to one tour: M for ATP, F for WTA."),
    kind: Literal["all", "players", "tournaments"] = Query("all", description="Which kinds of result to return."),
    exclude: Optional[str] = Query(None, max_length=200, description="A player name to leave out (pair picker)."),
    limit: int = Query(8, ge=1, le=20, description="Maximum players and tournaments each."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Players and tournaments ranked by prominence, plus a detected matchup
    ("sinner alcaraz") or tournament-year ("wimbledon 2025")."""
    return directory.current(con).suggest(q, tour=tour, kind=kind, exclude=exclude, limit=limit)


@router.get("/players/{slug}", operation_id="resolve_player")
def resolve_player(
    slug: str,
    tour: Tour = Query(None, description="Pick one tour when a slug exists on both."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Every player with this slug, most prominent first."""
    found = directory.current(con).players_by_slug(slug, tour)
    if not found:
        raise HTTPException(status_code=404, detail="No player with that slug")
    return {"players": [p.public() for p in found]}


@router.get("/tournaments/{slug}", operation_id="resolve_tournament")
def resolve_tournament(
    slug: str,
    tour: Tour = Query(None, description="Pick one tour when the event exists on both."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Every tournament with this slug (one per tour), with the years held."""
    found = directory.current(con).tournaments_by_slug(slug, tour)
    if not found:
        raise HTTPException(status_code=404, detail="No tournament with that slug")
    return {"tournaments": [t.public(with_years=True) for t in found]}
