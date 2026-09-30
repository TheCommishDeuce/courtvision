# courtvision v1 — build plan

The engineering handoff for rebuilding the frontend. It combines the Claude
Design handoff ([DESIGN.md](DESIGN.md) + `prototype/`) with the engineering
gaps from the product brief ([../design-brief/](../design-brief/README.md)),
checked against the current API.

## Sources of truth

| Question | Answer lives in |
|---|---|
| What a screen does, what data means, which states exist | `../design-brief/` (01–05) |
| How it looks and behaves: tokens, type, layout, interactions | `DESIGN.md` |
| Reference rendering of every screen and state | `prototype/*.dc.html` (serve with `npx serve prototype`; start at `Board.dc.html`) |
| What must change in the API and pipeline, and in what order | this file |

Where the design changed the brief, **the design wins**:
- The wordmark is lowercase **courtvision**, also in `<title>` and the citation text.
- New route **`/about`** ("About the data": coverage, caveats, glossary).
- The Records full table adds a `sort=<column>` URL param.
- The theme persists in `localStorage['cv-theme']`; `?theme=` overrides it without persisting.
- Recent searches live in `localStorage['cv-recent']` (max 5).

**Prototype shortcuts to ignore:** every player link opens Sinner; only the
sample pairs, years, boards and examples return data; `Tournament.dc.html`
uses `?event=` instead of the real `/tournament/:slug/:year` path; filters
don't fully recompute the figures.

---

## Frontend stack

**Keep:** React 19, Vite, TypeScript, React Router 7, React Query 5, zod, and
the API layer: `api/http.ts` (the one axios instance that sends the access-gate
header), `createQueryHook`, `state/useUrlFilters` (per-field zod fallback and
`replace` history already match the brief), and the pure logic in `domain/`
(`rounds`, `matchStats`, `playerMatches`, `yearRange`) with its tests. The API
keeps serving `frontend/dist` as an SPA, so no SSR.

**Replace:**
- `index.css` (Courtside) → the new tokens from DESIGN.md › Design tokens.
  Declare them once on `:root` / `[data-theme=dark]` / the
  `prefers-color-scheme` block. If Tailwind stays, map them through
  `@theme inline` the same way it's done today; don't declare a colour anywhere
  else.
- The fonts in `index.html`: Archivo / Inter / JetBrains Mono → **Schibsted
  Grotesk 400–800** and **IBM Plex Mono 400/500**. Apply `tabular-nums` only to
  data tables (DESIGN.md explains why).
- All pages, `components/sections/*` and the visual primitives. The new shared
  components are the ones the design names: `SiteHeader`, `SiteFooter`,
  `SearchBox` (variants `players-only`, `events-only`, `tour`, `exclude`,
  `onPick`), `FilterBar`, `MatchRow` (+ stats panel), `Record`, `Board`,
  the skeleton / error / empty blocks.

**Drop:**
- `recharts`. Every v1 chart is plain CSS or SVG: year bars, one SVG rank line,
  the heat table, W/L strips, percentile bars, H2H momentum cells.
- `SpecimenPage` / `/_specimen`. `prototype/Board.dc.html` does that job now.

**Routes:**

| Route | Page |
|---|---|
| `/` | Home |
| `/player/:slug` | Player |
| `/versus`, `/versus/:a/:b` | Matchup (picker / pair) |
| `/tournament`, `/tournament/:slug/:year` | Tournament (browse / event) |
| `/records` (`?board=&sort=`) | Records |
| `/lab` (`?example=` or `?sql=`) | Lab |
| `/about` | About the data |

**Legacy redirects** (old links in the wild must keep working):
`/player?p=<name>` → `/player/<slug>` · `/versus?a=&b=` → `/versus/<a>/<b>` ·
`/tournament?t=&year=` → `/tournament/<slug>/<year>` · `/search` → `/lab` ·
the existing `/leaders`, `/h2h`, `/compare` redirects are retargeted. All of
these need the slug resolver (B2, `/api/directory/*`).

---

## Backend work

Ordered by what it blocks. **B** = new API or pipeline work.
**C** = done in the client from data the API already returns; listed so nobody
builds an endpoint for it.

### Blocking the shell (do first)

| # | Work | Why | Notes |
|---|---|---|---|
| B1 ✅ | **`GET /api/directory/suggest?q=&tour=&kind=all\|players\|tournaments&exclude=&limit=`** (done: `api/directory.py`). Returns `{matchup, tournament_years[], players[], tournaments[]}`. Players are ranked by career high, then match count, each with `name, slug, tour, country, first_year, last_year, career_high, matches`; tournaments are ranked by level, then match count. `"sinner alcaraz"` / `"a vs b"` → matchup (same tour only; a full single name is never split); `"wimbledon 2025"` → tournament-years. `exclude` + `tour` + `kind=players` is the pair picker | Every search box (header, hero, pair picker, events-only) | An in-memory index built on first use (~0.8 s) and rebuilt when the DB file changes; warm queries take 20–70 ms. Kept out of the DB so the Lab's four-relation boundary holds |
| B2 ✅ | **Slugs** (done). A slug is a **pure function of the display name**: lowercase → NFKD → drop marks → transliterate ø/æ/œ/ß/ł/đ/ð/þ/ı → drop apostrophes → non-`[a-z0-9]` runs become `-`. So slugs never change as data grows, and the frontend computes them itself; its `slugify` must pass `tests/fixtures/slug_vectors.json`. Resolvers: `GET /api/directory/players/{slug}?tour=` and `GET /api/directory/tournaments/{slug}?tour=` (the latter includes `years`), returning every match, most prominent first; 404 if none | Every route and every name link, including Lab result columns | A slug shared by two entries (the same name on both tours; Wimbledon ATP and WTA) is disambiguated with `?tour=`. With no `tour`, take the first (most prominent) |
| B3 ✅ | **Tournament name normalisation** (done: `pipeline/tournaments.py`; 17,386 → 16,656 names, 136 qualifying events folded in) in the pipeline: a canonical event name + slug; qualifying events (`… Q`) folded into their parent event with a qualifying flag; tour prefixes (`ATP Stuttgart`, `WTA 'S-Hertogenbosch`) stripped | Tournament slugs (B2), search results, the browse list | Pipeline change + a re-run. Do before tournament slugs, or they'll change later |

### Blocking individual screens

| # | Work | Screen | Notes |
|---|---|---|---|
| B4 ✅ | **`main_draw_only` (default true)** (done; recap also returns each match's `date` and `main_draw_matches` / `qualifying_matches`; rate leaders need 2+ matches) on `/api/tournament/recap` (biggest upsets, longest matches, stat leaders) and `/api/tournament/draw-strength` | Tournament | The draw itself can filter Q1–Q3 on the client; the server-computed lists can't. Without this, Jarry "leads" Wimbledon 2025 aces with 150 |
| B5 ✅ | **`GET /api/player/splits`** (done: one call, ~0.3 s; each row also returns its relational-search `params` and exact `lab_sql`): every Splits row (opponent / situation / stage groups) with career, 5-year and 52-week W–L in one call; the same filters as the other player endpoints | Player | Fallback until then: fan out 14 `/api/search/relational` calls (it works, it's just slow). Expanding a row still calls `/api/search/relational` for its match list |
| B6 ✅ | **Storylines rotate daily** (done): `q_storylines` seeds its RNG with the date | Home | — |
| B7 ✅ | **Lab examples registry** (done: `frontend/src/next/lab/examples.sql` is the single source, parsed by `examples.ts`; `tests/test_lab_examples.py` runs each one through the query path): move the six queries in `../design-brief/samples/lab-examples.sql` into the app (static TS config is enough) | Home, Lab | `?example=<id>` resolves against it |
| B8 | **Fresh data**: incremental scrape + pipeline. The DB ends 10 Aug 2026 | Launch | Every "data through" line shows it |

### Done on the client (no backend work)

| # | Item | From |
|---|---|---|
| C1 | Player **current rank "as of"** and **career high "first reached"** | Last and first-minimum entry of `/api/player/rank-history`. These are ranks **at match time**, not the official weekly list: label "current" as "as of <last match>", as the prototype does |
| C2 | Player **last-20 W/L strip**, Form windows | `/api/player/matches.last20`, `/api/player/form` |
| C3 | "499 of 548 matches have point statistics" | `serve_stats.matches_with_stats` + `summary.total` |
| C4 | Year filter limited to the career span; ranking table per year (best / last) | `matches.by_year`, `rank-history` |
| C5 | Matchup: first meeting, last meeting, current run, momentum | `/api/h2h.matches` |
| C6 | Tournament: champion's path, ◆ markers, final duration, "No 2020 edition" + nearest years | `recap.matches_by_round`, `/api/tournament/years` |
| C7 | Records full table: sort, paging, `?sort=` | Leader endpoints already return every qualifying row |
| C8 | "Open in Lab" SQL for splits, recent matches, boards | SQL templates in the client, using the shared filter → SQL mapping the query builder already has (`sections/query/builderConfig.ts`) |
| C9 | Lab client-side pre-check (SELECT / WITH only, one statement, 20,000 characters) | UX only: the server's five layers of containment stay the real guard. **Do not touch `api/routers/query.py` or weaken `tests/test_query_endpoint.py`** |
| C10 | Popular rivalries (Matchup, no pair chosen), Home example chips | Static lists |
| C11 | Footer freshness and scale line | `/api/meta/stats` (`data_through`, `total_matches`, `year_min/max`) |

### Optional, not in v1

- **Link previews.** Journalists will paste links into social apps and chat,
  and an SPA gives every URL the same generic preview. The FastAPI SPA
  fallback could inject per-URL `<title>` / Open Graph tags (player name +
  record, matchup score, event champion) before returning `index.html`. Cheap,
  and high value for the audience, but not required to ship.

---

## Build order

Each phase ends green in CI (`pytest`, `tsc -b`, `eslint --max-warnings 0`,
`vitest`, `vite build`) and deployable.

**Working on the rebuild.** The new app lives in `frontend/src/next/` next to
the current one, and `src/main.tsx` picks one at build time:

```bash
npm run dev:next      # the rebuild on :5173 (needs the API on :8000)
npm run build:next    # production build of the rebuild
npm run dev / build   # the current site, which is what deploy.sh ships
```

`import.meta.env.VITE_APP` is replaced at build time, so the default build
contains no rebuild code (checked in phase 1). Phase 8 removes the switch.
`/_kit` in the rebuild shows every shared component with live data.

| Phase | Scope | Exit check |
|---|---|---|
| **0. Backend prerequisites** | B3 → B2 → B1, B6, B8 (start the scrape early, it's slow) | New endpoints covered by tests in the style of `tests/test_query_modules_smoke.py`, going through `TestClient` with the gate headers (`tests/test_dashboard_access.py`) |
| **1. Foundation** ✅ | Tokens + fonts, theme switch, `SiteHeader`, `SiteFooter`, `SearchBox` (all variants), `FilterBar`, `MatchRow`, `Record`, state blocks, the router with every route and legacy redirect, `/about` | Every component matches its `prototype/*.dc.html` in light and dark at 390 and 1280 px; there's no sideways scroll at 320 px |
| **2. Home** ✅ | All five blocks; B7 examples | Matches `Home.dc.html` incl. its error state |
| **3. Player** ✅ | Every block; Splits via fan-out, switched to B5 when it lands | Matches `Player.dc.html` incl. `?state=loading/error/notfound/nostats` and `?surface=Carpet` |
| **4. Matchup** ✅ | Picker, headline, splits, momentum, meetings, careers | Matches `Versus.dc.html` incl. never met / no pair |
| **5. Tournament** ✅ | Browse + event, B4 | Matches `Tournament.dc.html` incl. `year=2020` |
| **6. Records** | Grid + full table | Matches `Records.dc.html` incl. `?board=ace_pct` |
| **7. Lab** | Examples, builder, editor with highlighting, results, CSV, schema drawer | Matches `Lab.dc.html` incl. `?state=error`; the deploy smoke test still sees `DROP` rejected with a 400 |
| **8. Cleanup** | Make `src/next` the only app: drop the `VITE_APP` switch and `legacyMain.tsx`, move the fonts from `styles.css`'s `@import` into `index.html`, then delete the old pages, sections, primitives, `recharts`, Courtside CSS; rewrite `AGENTS.md` §8 (Frontend) for the new design system | `rg Courtside` and dead-import checks come back clean |

Phases 2–7 can run in parallel once phase 1 is merged. Player is the largest
(the prototype is 57 KB) and sets most shared patterns, so start it first if
there's one pair of hands.

---

## Risks and open questions

1. **Rank history is match-time ranks**, not the weekly ranking list (171
   points across Sinner's career). The ranking chart and "current rank" are
   accurate to the last match, not to the latest official ranking. That's fine
   for v1 if labelled; `players.current_rank` is an alternative for "current"
   if it's kept fresh.
2. **Slug stability.** Slugs derive from display names, so they're stable as
   long as canonical names are. They change only if the pipeline's canonical
   spelling for a player or event changes (a new `DISPLAY_OVERRIDES` entry, a
   new reference spelling). Before merging such a change, check whether it
   renames anything already linked; if it does, add a redirect.
3. **Splits cost.** Until B5 lands, 14 calls per player-page load, re-run on
   every filter change. Debounce the filters and let React Query cache.
4. **Google Fonts** is the only third-party request the new design adds (same
   as today). If a CSP is ever introduced, allow `fonts.googleapis.com` and
   `fonts.gstatic.com`.

---

## Phase notes

**Phase 1 (foundation), done 30 Sep 2026.** Tokens, header (desktop + phone
sheet), footer, SearchBox (all / players picker / events), FilterBar,
MatchRow + stats panel, Record, states, CopyButton, `/about`, every route
(later screens are placeholders), legacy redirects (`lib/legacy.ts`). Visual
comparison with the prototypes still has to be done in a browser; the
automated checks cover behaviour. Deviations from the prototype:
- FilterBar level options are **per tour** and use API values (`All Tour`,
  `ATP 250/500`, `WTA 500`…), because the data can't split ATP 250 from 500.
- URL filters use `from` / `to` (the old site used `y0` / `y1`, which redirect).
  Values equal to the page's defaults are left out of the URL.
- Player links carry no `?tour=`; a slug on both tours is resolved on the
  Player page (phase 3).

**Phase 2 (Home), done 30 Sep 2026.** Hero search with chips and freshness,
Leading this season (storyline links translated to v1 Records URLs), Try
asking (from the examples registry), Latest champions and Recent upsets for
both tours, each block with its own skeleton and retry. Changes:
- `/api/tournament/recent-champions` gained `span=recent` (the latest
  tour-level finals across weeks). The default `span=week` returned only that
  week's events (4 WTA finals). The old site still uses the default.
- Teasers read "e.g. …" rather than the prototype's "Latest: …" so they stay
  true after a data refresh.
- The upsets caption said "gap = loser's rank minus winner's"; it's the other
  way round (#484 d. #109 is a gap of 375).
- Data gap seen here: the latest tour-level final in the DB is Roland Garros
  2026 although `data_through` is 10 Aug 2026; grass-season finals are missing
  until the scrape is refreshed (B8).

**Phase 3 (Player), done 30 Sep 2026.** Identity, sticky filters, Form (with
the last-20 strip), Career shape (year bars, rank trajectory with log / top-100
scales and a table alternative, surface × level grid), Record vs ranked
opponents, Splits (via B5, rows open to their matches and the Lab), Serve and
return with percentiles, Milestones, Recent matches; not-found with
suggestions; one empty state for filters with no matches; `?tour=` picks
between namesakes. Changes:
- "Current rank" is labelled **Latest rank … at their last match**: it comes
  from match-time ranks (risk 1).
- The surface × level grid and the rank chart are career views (the API has no
  surface/level filter for them); cells outside the active filters are dimmed.
- Splits' Lab SQL is generated by the backend from the same conditions the
  counts use (`relational_lab_sql`); a test runs every row's SQL through the
  hardened Lab path and checks it returns exactly the row's count.
- Question lines use the player's surname rather than a pronoun.

**Phase 4 (Matchup), done 30 Sep 2026.** Pair picker (players-only search
limited to the other player's tour, swap, partial pair as `/versus?a=`),
popular rivalries, headline record with first / last meeting and current run,
surface and level splits, momentum linked to each meeting row, every meeting,
and the two careers (always the whole career, better figure marked). Never
met, different tours and unknown slugs each get a plain message. Short names
fall back to initials for shared surnames (the Williams sisters). No backend
changes: the career rows reuse the Player endpoints.

**Phase 5 (Tournament), done 30 Sep 2026.** Browse (events-only search, tour
toggle, latest champions across weeks) and the edition page: tour switch when
the event exists on both tours, year arrows and jump list, the final, the
draw by round (Final first; the champion's matches marked ◆ and a path strip
that opens each round), a qualifying toggle that also recomputes the lists,
storylines, stat leaders; missing years offer the nearest editions. URL state:
`?tour=`, `?qualifying=1`, `?round=`. Changes:
- "Toughest runs" is the average rank of opponents **faced** (what
  draw-strength measures), for players with 3+ main-draw matches; the prototype
  said "beaten".
- Dates in the draw are the event's start date: the data has no day of play.
- The default main-draw scope also applies on the old site's tournament page.
