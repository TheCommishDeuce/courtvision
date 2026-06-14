"""Derived columns — reverse-engineered from tennis_cleaned.parquet schema."""
import re
import pandas as pd

LEVEL_NAME_MAP = {
    'G':    'Grand Slam',
    'M':    'Masters 1000',
    'A':    'ATP 250/500',     # covers ATP 250 + ATP 500
    'C':    'Challenger',
    'F':    'Tour Finals',     # year-end tour championships
    'S':    'ITF',             # ATP satellite/ITF (merged with numeric ITF codes)
    'D':    'Davis Cup',       # overridden to 'BJK Cup' for WTA below
    'T':    'Team',
    'O':    'Olympics',
    # WTA main tour (modern + historical, merged into equivalent tiers)
    'PM':   'Masters 1000',    # WTA Premier Mandatory → Masters 1000 equivalent
    'P':    'WTA 500',         # WTA Premier → WTA 500 equivalent
    'I':    'WTA 250',         # WTA International → WTA 250 equivalent
    'T1':   'Masters 1000',    # WTA Tier I (pre-2009) → Masters 1000 equivalent
    'T2':   'WTA 500',         # WTA Tier II → WTA 500 equivalent
    'T3':   'WTA 250',         # WTA Tier III → WTA 250 equivalent
    'T4':   'WTA 250',         # WTA Tier IV → WTA 250 equivalent
    'T5':   'WTA 250',         # WTA Tier V → WTA 250 equivalent
    'W':    'WTA',             # WTA world-series (pre-tier era, ~WTA 1000 level)
    # WTA misc
    'CH':   'Challenger',      # WTA Challenger (older code)
    'CC':   'ITF',             # WTA circuit events
    # ITF levels (prize money tiers — both tours)
    '10':   'ITF', '15': 'ITF', '25': 'ITF',
    '35':   'ITF', '35+H': 'ITF', '40': 'ITF',
    '50':   'ITF', '50+H': 'ITF', '60': 'ITF',
    '75':   'ITF', '80': 'ITF', '100': 'ITF',
    '125':  'Challenger',      # WTA 125K events
}

# Regex: one set token like "6-4" or "7-6(5)"
_SET_RE = re.compile(r'\d+[-–−—]\d+(?:\s*\(\d+\))?')

# Retirement / walkover / default markers
_RET_RE = re.compile(r'\bRET\b', re.IGNORECASE)
_WO_RE = re.compile(r'\bW/O\b|\bDEF\b|\bDef\b', re.IGNORECASE)


def _count_sets(score: str) -> int:
    if not isinstance(score, str):
        return 0
    tokens = _SET_RE.findall(score)
    return len(tokens)


def _has_tiebreak(score: str) -> bool:
    if not isinstance(score, str):
        return False
    return bool(re.search(r'7[-–−—]6', score))


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add all derived columns to a cleaned DataFrame."""
    df = df.copy()

    # level_name
    df['level_name'] = df['level'].map(LEVEL_NAME_MAP).fillna(df['level'])
    # WTA-specific override: D = BJK Cup/Fed Cup (not Davis Cup)
    if 'tour' in df.columns:
        df.loc[(df['level'] == 'D') & (df['tour'] == 'F'), 'level_name'] = 'BJK Cup'

    # year
    if 'date' in df.columns:
        df['year'] = pd.to_datetime(df['date'], errors='coerce').dt.year

    # Dash class: ASCII hyphen, en-dash, minus sign, em-dash. Literal characters
    # (not \uXXXX escapes) because pandas routes these regexes through pyarrow's
    # RE2 engine, which rejects \uXXXX syntax.
    _DASH = "[-–−—]"

    # num_sets — vectorized count of set tokens (e.g. "6-4", "7-6(5)")
    df['num_sets'] = df['score'].fillna('').str.count(
        r'\d+' + _DASH + r'\d+(?:\s*\(\d+\))?'
    ).astype('Int64')

    # is_retirement / is_walkover
    score_str = df['score'].fillna('')
    df['is_retirement'] = score_str.str.contains(r'\bRET\b', case=False, regex=True, na=False)
    df['is_walkover'] = score_str.str.contains(r'\bW/O\b|\bDEF\b', case=False, regex=True, na=False)

    # is_complete: has at least one set and is not retirement or walkover
    df['is_complete'] = (~df['is_retirement']) & (~df['is_walkover']) & (df['num_sets'].fillna(0) > 0)

    # had_tiebreak — vectorized check for 7-6 set score
    df['had_tiebreak'] = df['score'].fillna('').str.contains(
        '7' + _DASH + '6', na=False
    )

    # rank_diff and is_upset
    if 'winner_rank' in df.columns and 'loser_rank' in df.columns:
        winner_r = pd.to_numeric(df['winner_rank'], errors='coerce')
        loser_r = pd.to_numeric(df['loser_rank'], errors='coerce')
        df['rank_diff'] = (winner_r - loser_r).abs()
        df['is_upset'] = winner_r > loser_r
    else:
        df['rank_diff'] = float('nan')
        df['is_upset'] = False

    return df
