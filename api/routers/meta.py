"""Meta endpoints — player/tournament lists, year range, constants."""
from __future__ import annotations

from typing import Literal, Optional

import duckdb
from fastapi import APIRouter, Depends, Query

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import q_all_countries, q_all_player_names, q_all_tournaments, q_year_range, q_meta_stats, q_recent_upsets, q_recent_champions, q_storylines

router = APIRouter(tags=["meta"])

# Constants mirrored by the React filter components.
SURFACES = ["Hard", "Clay", "Grass", "Carpet"]

LEVELS_ATP = {
    "Grand Slam": "Grand Slam",
    "Masters 1000": "Masters 1000",
    "ATP 250/500": "ATP 250/500",
    "Tour Finals": "Tour Finals",
    "Olympics": "Olympics",
    "Davis Cup": "Davis Cup",
    "Challenger": "Challenger",
    "ITF": "ITF",
}
LEVELS_WTA = {
    "Grand Slam": "Grand Slam",
    "Masters 1000": "Masters 1000",   # PM + Tier I
    "WTA 500": "WTA 500",             # Premier + Tier II
    "WTA 250": "WTA 250",             # International + Tier III/IV/V
    "Tour Finals": "Tour Finals",
    "Olympics": "Olympics",
    "BJK Cup": "BJK Cup",
    "Challenger": "Challenger",
    "ITF": "ITF",
    "WTA": "WTA",                     # Pre-tier era events
}
TOURS = {"ATP (Men)": "M", "WTA (Women)": "F"}
ROUNDS = ["F", "SF", "QF", "R16", "R32", "R64", "R128", "RR", "BR"]
HANDS = {"Left": "L", "Right": "R"}
OPP_RELATIONS = {"Compatriot": "compatriot", "Foreign": "foreign"}
OPP_AGE_RELATIONS = {"Younger": "younger", "Older": "older"}
LEVEL_GROUPS = {
    "All Tour": "Main-tour events: Grand Slam, Masters 1000, ATP 250/500, WTA 500, WTA 250, Tour Finals, Olympics, excluding qualifying rounds.",
    "All Dev": "Development-level events: Challenger/ITF plus qualifying rounds at main-tour events.",
}


@router.get("/players", operation_id="list_players")
def get_players(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List canonical player names available in the database."""
    return {"players": q_all_player_names(con, tour=tour)}


@router.get("/tournaments", operation_id="list_tournaments")
def get_tournaments(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List tournament names available in the database."""
    return {"tournaments": q_all_tournaments(con, tour=tour)}


@router.get("/year-range", operation_id="get_year_range")
def get_year_range(con: duckdb.DuckDBPyConnection = Depends(get_db)):
    """Return the minimum and maximum seasons covered by the database."""
    year_min, year_max = q_year_range(con)
    return {"year_min": year_min, "year_max": year_max}


@router.get("/constants", operation_id="get_filter_constants")
def get_constants():
    """Return canonical surface, level, tour, and round constants for filters."""
    return {
        "surfaces": SURFACES,
        "levels_atp": LEVELS_ATP,
        "levels_wta": LEVELS_WTA,
        "level_groups": LEVEL_GROUPS,
        "tours": TOURS,
        "rounds": ROUNDS,
        "hands": HANDS,
        "opp_relations": OPP_RELATIONS,
        "opp_age_relations": OPP_AGE_RELATIONS,
    }


@router.get("/countries", operation_id="list_countries")
def get_countries(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List player countries as 3-letter ISO codes with player counts, ordered by frequency."""
    return {"countries": q_all_countries(con, tour=tour)}


@router.get("/stats", operation_id="get_database_stats")
def get_stats(con: duckdb.DuckDBPyConnection = Depends(get_db)):
    """Return aggregate database counts and headline statistics."""
    return q_meta_stats(con)


@router.get("/recent-upsets", operation_id="get_recent_upsets")
def get_recent_upsets(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    limit: int = Query(8, ge=1, le=20, description="Maximum number of recent upset matches to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return recent matches where the lower-ranked player beat the higher-ranked player."""
    df = q_recent_upsets(con, tour=tour, limit=limit)
    return df_to_records(df)


@router.get("/storylines", operation_id="get_storylines")
def get_storylines(
    limit: int = Query(6, ge=1, le=12, description="Maximum number of dashboard storylines to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return current dashboard storylines generated from recent data."""
    return q_storylines(con, limit=limit)
