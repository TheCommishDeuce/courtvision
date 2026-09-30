"""Shared links preview with the page's own title and figures (api/link_preview.py)."""
from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from api import directory, link_preview
from api.link_preview import DEFAULT_TITLE, Preview, preview_for, render_index

# (date, tournament, level, level_name, round, winner, winner_rank, loser, loser_rank, score)
MATCHES = [
    ("2025-06-30", "Wimbledon", "G", "Grand Slam", "F", "Jannik Sinner", 1, "Carlos Alcaraz", 2, "4-6 6-4 6-4 6-4"),
    ("2025-05-26", "Roland Garros", "G", "Grand Slam", "F", "Carlos Alcaraz", 2, "Jannik Sinner", 1, "4-6 6-7(4) 6-4 7-6(3) 7-6(2)"),
    ("2025-09-01", "US Open", "G", "Grand Slam", "F", "Carlos Alcaraz", 2, "Jannik Sinner", 1, "6-2 3-6 6-1 6-4"),
    ("2024-03-01", "Doha", "A", "ATP 250/500", "R32", "Rafael Nadal", 5, "Some One", 80, "6-1 6-1"),
]

TEMPLATE = """<!doctype html>
<html lang="en">
  <head>
    <meta name="description" content="old" />
    <meta property="og:title" content="old" />
    <meta property="og:description" content="old" />
    <title>courtvision</title>
  </head>
  <body><div id="root"></div></body>
</html>"""


@pytest.fixture()
def open_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db = tmp_path / "t.duckdb"
    con = duckdb.connect(str(db))
    for stmt in [s.strip() for s in Path("db/schema.sql").read_text().split(";") if s.strip()]:
        con.execute(stmt)
    for i, (d, t, lvl, lname, rnd, w, wr, lo, lr, score) in enumerate(MATCHES):
        con.execute(
            """INSERT INTO matches_main (unique_match_key, date, tournament, surface, level, level_name, round, score,
                   winner_name, loser_name, winner_rank, loser_rank, tour, year, is_walkover)
               VALUES (?, ?, ?, 'Grass', ?, ?, ?, ?, ?, ?, ?, ?, 'M', ?, false)""",
            [f"k{i}", d, t, lvl, lname, rnd, score, w, lo, wr, lr, int(d[:4])],
        )
    con.execute("INSERT INTO players (player_id, tour, name, country) VALUES ('1', 'M', 'Jannik Sinner', 'ITA')")
    con.close()
    monkeypatch.setenv("TENNIS_DB", str(db))
    monkeypatch.setattr(directory, "_cached", None)
    return lambda: duckdb.connect(str(db), read_only=True)


def test_player_preview_carries_the_career_line(open_db) -> None:
    p = preview_for("player/jannik-sinner", "", open_db)
    assert p.title == "Jannik Sinner — courtvision"
    assert p.description.startswith("ATP · ITA · 2025–2025. Career 1–2 (33.3%), career high #1.")


def test_matchup_preview_names_the_leader_and_last_meeting(open_db) -> None:
    p = preview_for("versus/jannik-sinner/carlos-alcaraz", "surface=Clay", open_db)
    assert p.title == "Sinner vs Alcaraz — courtvision"
    assert p.description == (
        "Alcaraz leads 2–1 in 3 meetings, 2025–2025. Last: Alcaraz won 6-2 3-6 6-1 6-4, US Open 2025."
    )
    never = preview_for("versus/jannik-sinner/rafael-nadal", "", open_db)
    assert never.description.startswith("Jannik Sinner and Rafael Nadal have never met.")


def test_tournament_previews(open_db) -> None:
    p = preview_for("tournament/wimbledon/2025", "tour=M", open_db)
    assert p.title == "Wimbledon 2025 — courtvision"
    assert "Jannik Sinner d. Carlos Alcaraz 4-6 6-4 6-4 6-4 in the final" in p.description
    assert preview_for("tournament/wimbledon/2020", "", open_db).description == "No 2020 edition of Wimbledon on record."
    assert preview_for("tournament/wimbledon", "", open_db).title == "Wimbledon — courtvision"


def test_unknown_and_static_paths_fall_back(open_db) -> None:
    assert preview_for("player/nobody-here", "", open_db).title == DEFAULT_TITLE
    assert preview_for("", "", open_db).title == DEFAULT_TITLE
    assert preview_for("records", "board=wins", open_db).title == "Records — courtvision"
    assert preview_for("lab", "example=teens-beat-no1", open_db).description == "Which teenagers have beaten a world No. 1?"


def test_a_broken_database_never_breaks_the_page() -> None:
    def boom():
        raise RuntimeError("db down")
    assert preview_for("player/jannik-sinner", "", boom).title == DEFAULT_TITLE


def test_render_index_replaces_and_adds_tags_escaped() -> None:
    page = render_index(TEMPLATE, Preview('Serena "S" <Williams> — courtvision', "It's 6-0 & 6-1"))
    assert "<title>Serena &quot;S&quot; &lt;Williams&gt; — courtvision</title>" in page
    assert '<meta name="description" content="It&#x27;s 6-0 &amp; 6-1" />' in page
    assert '<meta property="og:title" content="Serena &quot;S&quot; &lt;Williams&gt; — courtvision" />' in page
    assert '<meta name="twitter:card" content="summary" />' in page
    assert page.count("og:description") == 1
    assert 'content="old"' not in page
    assert page.index("twitter:card") < page.index("</head>")


def test_render_works_on_the_real_index_html() -> None:
    template = Path("frontend/index.html").read_text()
    page = render_index(template, Preview("X — courtvision", "Y"))
    assert "<title>X — courtvision</title>" in page
    assert '<meta property="og:description" content="Y" />' in page
    assert link_preview.SITE in page
