"""Pure parsing functions — ported from parser.ipynb.

All functions are side-effect free and unit-testable.
"""
from __future__ import annotations

import ast
import logging
import re
import unicodedata
from typing import Any, Optional

import demjson3 as demjson
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Name helpers
# ---------------------------------------------------------------------------

def clean_name(name: Any) -> str:
    if not name or (hasattr(name, '__class__') and name.__class__.__name__ == 'float'):
        return ''
    s = unicodedata.normalize('NFKD', str(name))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def normalize_name_for_url(name: str) -> str:
    if not name:
        return ''
    s = clean_name(name)
    # No separators → already a url_name (e.g. JoseFranciscoAltur); just strip invalid chars
    if not re.search(r"[\s\-']", s):
        return re.sub(r'[^a-zA-Z0-9]', '', s)
    parts = []
    for word in re.split(r'\s+', s):
        segments = re.split(r"[-']", word)
        i = 0
        while i < len(segments):
            seg = segments[i]
            if len(seg) == 1 and i + 1 < len(segments):
                # Single-letter prefix (O', N') — attach to next segment lowercased
                parts.append(seg.upper() + segments[i + 1].lower())
                i += 2
            else:
                # title() lowercases internal caps: McEnroe → Mcenroe
                parts.append(seg.title())
                i += 1
    return re.sub(r'[^a-zA-Z0-9]', '', ''.join(parts))


# ---------------------------------------------------------------------------
# Score / tiebreak helpers
# ---------------------------------------------------------------------------

_SET_TOKEN_RE = re.compile(r'(\d+)\s*[-–−—]\s*(\d+)(?:\s*\((\d+)\))?')


def _standardize_dashes(score: str) -> str:
    return score.replace('—', '-').replace('–', '-').replace('−', '-')


def _count_tb_oriented(score: str, wl_flag: str) -> tuple[int, int]:
    """
    Count tiebreaks won/lost from a score string, oriented by player result.

    Args:
        score:   e.g. '7-6(3) 6-3'
        wl_flag: 'W' for winner perspective, 'L' for loser

    Returns:
        (tb_won, tb_lost)
    """
    if not isinstance(score, str) or not score:
        return 0, 0
    s = _standardize_dashes(score)
    is_winner = str(wl_flag).upper() == 'W'
    tb_won, tb_lost = 0, 0
    for a_str, b_str, _ in _SET_TOKEN_RE.findall(s):
        try:
            a, b = int(a_str), int(b_str)
        except ValueError:
            continue
        p_games = a if is_winner else b
        o_games = b if is_winner else a
        if p_games == 7 and o_games == 6:
            tb_won += 1
        elif p_games == 6 and o_games == 7:
            tb_lost += 1
    return tb_won, tb_lost


# ---------------------------------------------------------------------------
# Error page detection
# ---------------------------------------------------------------------------

def is_error_page(text: str, expected_url_name: str) -> bool:
    """
    Detect Tennis Abstract's default/error page (serves Benoit Paire as fallback).
    Returns True if the page is an error page for any player OTHER than Benoit Paire.
    """
    if 'Benoit Paire' not in text[:4000]:
        return False
    return normalize_name_for_url(expected_url_name).lower() != 'benoitpaire'


# ---------------------------------------------------------------------------
# Raw match array → column-named dict list
# ---------------------------------------------------------------------------

_COLUMN_MAP = {
    0: 'date', 1: 'tourn', 2: 'surf', 3: 'level', 4: 'wl', 5: 'prank', 8: 'round',
    9: 'score', 11: 'opp', 12: 'orank', 20: 'time', 21: 'aces', 22: 'dfs',
    23: 'pts', 24: 'firsts', 25: 'fwon', 26: 'swon', 27: 'games',
    28: 'saved', 29: 'chances', 30: 'oaces', 31: 'odfs', 32: 'opts',
    33: 'ofirsts', 34: 'ofwon', 35: 'oswon', 36: 'ogames',
    37: 'osaved', 38: 'ochances', 43: 'matchid',
}


# ---------------------------------------------------------------------------
# ATP parsing — from HTML
# ---------------------------------------------------------------------------

def extract_matchmx_atp(html: str) -> Optional[list]:
    """
    Extract the matchmx array from ATP HTML page source.
    Returns a list of raw match arrays, or None if not found.
    """
    marker = 'var matchmx = ['
    start = html.find(marker)
    if start == -1:
        return None
    start += len(marker) - 1  # keep the '['
    end = html.find('];', start)
    if end == -1:
        return None
    raw = html[start:end + 1]
    raw = raw.replace('null', 'None')
    try:
        return ast.literal_eval(raw)
    except Exception as exc:
        logger.warning(f'ATP literal_eval failed: {exc}')
        return None


# ---------------------------------------------------------------------------
# WTA parsing — from JS file
# ---------------------------------------------------------------------------

def extract_matchmx_wta(js_text: str) -> Optional[list]:
    """
    Extract the matchmx array from a WTA JS file using demjson3 (handles
    relaxed/malformed JSON).
    Returns a list of raw match arrays, or None if not found.
    """
    marker = 'matchmx = ['
    if marker not in js_text:
        return None
    try:
        raw = js_text.split(marker)[1].split('];')[0]
        raw = '[' + raw + ']'
        return demjson.decode(raw)
    except Exception as exc:
        logger.warning(f'WTA demjson decode failed: {exc}')
        return None


# ---------------------------------------------------------------------------
# Convert raw match arrays → winner/loser DataFrame
# ---------------------------------------------------------------------------

def matches_to_dataframe(raw_matches: list, player_name: str) -> pd.DataFrame:
    """
    Convert raw matchmx rows to a canonical winner/loser DataFrame.

    Args:
        raw_matches:  list of lists from extract_matchmx_atp/wta
        player_name:  display name of the player (used to assign winner/loser)

    Returns:
        DataFrame with 34 columns matching the existing CSV schema.
    """
    if not raw_matches:
        return pd.DataFrame()

    df = pd.DataFrame(raw_matches)

    # Select only known columns
    available = [c for c in _COLUMN_MAP if c in df.columns]
    df = df[available].rename(columns={k: v for k, v in _COLUMN_MAP.items() if k in available})

    # Parse date
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], format='%Y%m%d', errors='coerce')

    # Drop rows with empty/null scores (keep W/O — walkovers are valid match outcomes)
    if 'score' in df.columns:
        df = df[~df['score'].isin(['', None]) & df['score'].notna()].copy()

    if df.empty:
        return pd.DataFrame()

    # Clean opponent names
    player_name = clean_name(player_name)
    if 'opp' in df.columns:
        df['opp'] = df['opp'].apply(clean_name)

    # Compute tiebreaks
    if 'score' in df.columns and 'wl' in df.columns:
        tb_series = df.apply(
            lambda r: _count_tb_oriented(str(r.get('score', '')), str(r.get('wl', ''))),
            axis=1,
        )
        tb_df = pd.DataFrame(tb_series.tolist(), index=df.index, columns=['tb_won', 'tb_lost'])
        df = pd.concat([df, tb_df.astype(int)], axis=1)

    # Build winner/loser rows (vectorized — split by W/L, rename, concat)
    _STAT_COLS = ['aces', 'dfs', 'pts', 'firsts', 'fwon', 'swon', 'games', 'saved', 'chances']
    _OPP_STAT_COLS = ['oaces', 'odfs', 'opts', 'ofirsts', 'ofwon', 'oswon', 'ogames', 'osaved', 'ochances']
    _BASE_COLS = ['matchid', 'date', 'tourn', 'surf', 'level', 'round', 'score', 'time']

    # Helper: ensure column exists (fill with None if absent)
    def _col(frame: pd.DataFrame, name: str) -> pd.Series:
        return frame[name] if name in frame.columns else pd.Series([None] * len(frame), index=frame.index)

    wl_upper = df['wl'].str.upper() if 'wl' in df.columns else pd.Series([''] * len(df), index=df.index)
    wins   = df[wl_upper == 'W'].copy()
    losses = df[wl_upper == 'L'].copy()

    parts = []
    for side, is_win in ((wins, True), (losses, False)):
        if side.empty:
            continue

        out = pd.DataFrame(index=side.index)
        out['matchid']    = _col(side, 'matchid')
        out['date']       = _col(side, 'date')
        out['tournament'] = _col(side, 'tourn')
        out['surface']    = _col(side, 'surf')
        out['level']      = _col(side, 'level')
        out['round']      = _col(side, 'round')
        out['score']      = _col(side, 'score')
        out['time']       = _col(side, 'time')

        if is_win:
            out['winner_name'] = player_name
            out['loser_name']  = _col(side, 'opp')
            out['winner_rank'] = _col(side, 'prank')
            out['loser_rank']  = _col(side, 'orank')
            for stat, ostat in zip(_STAT_COLS, _OPP_STAT_COLS):
                out[f'winner_{stat}'] = _col(side, stat)
                out[f'loser_{stat}']  = _col(side, ostat)
            out['winner_tb_won']  = _col(side, 'tb_won')
            out['winner_tb_lost'] = _col(side, 'tb_lost')
            out['loser_tb_won']   = _col(side, 'tb_lost')
            out['loser_tb_lost']  = _col(side, 'tb_won')
        else:
            out['winner_name'] = _col(side, 'opp')
            out['loser_name']  = player_name
            out['winner_rank'] = _col(side, 'orank')
            out['loser_rank']  = _col(side, 'prank')
            for stat, ostat in zip(_STAT_COLS, _OPP_STAT_COLS):
                out[f'winner_{stat}'] = _col(side, ostat)
                out[f'loser_{stat}']  = _col(side, stat)
            out['winner_tb_won']  = _col(side, 'tb_lost')
            out['winner_tb_lost'] = _col(side, 'tb_won')
            out['loser_tb_won']   = _col(side, 'tb_won')
            out['loser_tb_lost']  = _col(side, 'tb_lost')

        parts.append(out)

    if not parts:
        return pd.DataFrame()

    result = pd.concat(parts, ignore_index=True)
    if 'date' in result.columns:
        result = result.sort_values('date').reset_index(drop=True)
    return result
