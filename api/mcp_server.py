"""MCP server integration for the FastAPI app."""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI


def setup_mcp(app: FastAPI) -> Any | None:
    """Mount the auto-generated MCP server when fastapi-mcp is installed."""
    try:
        from fastapi_mcp import FastApiMCP
    except ImportError:
        return None

    mcp = FastApiMCP(
        app,
        name="CourtVision Tennis API",
        description=(
            "Professional tennis statistics covering ATP and WTA player profiles, "
            "head-to-head records, match search, tournament recaps, and leaderboards."
        ),
        describe_all_responses=True,
        describe_full_response_schema=True,
    )
    mount_http = getattr(mcp, "mount_http", None)
    if callable(mount_http):
        mount_http()
    else:
        mcp.mount()
    return mcp

