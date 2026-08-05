from __future__ import annotations

from pathlib import Path

import pytest

import pipeline.loader
import run_pipeline


def test_missing_player_csv_aborts_before_database_initialization(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(run_pipeline, "ATP_PLAYERS_CSV", tmp_path / "missing-atp.csv")
    monkeypatch.setattr(run_pipeline, "WTA_PLAYERS_CSV", tmp_path / "missing-wta.csv")

    initialized = False

    def fail_if_initialized(*args, **kwargs):
        nonlocal initialized
        initialized = True
        raise AssertionError("database initialization must not run")

    monkeypatch.setattr(pipeline.loader, "init_duckdb", fail_if_initialized)

    with pytest.raises(FileNotFoundError, match="Aborting before the database is modified"):
        run_pipeline.main.callback()

    assert initialized is False
