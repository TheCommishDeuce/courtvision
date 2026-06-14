#!/usr/bin/env python3
"""
CLI: python run_pipeline.py

  1. Load all per-player scraper parquets from data/parquet/atp/ + wta/
  2. Deduplicate on unique_match_key
  3. Clean dtypes + add derived columns
  4. Write master parquet
  5. Reload DuckDB (DELETE + INSERT)
  6. Load players reference
"""
import logging
import sys
from pathlib import Path

import click

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


@click.command()
def main() -> None:
    from pipeline.deduplicator import merge_all_tours_from_parquets
    from pipeline.loader import (
        init_duckdb, write_master_parquet, load_parquet_to_duckdb,
        load_players_to_duckdb, _prepare_df,
    )

    con = init_duckdb(DB_PATH, SCHEMA_PATH)

    parquet_files = list(PARQUET_ATP.glob('*.parquet')) + list(PARQUET_WTA.glob('*.parquet'))
    logger.info(f'Step 1/4: Loading and deduplicating {len(parquet_files)} scraper parquets ...')
    df = merge_all_tours_from_parquets(PARQUET_ATP, PARQUET_WTA)
    logger.info(f'Loaded {len(df):,} unique matches')

    logger.info('Step 2/4: Cleaning + enriching ...')
    df = _prepare_df(df)

    logger.info('Step 3/4: Writing master parquet ...')
    write_master_parquet(df, MASTER_DIR)

    logger.info('Step 4/4: Loading into DuckDB ...')
    rows = load_parquet_to_duckdb(con, str(MASTER_DIR / 'matches.parquet'), mode='full')
    logger.info(f'DuckDB loaded: {rows:,} rows')

    player_csvs = [csv for csv in [ATP_PLAYERS_CSV, WTA_PLAYERS_CSV] if csv.exists()]
    for i, csv in enumerate(player_csvs):
        load_players_to_duckdb(con, csv, clear=(i == 0))

    logger.info('Pipeline complete.')
    con.close()


if __name__ == '__main__':
    main()
