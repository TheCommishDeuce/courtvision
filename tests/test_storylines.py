"""Home-page storylines rotate once a day, not on every request."""
from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from db.queries import meta

_COLUMNS = [
    "wins", "win_pct", "tb_won", "upset_wins", "comebacks", "total_aces", "ace_pct",
    "first_win_pct", "bp_saved_pct", "first_return_win_pct", "bp_converted_pct", "streak_length",
]


@pytest.fixture(autouse=True)
def fake_leaders(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every source returns the same 20 players with distinct positive values."""
    df = pd.DataFrame({"player_name": [f"Player {i}" for i in range(20)]})
    for j, col in enumerate(_COLUMNS):
        df[col] = [float((i * 7 + j * 3) % 20 + 1) for i in range(20)]

    def source(*_args, **_kwargs) -> pd.DataFrame:
        return df

    for name in ("q_leaders_activity_combined", "q_leaders_serve", "q_leaders_return", "q_leaders_streaks"):
        monkeypatch.setattr(meta, name, source)


def _pick(day: date) -> list[tuple[str, str, str]]:
    return [(s["type"], s["tour"], s["player_name"]) for s in meta.q_storylines(None, limit=4, today=day)]


def test_same_day_gives_the_same_cards() -> None:
    day = date(2026, 9, 30)
    assert _pick(day) == _pick(day)
    assert len(_pick(day)) == 4


def test_cards_change_across_days() -> None:
    picks = {tuple(_pick(date(2026, 9, d))) for d in range(1, 8)}
    assert len(picks) > 1


def test_links_point_at_the_season_of_the_given_day() -> None:
    story = meta.q_storylines(None, limit=1, today=date(2025, 3, 1))[0]
    assert "y0=2025&y1=2025" in story["link"]
