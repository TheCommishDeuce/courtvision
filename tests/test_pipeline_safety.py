from __future__ import annotations

from pathlib import Path

import duckdb
import pandas as pd
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


@pytest.fixture()
def pipeline_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Run the real pipeline only against tiny, disposable inputs and database."""
    for name, relative in {
        "DB_PATH": "tennis.duckdb",
        "MASTER_DIR": "master",
        "PARQUET_ATP": "atp",
        "PARQUET_WTA": "wta",
        "ATP_PLAYERS_CSV": "atp.csv",
        "WTA_PLAYERS_CSV": "wta.csv",
    }.items():
        monkeypatch.setattr(run_pipeline, name, tmp_path / relative)

    run_pipeline.PARQUET_ATP.mkdir()
    run_pipeline.PARQUET_WTA.mkdir()
    pd.DataFrame([{
        "unique_match_key": "new-match", "date": "2025-01-01",
        "winner_name": "New ATP", "loser_name": "Opponent", "tour": "M",
        "tournament": "Test Open", "level": "A", "round": "F", "score": "6-4 6-4",
    }]).to_parquet(run_pipeline.PARQUET_ATP / "player.parquet", index=False)
    for path, tour in [(run_pipeline.ATP_PLAYERS_CSV, "ATP"), (run_pipeline.WTA_PLAYERS_CSV, "WTA")]:
        pd.DataFrame([{
            "player_id": "2", "tour": tour, "name": f"New {tour}", "url_name": f"New{tour}",
            "country": "USA", "birthdate": "2000-01-01", "current_rank": 10,
            "hand": "R", "height": 180, "historically_ranked": True,
        }]).to_csv(path, index=False)

    con = pipeline.loader.init_duckdb(run_pipeline.DB_PATH, run_pipeline.SCHEMA_PATH)
    con.execute("INSERT INTO matches_main (unique_match_key, winner_name, loser_name, tour) VALUES ('old-match', 'Old ATP', 'Opponent', 'M')")
    con.execute("INSERT INTO players (player_id, tour, name) VALUES ('1', 'M', 'Old ATP'), ('1', 'F', 'Old WTA')")
    con.close()

    opened = []
    original_init = pipeline.loader.init_duckdb

    def tracked_init(*args, **kwargs):
        connection = original_init(*args, **kwargs)
        opened.append(connection)
        return connection

    monkeypatch.setattr(pipeline.loader, "init_duckdb", tracked_init)
    yield opened
    for connection in opened:
        connection.close()


def _database_snapshot() -> tuple[list, list]:
    # Same configuration as the pipeline, allowing inspection even if the old
    # implementation leaks a connection. No access to the project's real DB.
    con = pipeline.loader.get_db(read_only=False, path=run_pipeline.DB_PATH)
    try:
        return (
            con.execute("SELECT unique_match_key FROM matches_main ORDER BY 1").fetchall(),
            con.execute("SELECT tour, name FROM players ORDER BY tour").fetchall(),
        )
    finally:
        con.close()


@pytest.mark.parametrize("failure_stage", ["matches", "atp", "wta"])
def test_failed_reload_preserves_matches_and_both_player_tours(
    pipeline_files, monkeypatch: pytest.MonkeyPatch, failure_stage: str,
) -> None:
    before = _database_snapshot()
    if failure_stage == "matches":
        original_load = pipeline.loader.load_parquet_to_duckdb

        def missing_parquet(con, parquet_path, mode):
            # Force a real DuckDB failure after DELETE has executed.
            return original_load(con, parquet_path + ".missing", mode)

        monkeypatch.setattr(pipeline.loader, "load_parquet_to_duckdb", missing_parquet)
    else:
        path = run_pipeline.ATP_PLAYERS_CSV if failure_stage == "atp" else run_pipeline.WTA_PLAYERS_CSV
        players = pd.read_csv(path)
        players["current_rank"] = "invalid-rank"
        players.to_csv(path, index=False)

    with pytest.raises(duckdb.Error):
        run_pipeline.main.callback()

    assert _database_snapshot() == before
    for con in pipeline_files:
        with pytest.raises(duckdb.ConnectionException):
            con.execute("SELECT 1")


def test_interrupted_reload_rolls_back(pipeline_files, monkeypatch: pytest.MonkeyPatch) -> None:
    def interrupt(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr(pipeline.loader, "load_players_to_duckdb", interrupt)
    before = _database_snapshot()
    with pytest.raises(KeyboardInterrupt):
        run_pipeline.main.callback()
    assert _database_snapshot() == before
    for con in pipeline_files:
        with pytest.raises(duckdb.ConnectionException):
            con.execute("SELECT 1")


def test_successful_reload_commits_both_tours_and_is_repeatable(pipeline_files) -> None:
    # The fixture's stored key is stale; the merge recomputes it from the row.
    expected = ([('20250101fnewatpopponent',)], [('F', 'New WTA'), ('M', 'New ATP')])
    run_pipeline.main.callback()
    assert _database_snapshot() == expected
    run_pipeline.main.callback()
    assert _database_snapshot() == expected
    for con in pipeline_files:
        with pytest.raises(duckdb.ConnectionException):
            con.execute("SELECT 1")


def test_preparation_failure_does_not_leave_database_open(pipeline_files, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_to_write(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(pipeline.loader, "write_master_parquet", fail_to_write)
    before = _database_snapshot()
    with pytest.raises(OSError, match="disk full"):
        run_pipeline.main.callback()
    assert _database_snapshot() == before
    for con in pipeline_files:
        with pytest.raises(duckdb.ConnectionException):
            con.execute("SELECT 1")
