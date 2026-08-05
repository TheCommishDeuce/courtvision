from __future__ import annotations

from fastapi.testclient import TestClient

import api.main
from api.main import app

client = TestClient(app)
DASHBOARD_HEADERS = {
    "X-CourtVision-Client": "dashboard",
    "Origin": "http://localhost:5173",
}


def test_dashboard_api_rejects_direct_requests() -> None:
    response = client.get("/api/not-a-route")
    assert response.status_code == 403
    assert response.json() == {"detail": "Forbidden"}


def test_dashboard_api_requires_browser_source_and_client_header() -> None:
    header_only = client.get(
        "/api/not-a-route",
        headers={"X-CourtVision-Client": "dashboard"},
    )
    source_only = client.get(
        "/api/not-a-route",
        headers={"Origin": "http://localhost:5173"},
    )

    assert header_only.status_code == 403
    assert source_only.status_code == 403


def test_dashboard_api_allows_configured_frontend_origin() -> None:
    response = client.get("/api/not-a-route", headers=DASHBOARD_HEADERS)
    assert response.status_code == 404


def test_removed_routes_are_unavailable() -> None:
    for path in (
        "/mcp",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/portal/me",
        "/api/search/matches/csv",
        "/api/analysis/youngest-stage",
        "/api/analysis/tour-level-season-leaders",
    ):
        response = client.get(path, headers=DASHBOARD_HEADERS)
        assert response.status_code == 404, path


def test_health_is_public_and_minimal(monkeypatch) -> None:
    class Connection:
        def execute(self, sql: str):
            assert sql == "SELECT 1"
            return self

        def fetchone(self):
            return (1,)

        def close(self) -> None:
            pass

    monkeypatch.setattr(api.main, "open_tennis_db", lambda read_only: Connection())
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_failure_does_not_expose_exception(monkeypatch) -> None:
    def fail(*, read_only: bool):
        raise RuntimeError("/secret/database/path")

    monkeypatch.setattr(api.main, "open_tennis_db", fail)
    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"detail": "Service unavailable"}
    assert "/secret/database/path" not in response.text
