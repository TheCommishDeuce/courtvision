from datetime import date, timedelta

import duckdb
import pandas as pd

from db.queries import q_leaders_streaks


def _mk_schema(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """
        CREATE TABLE matches_main (
            winner_name VARCHAR,
            loser_name VARCHAR,
            tour VARCHAR,
            surface VARCHAR,
            date DATE,
            tournament VARCHAR,
            year INTEGER,
            level_name VARCHAR,
            round VARCHAR,
            is_walkover BOOLEAN,
            is_retirement BOOLEAN
        )
        """
    )


def _insert_match(
    con: duckdb.DuckDBPyConnection,
    *,
    winner: str,
    loser: str,
    dt: date,
    tournament: str,
    round_name: str = "R32",
    tour: str = "M",
    surface: str = "Hard",
) -> None:
    con.execute(
        """
        INSERT INTO matches_main (
            winner_name, loser_name, tour, surface, date,
            tournament, year, level_name, round, is_walkover, is_retirement
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ATP 250/500', ?, false, false)
        """,
        [winner, loser, tour, surface, dt, tournament, dt.year, round_name],
    )


def test_streaks_include_fresh_current_and_exclude_stale_open_streaks() -> None:
    con = duckdb.connect(":memory:")
    _mk_schema(con)
    today = date.today()

    # Fresh current streak: should remain valid.
    fresh_start = today - timedelta(days=20)
    for i in range(6):
        _insert_match(
            con,
            winner="Fresh Current",
            loser=f"Fresh Opp {i}",
            dt=fresh_start + timedelta(days=i),
            tournament=f"Fresh {i}",
        )

    # Stale open streak with no later loss: should be ignored as "current".
    stale_start = today - timedelta(days=150)
    for i in range(7):
        _insert_match(
            con,
            winner="Stale Open",
            loser=f"Stale Opp {i}",
            dt=stale_start + timedelta(days=i),
            tournament=f"Stale {i}",
        )

    # Player with both: ended 6-win streak + stale open 7-win streak.
    ended_start = today - timedelta(days=260)
    for i in range(6):
        _insert_match(
            con,
            winner="Mixed Player",
            loser=f"Mixed Old Opp {i}",
            dt=ended_start + timedelta(days=i),
            tournament=f"Mixed Ended {i}",
        )
    _insert_match(
        con,
        winner="Mixed Breaker",
        loser="Mixed Player",
        dt=ended_start + timedelta(days=7),
        tournament="Mixed Break",
    )
    stale_mixed_start = today - timedelta(days=160)
    for i in range(7):
        _insert_match(
            con,
            winner="Mixed Player",
            loser=f"Mixed New Opp {i}",
            dt=stale_mixed_start + timedelta(days=i),
            tournament=f"Mixed Stale {i}",
        )

    df = q_leaders_streaks(con, tour="M")
    rows = {r["player_name"]: r for r in df.to_dict("records")}

    assert "Fresh Current" in rows
    assert rows["Fresh Current"]["streak_length"] == 6
    assert pd.isna(rows["Fresh Current"]["end_date"])

    assert "Stale Open" not in rows

    assert "Mixed Player" in rows
    assert rows["Mixed Player"]["streak_length"] == 6
    assert pd.notna(rows["Mixed Player"]["end_date"])


def test_streaks_use_round_order_when_many_rounds_share_same_date() -> None:
    con = duckdb.connect(":memory:")
    _mk_schema(con)
    today = date.today()

    # Simulate parser behavior: all rounds with the same date, and insert QF loss first.
    slam_date = today - timedelta(days=40)
    _insert_match(
        con,
        winner="Breaker Opp",
        loser="Round Order Player",
        dt=slam_date,
        tournament="SameDate Slam",
        round_name="QF",
    )
    for rnd in ("R128", "R64", "R32", "R16"):
        _insert_match(
            con,
            winner="Round Order Player",
            loser=f"Slam Opp {rnd}",
            dt=slam_date,
            tournament="SameDate Slam",
            round_name=rnd,
        )

    # Next tournament run: 5 straight wins (valid ongoing streak).
    next_date = today - timedelta(days=20)
    for rnd in ("R32", "R16", "QF", "SF", "F"):
        _insert_match(
            con,
            winner="Round Order Player",
            loser=f"Next Opp {rnd}",
            dt=next_date,
            tournament="Next Event",
            round_name=rnd,
        )

    df = q_leaders_streaks(con, tour="M")
    rows = {r["player_name"]: r for r in df.to_dict("records")}

    assert "Round Order Player" in rows
    # Correct result is 5; without round-ordering this tends to become 9.
    assert rows["Round Order Player"]["streak_length"] == 5
    assert pd.isna(rows["Round Order Player"]["end_date"])
