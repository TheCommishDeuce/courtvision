"""In-memory directory of players and tournaments: slugs, resolution, search.

Built from the database on first use and rebuilt whenever the database file
changes (the pipeline replaces it; the API never writes). It lives in process
memory rather than as a table so the database file keeps exactly the four
relations the Lab exposes (see api/routers/query.py).

Slugs are a pure function of the display name (see `slugify`), so a link never
changes when data is added and the frontend computes the same slug itself
(shared vectors: tests/fixtures/slug_vectors.json). Two entries can share a
slug (one name on both tours); resolvers return every match and callers pick
by tour.
"""
from __future__ import annotations

import re
import threading
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

import duckdb

from db.connection import db_path

_APOSTROPHES = re.compile(r"['’‘`]")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_YEAR = re.compile(r"^(18|19|20)\d\d$")
_VERSUS = re.compile(r"\s+(?:vs\.?|v\.?|versus)\s+", re.IGNORECASE)

# Search order for tournaments: the bigger the event, the higher it ranks.
_LEVEL_WEIGHT = {
    "Grand Slam": 0,
    "Tour Finals": 1,
    "Olympics": 2,
    "Masters 1000": 2,
    "ATP 250/500": 3,
    "WTA 500": 3,
    "WTA 250": 4,
    "WTA": 4,
    "Davis Cup": 5,
    "BJK Cup": 5,
    "Challenger": 6,
    "ITF": 7,
}
_UNRANKED = 100_000


# Letters NFKD does not decompose into a base letter plus accent.
_TRANSLITERATE = str.maketrans({
    "ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "ı": "i",
})


def slugify(name: str) -> str:
    """URL slug: lowercase, accents and apostrophes dropped, words joined by '-'.

    Steps, in this order (the TypeScript twin must match; see the module
    docstring): lowercase; NFKD; drop combining marks; transliterate the
    letters above; drop apostrophes; runs of anything but a-z0-9 become '-'.
    """
    text = unicodedata.normalize("NFKD", name.lower())
    text = "".join(c for c in text if not unicodedata.category(c).startswith("M"))
    text = _APOSTROPHES.sub("", text.translate(_TRANSLITERATE))
    return _NON_ALNUM.sub("-", text).strip("-")


def tokens(text: str) -> list[str]:
    """Search tokens, normalised the same way as slugs."""
    return [t for t in slugify(text).split("-") if t]


@dataclass(frozen=True)
class Player:
    name: str
    slug: str
    tour: str
    country: Optional[str]
    first_year: Optional[int]
    last_year: Optional[int]
    career_high: Optional[int]
    matches: int
    words: tuple[str, ...] = field(repr=False, compare=False)

    def public(self) -> dict:
        return {
            "name": self.name, "slug": self.slug, "tour": self.tour, "country": self.country,
            "first_year": self.first_year, "last_year": self.last_year,
            "career_high": self.career_high, "matches": self.matches,
        }

    @property
    def order(self) -> tuple:
        return (self.career_high or _UNRANKED, -self.matches, self.name)


@dataclass(frozen=True)
class Tournament:
    name: str
    slug: str
    tour: str
    level_name: Optional[str]
    surface: Optional[str]
    first_year: Optional[int]
    last_year: Optional[int]
    matches: int
    years: tuple[int, ...] = field(repr=False)
    words: tuple[str, ...] = field(repr=False, compare=False)

    def public(self, with_years: bool = False) -> dict:
        out = {
            "name": self.name, "slug": self.slug, "tour": self.tour, "level_name": self.level_name,
            "surface": self.surface, "first_year": self.first_year, "last_year": self.last_year,
            "matches": self.matches,
        }
        if with_years:
            out["years"] = list(self.years)
        return out

    @property
    def order(self) -> tuple:
        return (_LEVEL_WEIGHT.get(self.level_name or "", 8), -self.matches, self.name)


def _matches(words: tuple[str, ...], query: list[str]) -> bool:
    """Every query token is a prefix of a distinct word of the name."""
    remaining = list(words)
    for q in query:
        for i, w in enumerate(remaining):
            if w.startswith(q):
                del remaining[i]
                break
        else:
            return False
    return True


class Directory:
    def __init__(self, players: list[Player], tournaments: list[Tournament]):
        self.players = sorted(players, key=lambda p: p.order)
        self.tournaments = sorted(tournaments, key=lambda t: t.order)
        self._players_by_slug: dict[str, list[Player]] = {}
        for p in self.players:
            self._players_by_slug.setdefault(p.slug, []).append(p)
        self._tournaments_by_slug: dict[str, list[Tournament]] = {}
        for t in self.tournaments:
            self._tournaments_by_slug.setdefault(t.slug, []).append(t)

    # ── Resolution ────────────────────────────────────────────────────────
    def players_by_slug(self, slug: str, tour: Optional[str] = None) -> list[Player]:
        return [p for p in self._players_by_slug.get(slug, []) if tour is None or p.tour == tour]

    def tournaments_by_slug(self, slug: str, tour: Optional[str] = None) -> list[Tournament]:
        return [t for t in self._tournaments_by_slug.get(slug, []) if tour is None or t.tour == tour]

    # ── Search ────────────────────────────────────────────────────────────
    def find_players(
        self, query: list[str], tour: Optional[str] = None, exclude: Optional[str] = None, limit: int = 8,
    ) -> list[Player]:
        if not query:
            return []
        out = []
        for p in self.players:
            if (tour is None or p.tour == tour) and p.name != exclude and _matches(p.words, query):
                out.append(p)
                if len(out) >= limit:
                    break
        return out

    def find_tournaments(
        self, query: list[str], tour: Optional[str] = None, year: Optional[int] = None, limit: int = 8,
    ) -> list[Tournament]:
        if not query:
            return []
        out = []
        for t in self.tournaments:
            if (tour is None or t.tour == tour) and (year is None or year in t.years) and _matches(t.words, query):
                out.append(t)
                if len(out) >= limit:
                    break
        return out

    def find_matchup(self, text: str, tour: Optional[str] = None) -> Optional[tuple[Player, Player]]:
        """Two players on one tour named in `text`.

        With an explicit separator ("a vs b", "a v b") the split is given.
        Otherwise every split of the tokens is tried, but only when the whole
        query does not already name one player, so "jannik sinner" stays a
        player search rather than "Jannik X vs Y Sinner".
        """
        parts = _VERSUS.split(text.strip(), maxsplit=1)
        if len(parts) == 2:
            splits = [(tokens(parts[0]), tokens(parts[1]))]
        else:
            toks = tokens(text)
            if len(toks) < 2 or self.find_players(toks, tour, limit=1):
                return None
            splits = [(toks[:i], toks[i:]) for i in range(1, len(toks))]

        best: Optional[tuple[Player, Player]] = None
        for left, right in splits:
            for t in ([tour] if tour else ["M", "F"]):
                a = self.find_players(left, t, limit=1)
                if not a:
                    continue
                b = self.find_players(right, t, exclude=a[0].name, limit=1)
                if not b:
                    continue
                pair = (a[0], b[0])
                if best is None or _pair_order(pair) < _pair_order(best):
                    best = pair
        return best

    def suggest(
        self, q: str, tour: Optional[str] = None, kind: str = "all",
        exclude: Optional[str] = None, limit: int = 8,
    ) -> dict:
        toks = tokens(q)
        year = int(toks[-1]) if len(toks) >= 2 and _YEAR.match(toks[-1]) else None
        name_toks = toks[:-1] if year else toks

        result: dict = {"query": q, "matchup": None, "tournament_years": [], "players": [], "tournaments": []}
        if kind in ("all", "players"):
            result["players"] = [p.public() for p in self.find_players(name_toks, tour, exclude, limit)]
        if kind in ("all", "tournaments"):
            result["tournaments"] = [t.public() for t in self.find_tournaments(name_toks, tour, limit=limit)]
            if year:
                result["tournament_years"] = [
                    {**t.public(), "year": year} for t in self.find_tournaments(name_toks, tour, year, limit=2)
                ]
        if kind == "all" and not year:
            pair = self.find_matchup(q, tour)
            if pair:
                result["matchup"] = {"tour": pair[0].tour, "a": pair[0].public(), "b": pair[1].public()}
        return result


def _pair_order(pair: tuple[Player, Player]) -> tuple:
    return ((pair[0].career_high or _UNRANKED) + (pair[1].career_high or _UNRANKED), -(pair[0].matches + pair[1].matches))


# ── Building ──────────────────────────────────────────────────────────────

_PLAYERS_SQL = """
WITH appearances AS (
    SELECT winner_name AS name, tour, year, winner_rank AS rank FROM matches_main WHERE NOT is_walkover
    UNION ALL
    SELECT loser_name, tour, year, loser_rank FROM matches_main WHERE NOT is_walkover
),
careers AS (
    SELECT name, tour, count(*) AS matches, min(year) AS first_year, max(year) AS last_year,
           CAST(min(rank) AS INTEGER) AS career_high
    FROM appearances GROUP BY name, tour
),
reference AS (
    SELECT name, tour, any_value(country) AS country FROM players GROUP BY name, tour
)
SELECT c.name, c.tour, r.country, c.first_year, c.last_year, c.career_high, c.matches
FROM careers c LEFT JOIN reference r USING (name, tour)
"""

_TOURNAMENTS_SQL = """
SELECT tournament AS name, tour,
       arg_max(level_name, date) AS level_name,
       arg_max(surface, date) AS surface,
       min(year) AS first_year, max(year) AS last_year, count(*) AS matches,
       list(DISTINCT year ORDER BY year) AS years
FROM matches_main
WHERE tournament IS NOT NULL
GROUP BY tournament, tour
"""


def build(con: duckdb.DuckDBPyConnection) -> Directory:
    players = [
        Player(name=n, slug=slugify(n), tour=t, country=c, first_year=fy, last_year=ly,
               career_high=ch, matches=m, words=tuple(tokens(n)))
        for n, t, c, fy, ly, ch, m in con.execute(_PLAYERS_SQL).fetchall()
        if n
    ]
    tournaments = [
        Tournament(name=n, slug=slugify(n), tour=t, level_name=lv, surface=s, first_year=fy,
                   last_year=ly, matches=m, years=tuple(ys or ()), words=tuple(tokens(n)))
        for n, t, lv, s, fy, ly, m, ys in con.execute(_TOURNAMENTS_SQL).fetchall()
    ]
    return Directory(players, tournaments)


_lock = threading.Lock()
_cached: Optional[tuple[tuple, Directory]] = None


def _file_key() -> tuple:
    path = db_path()
    try:
        st = path.stat()
    except FileNotFoundError:
        return (str(path), None, None)
    return (str(path.resolve()), st.st_mtime_ns, st.st_size)


def current(con: duckdb.DuckDBPyConnection) -> Directory:
    """The directory for the database file as it is now; rebuilt if it changed."""
    global _cached
    key = _file_key()
    cached = _cached
    if cached is not None and cached[0] == key:
        return cached[1]
    with _lock:
        if _cached is not None and _cached[0] == key:
            return _cached[1]
        directory = build(con)
        _cached = (key, directory)
        return directory
