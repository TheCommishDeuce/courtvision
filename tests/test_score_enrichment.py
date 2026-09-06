import pandas as pd
import pytest

from pipeline.loader import _prepare_df
from scraper.parser import _count_tb_oriented


@pytest.mark.parametrize("dash", ["-", "–", "−", "—"])
@pytest.mark.parametrize("score,expected", [
    ("7-6(4) 6-3", True),
    ("6-7(4) 6-3 6-2", True),
    ("6-4 6-2", False),
    ("6-7(4) 0-1 RET", True),
    ("W/O", False),
    (None, False),
])
def test_tiebreak_flag_agrees_with_parser_in_both_score_directions(dash, score, expected):
    score = score.replace("-", dash) if score else score
    enriched = _prepare_df(pd.DataFrame([{"score": score, "level": "A"}]))
    assert bool(enriched.iloc[0]["had_tiebreak"]) is expected
    assert bool(sum(_count_tb_oriented(score, "W"))) is expected
