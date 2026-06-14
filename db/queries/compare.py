"""Player comparison query builders."""
from __future__ import annotations

from typing import Optional

import duckdb

from ._helpers import _filter_extras

def q_common_opponents(
    con: duckdb.DuckDBPyConnection,
    player_a: str,
    player_b: str,
    tour: Optional[str] = None,
    surface: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
) -> dict:
    extra, extra_params = _filter_extras(tour, surface, year_min, year_max, None, start_idx=3)
    params = [player_a, player_b, *extra_params]
    sql = f"""
        WITH a_matches AS (
            SELECT opponent_name,
                   SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS a_wins,
                   SUM(CASE WHEN result='L' THEN 1 ELSE 0 END) AS a_losses
            FROM player_match_view
            WHERE player_name = $1 {extra}
            GROUP BY opponent_name
        ),
        b_matches AS (
            SELECT opponent_name,
                   SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS b_wins,
                   SUM(CASE WHEN result='L' THEN 1 ELSE 0 END) AS b_losses
            FROM player_match_view
            WHERE player_name = $2 {extra}
            GROUP BY opponent_name
        )
        SELECT a.opponent_name,
               a.a_wins,
               a.a_losses,
               b.b_wins,
               b.b_losses,
               (a.a_wins + a.a_losses + b.b_wins + b.b_losses) AS total_matches
        FROM a_matches a
        INNER JOIN b_matches b ON a.opponent_name = b.opponent_name
        ORDER BY total_matches DESC, a.opponent_name ASC
    """
    df = con.execute(sql, params).df()
    if df.empty:
        return {
            'summary': {
                'player_a': player_a,
                'player_b': player_b,
                'common_opponents': 0,
                'a_total_wins': 0,
                'a_total_losses': 0,
                'b_total_wins': 0,
                'b_total_losses': 0,
            },
            'opponents': [],
        }
    return {
        'summary': {
            'player_a': player_a,
            'player_b': player_b,
            'common_opponents': int(len(df)),
            'a_total_wins': int(df['a_wins'].sum()),
            'a_total_losses': int(df['a_losses'].sum()),
            'b_total_wins': int(df['b_wins'].sum()),
            'b_total_losses': int(df['b_losses'].sum()),
        },
        'opponents': df.to_dict(orient='records'),
    }
