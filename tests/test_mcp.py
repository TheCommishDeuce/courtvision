from __future__ import annotations

import importlib.util

import pytest
from fastapi.testclient import TestClient

from api.main import app


def test_mcp_endpoint_requires_auth() -> None:
    client = TestClient(app)
    response = client.get("/mcp")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing Authorization: Bearer API key"


def test_openapi_includes_mcp_tool_metadata() -> None:
    client = TestClient(app)
    schema = client.get("/openapi.json").json()

    h2h = schema["paths"]["/api/h2h"]["get"]
    assert h2h["operationId"] == "get_head_to_head"
    assert "head-to-head" in h2h["description"]
    params = {param["name"]: param for param in h2h["parameters"]}
    assert params["player_a"]["description"]
    assert params["tour"]["description"] == "Tour filter: M for ATP men, F for WTA women."

    summary = schema["paths"]["/api/player/summary"]["get"]
    assert summary["operationId"] == "get_player_summary"
    assert "career record" in summary["description"]

    search = schema["paths"]["/api/search/matches"]["get"]
    assert search["operationId"] == "search_matches"
    assert "Search historical tennis matches" in search["description"]


def test_openapi_uses_explicit_operation_ids_for_all_tool_routes() -> None:
    client = TestClient(app)
    schema = client.get("/openapi.json").json()
    operation_ids = {
        methods["get"]["operationId"]
        for path, methods in schema["paths"].items()
        if path.startswith("/api/") and path != "/api/health" and "get" in methods
    }

    assert operation_ids == {
        "compare_common_opponents",
        "download_matches_csv",
        "get_activity_combined_leaders",
        "get_activity_leaders",
        "get_bakery_leaders",
        "get_comeback_leaders",
        "get_comeback_scatter",
        "get_country_leaders",
        "get_database_stats",
        "get_draw_strength_leaders",
        "get_filter_constants",
        "get_finals_leaders",
        "get_head_to_head",
        "get_match_extremes",
        "get_nationality_stage_reached",
        "get_player_form",
        "get_player_matches",
        "get_player_milestones",
        "get_player_rank_history",
        "get_player_return_percentiles",
        "get_player_return_stats",
        "get_player_serve_percentiles",
        "get_player_serve_stats",
        "get_player_summary",
        "get_player_surface_heatmap",
        "get_player_top_n_records",
        "portal_get_me",
        "portal_get_usage",
        "portal_list_keys",
        "get_recent_champions",
        "get_recent_upsets",
        "get_return_leaders",
        "get_serve_leaders",
        "get_similar_return_players",
        "get_similar_serve_players",
        "get_slam_record_leaders",
        "get_storylines",
        "get_streak_leaders",
        "get_tiebreak_leaders",
        "get_top10_wins_leaders",
        "get_tournament_draw_strength",
        "get_tournament_recap",
        "get_tournament_years",
        "get_tour_level_season_leaders",
        "get_upset_leaders",
        "get_wins_leaders",
        "get_year_range",
        "get_youngest_tournament_stage_reached",
        "list_countries",
        "list_players",
        "list_tournaments",
        "search_matches",
        "search_relational_matches",
    }


def test_mcp_mount_registered_when_dependency_is_installed() -> None:
    if importlib.util.find_spec("fastapi_mcp") is None:
        pytest.skip("fastapi-mcp is not installed")

    assert any(getattr(route, "path", "") == "/mcp" for route in app.routes)
