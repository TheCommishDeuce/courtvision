"""Merge per-player CSVs and deduplicate on unique_match_key."""
import re
import logging
from pathlib import Path

import numpy as np
import pandas as pd
from tqdm import tqdm

logger = logging.getLogger(__name__)

CSV_COLUMNS_ORDER = [
    'matchid', 'date', 'tournament', 'surface', 'level', 'round', 'score', 'time',
    'winner_name', 'loser_name',
    'winner_rank', 'winner_aces', 'winner_dfs', 'winner_pts', 'winner_firsts',
    'winner_fwon', 'winner_swon', 'winner_games', 'winner_saved', 'winner_chances',
    'winner_tb_won', 'winner_tb_lost',
    'loser_aces', 'loser_dfs', 'loser_pts', 'loser_firsts',
    'loser_fwon', 'loser_swon', 'loser_games', 'loser_saved', 'loser_chances',
    'loser_tb_won', 'loser_tb_lost',
    'loser_rank',
]


def make_unique_key(row) -> str:
    """
    Canonical unique key: date + round + winner_name + loser_name,
    with all spaces and hyphens stripped.
    """
    parts = [
        str(row.get('date', '') or ''),
        str(row.get('round', '') or ''),
        str(row.get('winner_name', '') or ''),
        str(row.get('loser_name', '') or ''),
    ]
    combined = ''.join(parts)
    return re.sub(r'[\s\-]', '', combined)


def _make_unique_key_vectorized(df: pd.DataFrame) -> pd.Series:
    """Vectorized version of make_unique_key for DataFrames."""
    combined = (
        df['date'].astype(str).str.replace(r'[\s\-]', '', regex=True) +
        df['round'].fillna('').astype(str).str.replace(r'[\s\-]', '', regex=True) +
        df['winner_name'].fillna('').astype(str).str.replace(r'[\s\-]', '', regex=True) +
        df['loser_name'].fillna('').astype(str).str.replace(r'[\s\-]', '', regex=True)
    )
    return combined.str.replace(r'\s', '', regex=True)


def load_player_csvs(folder: Path, tour: str) -> pd.DataFrame:
    """
    Load all per-player CSVs from a folder, add tour column, and generate
    unique_match_key. Returns deduplicated DataFrame.
    """
    csv_files = sorted(folder.glob('*.csv'))
    if not csv_files:
        logger.warning(f"No CSV files found in {folder}")
        return pd.DataFrame()

    logger.info(f"Loading {len(csv_files)} CSVs from {folder}")

    chunks = []
    total = 0

    for fp in tqdm(csv_files, desc=f"Loading {tour}"):
        try:
            chunk = pd.read_csv(fp, low_memory=False)
        except Exception as exc:
            logger.warning(f"Failed to read {fp.name}: {exc}")
            continue

        if chunk.empty:
            continue

        chunk['tour'] = tour

        # Ensure required columns exist
        for col in ['date', 'tournament', 'round', 'winner_name', 'loser_name']:
            if col not in chunk.columns:
                chunk[col] = np.nan

        # Compute keys vectorized; drop rows with no key
        chunk['unique_match_key'] = _make_unique_key_vectorized(chunk)
        chunk = chunk[chunk['unique_match_key'] != '']

        total += len(chunk)
        chunks.append(chunk)

    if not chunks:
        logger.info(f"Processed {total} rows → 0 unique matches")
        return pd.DataFrame()

    combined = pd.concat(chunks, ignore_index=True)

    # groupby().first() picks the first non-null value per column per key, which
    # replicates the original fill-missing-values behaviour without iterrows.
    before = len(combined)
    combined = (
        combined
        .groupby('unique_match_key', sort=False, as_index=False)
        .first()
    )
    logger.info(f"Processed {total} rows → {len(combined)} unique matches (from {before})")
    return combined


def merge_all_tours(
    atp_folder: Path,
    wta_folder: Path,
) -> pd.DataFrame:
    """Merge ATP and WTA player CSVs into a single deduplicated DataFrame."""
    atp_df = load_player_csvs(atp_folder, tour='M')
    wta_df = load_player_csvs(wta_folder, tour='F')

    parts = [d for d in [atp_df, wta_df] if not d.empty]
    if not parts:
        raise ValueError("No data loaded from either tour folder")

    combined = pd.concat(parts, ignore_index=True)

    # Final deduplication across tours (same match may appear in both)
    before = len(combined)
    combined = combined.drop_duplicates(subset=['unique_match_key'])
    logger.info(f"Combined dedup: {before} → {len(combined)} rows")

    return combined


def merge_all_tours_from_parquets(
    atp_dir: Path,
    wta_dir: Path,
) -> pd.DataFrame:
    """
    Load all per-player parquets written by the scraper, compute any missing
    unique_match_key values, deduplicate, and return a combined DataFrame.
    """
    files = list(atp_dir.glob('*.parquet')) + list(wta_dir.glob('*.parquet'))
    if not files:
        return pd.DataFrame()

    logger.info(f"Loading {len(files)} parquet files from scraper output")
    dfs = []
    for fp in tqdm(files, desc="Loading parquets"):
        try:
            dfs.append(pd.read_parquet(fp))
        except Exception as exc:
            logger.warning(f"Failed to read {fp.name}: {exc}")

    if not dfs:
        return pd.DataFrame()

    combined = pd.concat(dfs, ignore_index=True)

    # Compute unique_match_key for rows where it's missing
    missing = combined['unique_match_key'].isna() | (combined['unique_match_key'] == '')
    if missing.any():
        combined.loc[missing, 'unique_match_key'] = _make_unique_key_vectorized(combined[missing])

    # Drop rows with no key (can't deduplicate without one)
    combined = combined[combined['unique_match_key'].notna() & (combined['unique_match_key'] != '')]

    before = len(combined)
    combined = combined.drop_duplicates(subset=['unique_match_key'])
    logger.info(f"Parquet dedup: {before} → {len(combined)} rows")

    return combined


def incremental_new_keys(df: pd.DataFrame, existing_keys: set) -> pd.DataFrame:
    """Return only rows whose unique_match_key is not in existing_keys."""
    if 'unique_match_key' not in df.columns:
        df = df.copy()
        df['unique_match_key'] = _make_unique_key_vectorized(df)
    return df[~df['unique_match_key'].isin(existing_keys)].copy()
