"""Parquet writer and DuckDB ingestion."""
import logging
from pathlib import Path

import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from db.connection import get_db
from pipeline.cleaner import clean_dtypes
from pipeline.enricher import add_derived_columns

logger = logging.getLogger(__name__)

PARQUET_SCHEMA_COLUMNS = [
    'unique_match_key', 'date', 'tournament', 'surface', 'level', 'level_name',
    'round', 'score', 'time', 'winner_name', 'loser_name',
    'winner_rank', 'loser_rank',
    'winner_aces', 'loser_aces', 'winner_dfs', 'loser_dfs',
    'winner_pts', 'loser_pts', 'winner_firsts', 'loser_firsts',
    'winner_fwon', 'loser_fwon', 'winner_swon', 'loser_swon',
    'winner_games', 'loser_games', 'winner_saved', 'loser_saved',
    'winner_chances', 'loser_chances',
    'winner_tb_won', 'winner_tb_lost', 'loser_tb_won', 'loser_tb_lost',
    'tour', 'year', 'num_sets', 'is_retirement', 'is_walkover', 'is_complete',
    'had_tiebreak', 'is_upset', 'rank_diff',
]


def _prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    """Clean, enrich, and align columns for storage."""
    df = clean_dtypes(df)
    df = add_derived_columns(df)

    # Ensure all schema columns exist
    for col in PARQUET_SCHEMA_COLUMNS:
        if col not in df.columns:
            df[col] = None

    return df[PARQUET_SCHEMA_COLUMNS]


def write_player_parquet(df: pd.DataFrame, out_path: Path) -> None:
    """Write a single player's processed DataFrame to parquet."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    prepped = _prepare_df(df)
    prepped.to_parquet(out_path, index=False, engine='pyarrow')
    logger.debug(f"Wrote {len(prepped)} rows to {out_path}")


def write_master_parquet(df: pd.DataFrame, out_dir: Path) -> None:
    """Write flat master parquet (single file, all columns included)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    prepped = _prepare_df(df)
    out_path = out_dir / 'matches.parquet'
    prepped.to_parquet(out_path, index=False, engine='pyarrow')
    logger.info(f"Wrote {len(prepped)} rows to master parquet at {out_path}")


def init_duckdb(db_path: Path, schema_sql_path: Path) -> duckdb.DuckDBPyConnection:
    """Create/open DuckDB and apply schema."""
    con = get_db(read_only=False, path=db_path)
    schema = schema_sql_path.read_text()
    # Execute statements one at a time
    for stmt in [s.strip() for s in schema.split(';') if s.strip()]:
        con.execute(stmt)
    logger.info(f"DuckDB initialized at {db_path}")
    return con


def _drop_stale_secondary_indexes(con: duckdb.DuckDBPyConnection) -> None:
    """Drop any secondary indexes left on matches_main by older schema versions.

    These VARCHAR ART indexes provided no measurable query benefit (DuckDB serves
    the analytical scans via columnar storage + zonemaps) but made the full-reload
    INSERT pathologically slow and bloated the DB file. Existing DB files still
    physically carry them, so we remove them before loading to keep reloads fast.
    The PRIMARY KEY index is part of the table definition and is left intact.
    """
    rows = con.execute(
        """
        SELECT index_name FROM duckdb_indexes()
        WHERE table_name = 'matches_main' AND is_primary = false
        """
    ).fetchall()
    for (name,) in rows:
        con.execute(f'DROP INDEX IF EXISTS "{name}"')
        logger.info(f"Dropped stale secondary index {name}")


def load_parquet_to_duckdb(
    con: duckdb.DuckDBPyConnection,
    parquet_path: str,
    mode: str = 'full',
) -> int:
    """
    Load parquet file(s) into matches_main.
    mode='full'        → DELETE + INSERT (idempotent full reload)
    mode='incremental' → INSERT OR IGNORE (skip existing keys)
    Returns number of rows inserted.
    """
    where = "WHERE winner_name IS NOT NULL AND loser_name IS NOT NULL AND tour IS NOT NULL"
    if mode == 'full':
        _drop_stale_secondary_indexes(con)
        con.execute("DELETE FROM matches_main")
        con.execute(
            f"INSERT INTO matches_main SELECT * FROM read_parquet(?) {where}",
            [parquet_path],
        )
    else:
        con.execute(
            f"INSERT OR IGNORE INTO matches_main SELECT * FROM read_parquet(?) {where}",
            [parquet_path],
        )
    count = con.execute("SELECT COUNT(*) FROM matches_main").fetchone()[0]
    logger.info(f"matches_main now has {count} rows")
    # Flush the WAL into the main DB file so the database is not left held open
    # by a lingering .wal and disk space from the prior DELETE is reclaimed.
    con.execute("CHECKPOINT")
    return count


def load_players_to_duckdb(con: duckdb.DuckDBPyConnection, csv_path: Path, *, clear: bool = False) -> None:
    """Load players reference CSV into players table."""
    if clear:
        con.execute("DELETE FROM players")
    con.execute(
        f"""
        INSERT INTO players
        SELECT
            CAST(player_id AS VARCHAR),
            CASE WHEN tour = 'ATP' THEN 'M' ELSE 'F' END AS tour,
            name, url_name, country,
            TRY_CAST(birthdate AS DATE),
            CAST(current_rank AS INTEGER),
            hand,
            CAST(height AS DOUBLE),
            CAST(historically_ranked AS BOOLEAN)
        FROM read_csv_auto(?, header=True)
        WHERE player_id IS NOT NULL
          AND TRY_CAST(player_id AS DOUBLE) IS NOT NULL
          AND name IS NOT NULL
        """,
        [str(csv_path)],
    )
    count = con.execute("SELECT COUNT(*) FROM players").fetchone()[0]
    logger.info(f"players table has {count} rows")
