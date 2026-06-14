"""DataFrame → JSON-safe list-of-dicts converter."""
from __future__ import annotations

import math
from typing import Any

import pandas as pd


def df_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert DataFrame to records with NaN→None, dates→ISO strings, numpy→Python."""
    if df.empty:
        return []

    df = df.copy()

    # Convert datetime columns to ISO strings before to_dict (avoids Timestamp objects)
    for col in df.select_dtypes(include=['datetime64[ns]', 'datetimetz']).columns:
        df[col] = df[col].apply(lambda v: v.isoformat() if pd.notna(v) else None)

    records: list[dict[str, Any]] = df.to_dict('records')

    # Convert numpy scalars and replace NaN/Inf (float columns keep NaN through df.where)
    for record in records:
        for k, v in record.items():
            if hasattr(v, 'item'):  # numpy scalar → native Python
                v = v.item()
                record[k] = v
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                record[k] = None

    return records
