"""Every Lab example question must run through the real query path.

The examples live in frontend/src/lab/examples.sql and are shown on Home
("Try asking") and in the Lab. They are hand-written SQL over the exposed
relations, so a schema change could break one silently; this runs each one,
exactly as the Lab would, against the real schema.
"""
from __future__ import annotations

import re
from pathlib import Path

import duckdb
import pytest

from api.routers import query as q

EXAMPLES = Path("frontend/src/lab/examples.sql").read_text()


def _examples() -> list[tuple[str, str]]:
    out = []
    for block in re.split(r"^-- @id: ", EXAMPLES, flags=re.M)[1:]:
        lines = block.split("\n")
        sql = "\n".join(line for line in lines[1:] if not line.startswith("-- @")).strip()
        out.append((lines[0].strip(), sql))
    return out


@pytest.fixture(scope="module")
def con(tmp_path_factory, request):
    db = tmp_path_factory.mktemp("lab") / "t.duckdb"
    setup = duckdb.connect(str(db))
    for stmt in [s.strip() for s in Path("db/schema.sql").read_text().split(";") if s.strip()]:
        setup.execute(stmt)
    setup.execute(
        """INSERT INTO matches_main (unique_match_key, date, tournament, level, level_name, round, score,
               winner_name, loser_name, winner_rank, loser_rank, winner_aces, loser_aces,
               winner_tb_won, winner_tb_lost, tour, year, is_walkover, is_upset, rank_diff)
           VALUES ('k1', DATE '2025-06-08', 'Roland Garros', 'G', 'Grand Slam', 'F',
                   '4-6 6-7(4) 6-4 7-6(3) 7-6(2)', 'Carlos Alcaraz', 'Jannik Sinner', 2, 1, 9, 5,
                   3, 0, 'M', 2025, false, true, 1)"""
    )
    setup.execute(
        "INSERT INTO players (player_id, tour, name, birthdate) VALUES ('1', 'M', 'Carlos Alcaraz', DATE '2006-05-05')"
    )
    setup.close()

    mp = pytest.MonkeyPatch()
    mp.setenv("TENNIS_DB", str(db))
    connection = q.open_hardened()
    yield connection
    connection.close()
    mp.undo()


def test_there_are_six_examples() -> None:
    assert [i for i, _ in _examples()] == [
        "slam-final-comebacks", "most-tiebreaks", "teens-beat-no1", "slam-upsets", "most-aces-match", "bagel-finals",
    ]


@pytest.mark.parametrize("example_id,sql", _examples())
def test_example_runs_through_the_query_endpoint(con, example_id: str, sql: str) -> None:
    cur, columns = q._execute(con, q._wrap(q._clean_sql(sql), 10))
    cur.fetchall()
    assert columns, example_id


def test_the_comeback_example_finds_the_comeback(con) -> None:
    sql = dict(_examples())["slam-final-comebacks"]
    cur, _ = q._execute(con, q._wrap(q._clean_sql(sql), 10))
    assert [r[2] for r in cur.fetchall()] == ["Carlos Alcaraz"]
