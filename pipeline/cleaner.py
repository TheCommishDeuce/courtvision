"""Dtype standardization — ported from cleaning.py."""
import pandas as pd

ROUND_SORT_ORDER = {
    'Q1': 0, 'Q2': 1, 'Q3': 2, 'R128': 3, 'R64': 4, 'ER': 5,
    'R32': 6, 'R16': 7, 'RR': 8, 'QF': 9, 'SF': 10, 'BR': 11, 'F': 12,
}

NUMERIC_COLUMNS = [
    'time', 'winner_rank', 'loser_rank',
    'winner_aces', 'winner_dfs', 'winner_fwon', 'winner_saved',
    'loser_aces', 'loser_dfs', 'loser_fwon', 'loser_saved',
    'winner_pts', 'winner_firsts', 'winner_swon', 'winner_games', 'winner_chances',
    'loser_pts', 'loser_firsts', 'loser_swon', 'loser_games', 'loser_chances',
]

INT_COLUMNS = ['winner_tb_won', 'winner_tb_lost', 'loser_tb_won', 'loser_tb_lost']

STRING_COLUMNS = ['winner_name', 'loser_name', 'tournament', 'surface', 'round', 'tour', 'level', 'score']


def clean_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Apply dtype standardization to a raw matches DataFrame."""
    df = df.copy()

    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')

    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    for col in INT_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    for col in STRING_COLUMNS:
        if col in df.columns:
            df[col] = df[col].astype(str).replace('nan', pd.NA)

    return df


def add_round_order(df: pd.DataFrame) -> pd.DataFrame:
    """Add numeric round_order column for sorting."""
    df = df.copy()
    df['round_order'] = df['round'].map(ROUND_SORT_ORDER).fillna(99)
    return df
