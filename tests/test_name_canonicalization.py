"""One player spelled several ways must not split their career or duplicate matches.

Each player's own page names them from the rankings/reference list, while
opponents' pages use Tennis Abstract's spelling. Before keys were lowercased,
"John Mcenroe" (own page) and "John McEnroe" (opponents' pages) stored every
match between two scraped players twice.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from pipeline.deduplicator import canonicalize_names, merge_all_tours_from_parquets


def _match(date: str, rnd: str, winner: str, loser: str) -> dict:
    return {
        "unique_match_key": None, "date": pd.Timestamp(date), "round": rnd,
        "winner_name": winner, "loser_name": loser, "tour": "M",
        "tournament": "Test Open", "level": "A", "score": "6-4 6-4",
    }


def _write(folder: Path, stem: str, rows: list[dict]) -> None:
    pd.DataFrame(rows).to_parquet(folder / f"{stem}.parquet", index=False)


def test_case_variant_copies_of_one_match_collapse_to_the_reference_spelling(tmp_path: Path) -> None:
    atp, wta = tmp_path / "atp", tmp_path / "wta"
    atp.mkdir(); wta.mkdir()
    # McEnroe's own page spells him one way; Grabb's page spells him another.
    _write(atp, "JohnMcenroe", [
        _match("1992-06-08", "R16", "John Mcenroe", "Jim Grabb"),
        _match("1992-07-01", "R32", "John Mcenroe", "Other Player"),
    ])
    _write(atp, "JimGrabb", [
        _match("1992-06-08", "R16", "John McEnroe", "Jim Grabb"),
    ])

    df = merge_all_tours_from_parquets(atp, wta, preferred_names={"John McEnroe"})

    assert len(df) == 2
    assert set(df["winner_name"]) == {"John McEnroe"}
    assert df["unique_match_key"].is_unique


def test_without_a_reference_spelling_the_commonest_spaced_name_wins() -> None:
    df = pd.DataFrame([
        {"winner_name": "Juan Martin del Potro", "loser_name": "A B"},
        {"winner_name": "Juan Martin del Potro", "loser_name": "C D"},
        {"winner_name": "Juan Martin Del Potro", "loser_name": "E F"},
        # A url slug leaked in as a display name must never be chosen,
        # even when it is the most frequent spelling.
        {"winner_name": "JuanMartinDelPotro", "loser_name": "G H"},
        {"winner_name": "JuanMartinDelPotro", "loser_name": "I J"},
        {"winner_name": "JuanMartinDelPotro", "loser_name": "K L"},
    ])

    out = canonicalize_names(df)

    assert set(out["winner_name"]) == {"Juan Martin del Potro"}


def test_distinct_players_are_left_alone() -> None:
    df = pd.DataFrame([
        {"winner_name": "John McEnroe", "loser_name": "Patrick McEnroe"},
        {"winner_name": "Patrick Mcenroe", "loser_name": "John McEnroe"},
    ])

    out = canonicalize_names(df, preferred_names={"Patrick McEnroe"})

    assert set(out["winner_name"]) | set(out["loser_name"]) == {"John McEnroe", "Patrick McEnroe"}
