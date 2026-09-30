"""One event must keep one name across spellings, tour prefixes and qualifying.

The API filters on the exact `tournament` string, so "s Hertogenbosch" next to
"'s-Hertogenbosch", or "Wimbledon Q" next to "Wimbledon", split an event's
history and would give it two URLs.
"""
from __future__ import annotations

import pandas as pd

from pipeline.tournaments import canonicalize_tournaments, fold_tournament


def _rows(*specs: tuple) -> pd.DataFrame:
    """(tournament, tour, year, round, level) per row."""
    return pd.DataFrame(
        [
            {"tournament": t, "tour": tour, "date": pd.Timestamp(f"{y}-06-01"),
             "round": rnd, "level": lvl}
            for t, tour, y, rnd, lvl in specs
        ]
    )


def test_fold_ignores_case_punctuation_and_accents() -> None:
    assert fold_tournament("'s-Hertogenbosch") == fold_tournament("S Hertogenbosch")
    assert fold_tournament("Vila Real de Santo António") == fold_tournament("Vila Real De Santo Antonio")


def test_spelling_variants_collapse_to_the_override_or_most_frequent() -> None:
    df = _rows(
        ("s Hertogenbosch", "M", 2010, "F", "A"),
        ("s Hertogenbosch", "M", 2011, "F", "A"),
        ("'s-Hertogenbosch", "M", 2005, "F", "A"),
        ("Rio De Janeiro", "M", 2016, "F", "A"),
        ("Rio de Janeiro", "M", 2017, "F", "A"),
        ("Rio de Janeiro", "M", 2018, "F", "A"),
    )
    out = canonicalize_tournaments(df)
    assert set(out["tournament"]) == {"'s-Hertogenbosch", "Rio de Janeiro"}


def test_display_prefers_no_dollar_and_word_breaks_and_trims_whitespace() -> None:
    df = _rows(
        ("Pune $25K", "F", 2015, "F", "25"),
        ("Pune $25K", "F", 2016, "F", "25"),
        ("Pune 25K", "F", 2017, "F", "25"),
        ("W15 Sharm ElSheikh", "F", 2020, "F", "15"),
        ("W15 Sharm ElSheikh", "F", 2021, "F", "15"),
        ("W15 Sharm El Sheikh ", "F", 2022, "F", "15"),
    )
    out = canonicalize_tournaments(df)
    assert set(out["tournament"]) == {"Pune 25K", "W15 Sharm El Sheikh"}


def test_qualifying_event_folds_into_parent_and_takes_its_level() -> None:
    df = _rows(
        ("Wimbledon", "M", 2010, "F", "G"),
        ("Wimbledon", "M", 2010, "R128", "G"),
        ("Wimbledon Q", "M", 2010, "Q1", "Q"),
        ("Wimbledon Q", "M", 2010, "Q3", "Q"),
    )
    out = canonicalize_tournaments(df)
    assert set(out["tournament"]) == {"Wimbledon"}
    assert set(out["level"]) == {"G"}


def test_qualifying_without_a_main_event_that_year_keeps_level_q() -> None:
    df = _rows(
        ("Basel", "M", 2010, "F", "A"),
        ("Basel Q", "M", 2009, "Q1", "Q"),
    )
    out = canonicalize_tournaments(df)
    assert set(out["tournament"]) == {"Basel"}
    assert out.loc[out["round"] == "Q1", "level"].tolist() == ["Q"]


def test_q_suffix_with_main_draw_rounds_is_a_different_event() -> None:
    df = _rows(
        ("Wimbledon", "M", 1965, "F", "G"),
        ("Wimbledon Q", "M", 1965, "R64", "A"),
    )
    out = canonicalize_tournaments(df)
    assert set(out["tournament"]) == {"Wimbledon", "Wimbledon Q"}


def test_tour_prefix_is_dropped_only_when_the_parent_exists_on_that_tour() -> None:
    df = _rows(
        ("Stuttgart", "M", 2025, "F", "A"),
        ("ATP Stuttgart", "M", 2026, "F", "A"),
        ("ATP Cup", "M", 2021, "F", "A"),
        ("WTA Finals", "F", 2024, "F", "F"),
        # "Stuttgart" exists on the WTA tour only; the ATP prefix must not borrow it.
        ("Stuttgart", "F", 2024, "F", "P"),
        ("ATP Halle", "M", 2026, "F", "A"),
    )
    out = canonicalize_tournaments(df)
    by_tour = out.groupby("tour")["tournament"].agg(set).to_dict()
    assert by_tour["M"] == {"Stuttgart", "ATP Cup", "ATP Halle"}
    assert by_tour["F"] == {"WTA Finals", "Stuttgart"}


def test_other_columns_and_row_count_are_untouched() -> None:
    df = _rows(("s Hertogenbosch", "M", 2010, "F", "A"), ("Halle", "M", 2010, "SF", "A"))
    df["score"] = ["6-4 6-4", "7-6(3) 6-3"]
    out = canonicalize_tournaments(df)
    assert len(out) == len(df)
    assert out["score"].tolist() == df["score"].tolist()
    assert out["round"].tolist() == df["round"].tolist()
