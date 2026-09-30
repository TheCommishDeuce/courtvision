"""Per-URL <title>, description and Open Graph tags for shared links.

Chat apps and social sites read a page's meta tags without running
JavaScript, so a shared /player/jannik-sinner would otherwise preview as the
generic site. The SPA fallback (api/main.py) renders index.html through
`render_index`, which fills the tags in from the URL: a player's career line,
a matchup's record, a tournament's final. Lookups use the same directory and
queries as the API; any failure falls back to the generic tags, never an error.
"""
from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import parse_qs

import duckdb

from api import directory
from db.queries import q_h2h, q_player_summary

logger = logging.getLogger(__name__)

SITE = "courtvision"
DEFAULT_TITLE = "courtvision — find the story in the numbers"
DEFAULT_DESCRIPTION = (
    "Find the story in a century of tennis results: players, head-to-heads, "
    "tournaments, records and a SQL Lab over every ATP and WTA match on record."
)
_EXAMPLES = Path(__file__).resolve().parent.parent / "frontend" / "src" / "lab" / "examples.sql"


@dataclass(frozen=True)
class Preview:
    title: str
    description: str


def _t(name: str) -> str:
    return f"{name} — {SITE}"


def _tour_label(tour: str) -> str:
    return "WTA" if tour == "F" else "ATP"


def _pct(w: int, t: int) -> str:
    return f"{100 * w / t:.1f}%" if t else "—"


def _lab_questions() -> dict[str, str]:
    try:
        text = _EXAMPLES.read_text()
    except OSError:
        return {}
    out = {}
    for block in re.split(r"^-- @id: ", text, flags=re.M)[1:]:
        lines = block.split("\n")
        q = next((line[len("-- @question: "):] for line in lines if line.startswith("-- @question: ")), "")
        out[lines[0].strip()] = q.strip()
    return out


_QUESTIONS = _lab_questions()


# ── Entity previews ──────────────────────────────────────────────────────────

def _player(con: duckdb.DuckDBPyConnection, slug: str, tour: Optional[str]) -> Optional[Preview]:
    found = directory.current(con).players_by_slug(slug, tour) or directory.current(con).players_by_slug(slug)
    if not found:
        return None
    p = found[0]
    s = q_player_summary(con, player_name=p.name, tour=p.tour)
    total = int(s.get("total") or 0)
    wins = int(s.get("wins") or 0)
    parts = [_tour_label(p.tour)]
    if p.country:
        parts.append(p.country)
    if p.first_year and p.last_year:
        parts.append(f"{p.first_year}–{p.last_year}")
    line = " · ".join(parts)
    facts = [f"Career {wins}–{total - wins} ({_pct(wins, total)})"]
    if s.get("career_high_rank"):
        facts.append(f"career high #{int(s['career_high_rank'])}")
    titles = []
    if s.get("gs_titles"):
        titles.append(f"{int(s['gs_titles'])} Grand Slam title{'s' if s['gs_titles'] != 1 else ''}")
    if s.get("tour_titles"):
        titles.append(f"{int(s['tour_titles'])} tour title{'s' if s['tour_titles'] != 1 else ''}")
    desc = f"{line}. {', '.join(facts)}." + (f" {', '.join(titles)}." if titles else "")
    return Preview(_t(p.name), desc + " Form, splits, serve and return, every match.")


def _versus(con: duckdb.DuckDBPyConnection, slug_a: str, slug_b: str, tour: Optional[str]) -> Optional[Preview]:
    d = directory.current(con)
    a = (d.players_by_slug(slug_a, tour) or d.players_by_slug(slug_a) or [None])[0]
    if a is None:
        return None
    b = (d.players_by_slug(slug_b, a.tour) or [None])[0]
    if b is None:
        return None
    last = lambda n: n.split(" ")[-1]  # noqa: E731
    sa, sb = (last(a.name), last(b.name)) if last(a.name) != last(b.name) else (a.name, b.name)
    title = _t(f"{sa} vs {sb}")
    df = q_h2h(con, a.name, b.name, tour=a.tour)
    if df.empty:
        return Preview(title, f"{a.name} and {b.name} have never met. Compare their careers side by side.")
    wa = int((df["winner_name"] == a.name).sum())
    wb = len(df) - wa
    if wa == wb:
        lead = f"Level at {wa}–{wb}"
    else:
        leader, hi, lo = (sa, wa, wb) if wa > wb else (sb, wb, wa)
        lead = f"{leader} leads {hi}–{lo}"
    years = df["date"].astype(str).str[:4]
    latest = df.sort_values("date", ascending=False).iloc[0]
    desc = (
        f"{lead} in {len(df)} meeting{'s' if len(df) != 1 else ''}, {years.min()}–{years.max()}. "
        f"Last: {last(latest['winner_name'])} won {latest['score']}, {latest['tournament']} {str(latest['date'])[:4]}."
    )
    return Preview(title, desc)


def _tournament(con: duckdb.DuckDBPyConnection, slug: str, year: Optional[int], tour: Optional[str]) -> Optional[Preview]:
    d = directory.current(con)
    events = d.tournaments_by_slug(slug, tour) or d.tournaments_by_slug(slug)
    if not events:
        return None
    t = next((e for e in events if year in e.years), events[0]) if year else events[0]
    meta = " · ".join(x for x in (_tour_label(t.tour), t.level_name or "", t.surface or "") if x)
    if not year:
        return Preview(_t(t.name), f"{meta}. Held {t.first_year}–{t.last_year}: every edition's draw, storylines and stat leaders.")
    title = _t(f"{t.name} {year}")
    if year not in t.years:
        return Preview(title, f"No {year} edition of {t.name} on record.")
    row = con.execute(
        """SELECT winner_name, loser_name, score FROM matches_main
           WHERE tournament = $1 AND year = $2 AND tour = $3 AND round = 'F' LIMIT 1""",
        [t.name, year, t.tour],
    ).fetchone()
    if row:
        return Preview(title, f"{meta}. {row[0]} d. {row[1]} {row[2]} in the final. The draw, storylines and stat leaders.")
    return Preview(title, f"{meta}. The draw, storylines and stat leaders.")


# ── Routing ──────────────────────────────────────────────────────────────────

_STATIC: dict[str, Preview] = {
    "": Preview(DEFAULT_TITLE, DEFAULT_DESCRIPTION),
    "tournament": Preview(_t("Tournaments"), "Every ATP and WTA event on record: who won, how, and what happened along the way."),
    "versus": Preview(_t("Matchup"), "Head-to-head records and two careers side by side, for any pair of players."),
    "records": Preview(_t("Records"), "Who leads the tour at everything, for any season, surface or level."),
    "lab": Preview(_t("Lab"), "Ask the database anything: plain-English examples, editable SQL, results and CSV."),
    "about": Preview(_t("About the data"), "What the figures cover, what they mean, and where they can mislead."),
}


def preview_for(path: str, query: str, open_db: Callable[[], duckdb.DuckDBPyConnection]) -> Preview:
    """The preview for a site path like 'player/jannik-sinner' and its query string."""
    parts = [p for p in path.strip("/").split("/") if p]
    params = {k: v[0] for k, v in parse_qs(query).items() if v}
    tour = params.get("tour") if params.get("tour") in ("M", "F") else None
    key = parts[0] if parts else ""

    if key == "lab" and params.get("example") in _QUESTIONS:
        return Preview(_t("Lab"), _QUESTIONS[params["example"]])
    if len(parts) <= 1:
        return _STATIC.get(key, _STATIC[""])

    try:
        con = open_db()
    except Exception:  # noqa: BLE001 - a preview must never break the page
        logger.exception("link preview: database unavailable")
        return _STATIC.get(key, _STATIC[""])
    try:
        result: Optional[Preview] = None
        if key == "player" and len(parts) == 2:
            result = _player(con, parts[1], tour)
        elif key == "versus" and len(parts) == 3:
            result = _versus(con, parts[1], parts[2], tour)
        elif key == "tournament" and len(parts) in (2, 3):
            year = int(parts[2]) if len(parts) == 3 and parts[2].isdigit() else None
            result = _tournament(con, parts[1], year, tour)
        return result or _STATIC.get(key, _STATIC[""])
    except Exception:  # noqa: BLE001
        logger.exception("link preview failed for %s", path)
        return _STATIC.get(key, _STATIC[""])
    finally:
        con.close()


def _set_meta(page: str, attr: str, name: str, content: str) -> str:
    tag = f'<meta {attr}="{name}" content="{html.escape(content, quote=True)}" />'
    pattern = re.compile(rf'<meta\s+{attr}="{re.escape(name)}"\s+content="[^"]*"\s*/?>')
    if pattern.search(page):
        return pattern.sub(lambda _: tag, page, count=1)
    return page.replace("</head>", f"    {tag}\n  </head>", 1)


def render_index(template: str, preview: Preview) -> str:
    """index.html with the preview's title, description, Open Graph and Twitter tags."""
    page = re.sub(r"<title>.*?</title>", lambda _: f"<title>{html.escape(preview.title)}</title>", template, count=1, flags=re.S)
    page = _set_meta(page, "name", "description", preview.description)
    page = _set_meta(page, "property", "og:title", preview.title)
    page = _set_meta(page, "property", "og:description", preview.description)
    page = _set_meta(page, "property", "og:site_name", SITE)
    page = _set_meta(page, "name", "twitter:card", "summary")
    page = _set_meta(page, "name", "twitter:title", preview.title)
    page = _set_meta(page, "name", "twitter:description", preview.description)
    return page
