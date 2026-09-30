#!/usr/bin/env python3
"""
CLI: python run_pipeline.py

  1. Load all per-player scraper parquets from data/parquet/atp/ + wta/
  2. Deduplicate on unique_match_key
  3. Clean dtypes + add derived columns
  4. Write master parquet
  5. Reload matches and both player references in one transaction
"""
import logging
import sys
from pathlib import Path

import click
import pandas as pd

BASE_DIR = Path(__file__).parent
PARQUET_ATP = BASE_DIR / 'data' / 'parquet' / 'atp'
PARQUET_WTA = BASE_DIR / 'data' / 'parquet' / 'wta'
MASTER_DIR  = BASE_DIR / 'data' / 'parquet' / 'master'
DB_PATH     = BASE_DIR / 'data' / 'tennis.duckdb'
SCHEMA_PATH = BASE_DIR / 'db' / 'schema.sql'
REFERENCE_DIR = BASE_DIR / 'data' / 'reference'
ATP_PLAYERS_CSV = REFERENCE_DIR / 'atp_players_cleaned.csv'
WTA_PLAYERS_CSV = REFERENCE_DIR / 'wta_players_cleaned.csv'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def _require_player_csvs() -> list[Path]:
    player_csvs = [ATP_PLAYERS_CSV, WTA_PLAYERS_CSV]
    missing_csvs = [csv for csv in player_csvs if not csv.exists()]
    if missing_csvs:
        raise FileNotFoundError(
            f'Player reference CSV(s) not found: {[str(c) for c in missing_csvs]}. '
            'Aborting before the database is modified.'
        )
    return player_csvs


@click.command()
def main() -> None:
    player_csvs = _require_player_csvs()

    from pipeline.deduplicator import merge_all_tours_from_parquets
    from pipeline.loader import (
        init_duckdb, write_master_parquet, load_parquet_to_duckdb,
        load_players_to_duckdb,
    )

    parquet_files = list(PARQUET_ATP.glob('*.parquet')) + list(PARQUET_WTA.glob('*.parquet'))
    logger.info(f'Step 1/3: Loading and deduplicating {len(parquet_files)} scraper parquets ...')
    # API queries join `players` on exact name, so its spellings win when one
    # player's matches arrive under several.
    reference_names = set(pd.concat(
        [pd.read_csv(csv, usecols=['name'])['name'] for csv in player_csvs]
    ).dropna())
    df = merge_all_tours_from_parquets(PARQUET_ATP, PARQUET_WTA, preferred_names=reference_names)
    logger.info(f'Loaded {len(df):,} unique matches')

    logger.info('Step 2/3: Cleaning, enriching, and writing master parquet ...')
    write_master_parquet(df, MASTER_DIR)

    logger.info('Step 3/3: Loading into DuckDB ...')
    # Prepare files before opening the database. Publish matches and both tours
    # together so a failed insert cannot leave an empty or mixed-generation DB.
    con = init_duckdb(DB_PATH, SCHEMA_PATH)
    try:
        con.execute('BEGIN TRANSACTION')
        try:
            rows = load_parquet_to_duckdb(con, str(MASTER_DIR / 'matches.parquet'), mode='full')
            for i, csv in enumerate(player_csvs):
                load_players_to_duckdb(con, csv, clear=(i == 0))
            con.execute('COMMIT')
        except BaseException:
            con.execute('ROLLBACK')
            raise
        # CHECKPOINT must run after the transaction, never inside a loader.
        con.execute('CHECKPOINT')
        logger.info(f'DuckDB loaded: {rows:,} rows')
        logger.info('Pipeline complete.')
    finally:
        con.close()


if __name__ == '__main__':
    main()
