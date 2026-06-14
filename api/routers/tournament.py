"""Tournament recap endpoints."""
from __future__ import annotations

from typing import Literal, Optional

import pandas as pd
import duckdb
from fastapi import APIRouter, Depends, Query

from api.deps import get_db
from api.serializers import df_to_records
from db.queries import q_tournament_matches, q_tournament_years, q_recent_champions, q_tournament_draw_strength
from pipeline.cleaner import ROUND_SORT_ORDER

router = APIRouter(tags=["tournament"])

MAIN_DRAW_ROUNDS = {'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128', 'RR', 'BR'}
QUALY_ROUNDS = {'Q1', 'Q2', 'Q3', 'ER'}


def _fmt_rank(r) -> str | None:
    return f"#{int(r)}" if pd.notna(r) else None


@router.get("/years", operation_id="get_tournament_years")
def get_years(
    tournament: str = Query(..., description="Tournament display name, e.g. Wimbledon."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List seasons available for a tournament."""
    return {"years": q_tournament_years(con, tournament=tournament, tour=tour)}


@router.get("/recent-champions", operation_id="get_recent_champions")
def get_recent_champions(
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of recent champions to return."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return recent tournament champions."""
    df = q_recent_champions(con, tour=tour, limit=limit)
    return df_to_records(df)


@router.get("/recap", operation_id="get_tournament_recap")
def get_recap(
    tournament: str = Query(..., description="Tournament display name, e.g. Roland Garros."),
    year: Optional[int] = Query(None, description="Tournament season to recap. If omitted, query behavior follows the database helper default."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Return a tournament recap with round-by-round matches, longest matches, biggest upsets, and stat leaders."""
    df = q_tournament_matches(con, tournament=tournament, year=year, tour=tour)

    if df.empty:
        return {
            "meta": {"tournament": tournament, "year": year, "date": None,
                     "surface": None, "level": None, "level_name": None,
                     "total_matches": 0, "total_upsets": 0},
            "matches_by_round": [],
            "longest_matches": [],
            "biggest_upsets": [],
            "stats": {"aces": [], "first_in_pct": [], "bp_saved": [], "return_win_pct": []},
        }

    # ── Meta ────────────────────────────────────────────────────────────────
    final_mask = df["round"] == "F"
    final_date = str(df.loc[final_mask, "date"].max())[:10] if final_mask.any() else None
    level_val = df["level"].mode().iloc[0] if "level" in df.columns and not df["level"].empty else None
    level_name_val = df["level_name"].mode().iloc[0] if "level_name" in df.columns and not df["level_name"].empty else None
    meta = {
        "tournament": tournament,
        "year": int(year) if year else None,
        "date": final_date,
        "surface": df["surface"].mode().iloc[0] if not df["surface"].empty else None,
        "level": level_val,
        "level_name": level_name_val,
        "total_matches": len(df),
        "total_upsets": int(df["is_upset"].sum()) if "is_upset" in df.columns else 0,
    }

    # ── Matches by round (Final first) ─────────────────────────────────────
    df["_ord"] = df["round"].map(ROUND_SORT_ORDER).fillna(99)
    match_cols = ["round", "winner_name", "winner_rank", "loser_name",
                  "loser_rank", "score", "time", "is_upset", "is_retirement",
                  "winner_aces", "loser_aces", "winner_dfs", "loser_dfs",
                  "winner_pts", "loser_pts", "winner_firsts", "loser_firsts",
                  "winner_fwon", "loser_fwon", "winner_swon", "loser_swon",
                  "winner_saved", "loser_saved", "winner_chances", "loser_chances"]

    matches_by_round = []
    for round_name, grp in (
        df.sort_values("_ord", ascending=False)
          .groupby("round", sort=False)
    ):
        matches_by_round.append({
            "round": round_name,
            "matches": df_to_records(grp[match_cols]),
        })

    # ── Longest matches (all rounds) ────────────────────────────────────────
    longest = (
        df[df["time"].notna()]
        .nlargest(5, "time")[["round", "winner_name", "loser_name", "time", "score"]]
    )

    # ── Biggest upsets ──────────────────────────────────────────────────────
    # Main draw first; allow qualy if rank_diff > 200
    main_mask = df["round"].isin(MAIN_DRAW_ROUNDS)
    upset_mask = df["is_upset"] == True
    qualy_mask = df["round"].isin(QUALY_ROUNDS)

    main_upsets = df[upset_mask & main_mask].copy()
    qualy_upsets = df[upset_mask & qualy_mask & (df["rank_diff"] > 200)].copy()
    all_upsets = pd.concat([main_upsets, qualy_upsets]).drop_duplicates()

    if not all_upsets.empty:
        all_upsets["_ord2"] = all_upsets["round"].map(ROUND_SORT_ORDER).fillna(99)
        biggest_upsets = all_upsets.sort_values("rank_diff", ascending=False).head(5)[
            ["round", "winner_name", "winner_rank", "loser_name", "loser_rank", "score", "rank_diff"]
        ]
    else:
        biggest_upsets = df.iloc[0:0]

    # ── Per-player stats leaders ─────────────────────────────────────────────
    stats = _compute_stats_leaders(df)

    return {
        "meta": meta,
        "matches_by_round": matches_by_round,
        "longest_matches": df_to_records(longest),
        "biggest_upsets": df_to_records(biggest_upsets),
        "stats": stats,
    }


@router.get("/draw-strength", operation_id="get_tournament_draw_strength")
def get_draw_strength(
    tournament: str = Query(..., description="Tournament display name."),
    year: Optional[int] = Query(None, description="Tournament season to analyze."),
    tour: Optional[Literal["M", "F"]] = Query(None, description="Optional tour filter: M for ATP men, F for WTA women."),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Rank players in a tournament by average opponent rank faced."""
    df = q_tournament_draw_strength(con, tournament=tournament, year=year, tour=tour)
    return df_to_records(df)


def _compute_stats_leaders(df: pd.DataFrame) -> dict:
    """Compute per-player stats across all matches in a tournament."""
    has_pts = df["winner_pts"].notna().any()
    if not has_pts:
        return {"aces": [], "dfs": [], "first_serve_won_pct": [], "second_serve_won_pct": [], "return_win_pct": [], "bp_saved": []}

    stats_df = df[df["winner_pts"].notna()].copy()

    # Build unified view: one row per player per match (both as winner and loser perspective)
    w = stats_df[[
        "winner_name", "winner_aces", "winner_dfs", "winner_firsts", "winner_pts",
        "winner_fwon", "winner_swon", "winner_saved", "winner_chances",
        "loser_pts", "loser_fwon", "loser_swon",
    ]].rename(columns={
        "winner_name": "player", "winner_aces": "aces", "winner_dfs": "dfs",
        "winner_firsts": "firsts", "winner_pts": "serve_pts",
        "winner_fwon": "sfwon", "winner_swon": "sswon",
        "winner_saved": "bp_saved", "winner_chances": "bp_faced",
        "loser_pts": "opp_pts", "loser_fwon": "opp_fwon", "loser_swon": "opp_swon",
    })

    l = stats_df[[
        "loser_name", "loser_aces", "loser_dfs", "loser_firsts", "loser_pts",
        "loser_fwon", "loser_swon", "loser_saved", "loser_chances",
        "winner_pts", "winner_fwon", "winner_swon",
    ]].rename(columns={
        "loser_name": "player", "loser_aces": "aces", "loser_dfs": "dfs",
        "loser_firsts": "firsts", "loser_pts": "serve_pts",
        "loser_fwon": "sfwon", "loser_swon": "sswon",
        "loser_saved": "bp_saved", "loser_chances": "bp_faced",
        "winner_pts": "opp_pts", "winner_fwon": "opp_fwon", "winner_swon": "opp_swon",
    })

    combined = pd.concat([w, l], ignore_index=True)

    agg = combined.groupby("player").agg(
        aces=("aces", "sum"),
        dfs=("dfs", "sum"),
        firsts=("firsts", "sum"),
        serve_pts=("serve_pts", "sum"),
        sfwon=("sfwon", "sum"),
        sswon=("sswon", "sum"),
        bp_saved=("bp_saved", "sum"),
        opp_pts=("opp_pts", "sum"),
        opp_fwon=("opp_fwon", "sum"),
        opp_swon=("opp_swon", "sum"),
    ).reset_index()

    agg = agg[agg["serve_pts"] > 0]  # filter before division

    second_serve_pts = (agg["serve_pts"] - agg["firsts"]).replace(0, pd.NA)
    agg["first_serve_won_pct"] = (agg["sfwon"] / agg["firsts"].replace(0, pd.NA) * 100).round(1)
    agg["second_serve_won_pct"] = (agg["sswon"] / second_serve_pts * 100).round(1)
    opp_won = agg["opp_fwon"] + agg["opp_swon"]
    agg["return_win_pct"] = (
        ((agg["opp_pts"] - opp_won) / agg["opp_pts"].replace(0, pd.NA) * 100)
        .round(1)
    )

    def top5(df, col, ascending=False):
        return df_to_records(
            df.dropna(subset=[col]).sort_values(col, ascending=ascending).head(5)[["player", col]]
        )

    return {
        "aces": top5(agg, "aces"),
        "dfs": top5(agg, "dfs"),
        "first_serve_won_pct": top5(agg, "first_serve_won_pct"),
        "second_serve_won_pct": top5(agg, "second_serve_won_pct"),
        "return_win_pct": top5(agg, "return_win_pct"),
        "bp_saved": top5(agg, "bp_saved"),
    }
