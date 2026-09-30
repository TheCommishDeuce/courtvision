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
these need the slug resolver (B2).

---

## Backend work

Ordered by what it blocks. **B** = new API or pipeline work.
**C** = done in the client from data the API already returns; listed so nobody
builds an endpoint for it.

### Blocking the shell (do first)

| # | Work | Why | Notes |
|---|---|---|---|
| B1 | **`GET /api/search/suggest?q=&tour=&kind=players\|events`**: players ranked by career-high rank, then match count, each with `name, slug, tour, country, first_year, last_year, career_high`; tournaments with `name, slug, tour, level`; a detected matchup (two fragments that resolve to two players on the same tour) and a tournament-year (`name + year`) | Every search box (header, hero, pair picker, events-only) | Replaces loading 38k names from `/api/meta/players`. The sub-line in the design (`ITA · 2018–2026 · career high #1`) needs all these fields |
| B2 | **Slugs**: `slug ↔ name` for players and tournaments. Collision rule: `-atp` / `-wta` suffix, then `-2`. Every API response that names a player or event also returns its slug, or the client resolves slugs through one lookup endpoint | Every route and every name link, including Lab result columns | Resolve via one API rather than guessing slugs client-side |
| B3 ✅ | **Tournament name normalisation** (done: `pipeline/tournaments.py`; 17,386 → 16,656 names, 136 qualifying events folded in) in the pipeline: a canonical event name + slug; qualifying events (`… Q`) folded into their parent event with a qualifying flag; tour prefixes (`ATP Stuttgart`, `WTA 'S-Hertogenbosch`) stripped | Tournament slugs (B2), search results, the browse list | Pipeline change + a re-run. Do before tournament slugs, or they'll change later |

### Blocking individual screens

| # | Work | Screen | Notes |
|---|---|---|---|
| B4 | **`main_draw_only` (default true)** on `/api/tournament/recap` (biggest upsets, longest matches, stat leaders) and `/api/tournament/draw-strength` | Tournament | The draw itself can filter Q1–Q3 on the client; the server-computed lists can't. Without this, Jarry "leads" Wimbledon 2025 aces with 150 |
| B5 | **`GET /api/player/splits`**: every Splits row (opponent / situation / stage groups) with career, 5-year and 52-week W–L in one call; the same filters as the other player endpoints | Player | Fallback until then: fan out 14 `/api/search/relational` calls (it works, it's just slow). Expanding a row still calls `/api/search/relational` for its match list |
| B6 | **Storylines rotate daily**: seed `random` with the date in `q_storylines` | Home | One-line change |
| B7 | **Lab examples registry**: move the six queries in `../design-brief/samples/lab-examples.sql` into the app (static TS config is enough) | Home, Lab | `?example=<id>` resolves against it |
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

| Phase | Scope | Exit check |
|---|---|---|
| **0. Backend prerequisites** | B3 → B2 → B1, B6, B8 (start the scrape early, it's slow) | New endpoints covered by tests in the style of `tests/test_query_modules_smoke.py`, going through `TestClient` with the gate headers (`tests/test_dashboard_access.py`) |
| **1. Foundation** | Tokens + fonts, theme switch, `SiteHeader`, `SiteFooter`, `SearchBox` (all variants), `FilterBar`, `MatchRow`, `Record`, state blocks, the router with every route and legacy redirect, `/about` | Every component matches its `prototype/*.dc.html` in light and dark at 390 and 1280 px; there's no sideways scroll at 320 px |
| **2. Home** | All five blocks; B7 examples | Matches `Home.dc.html` incl. its error state |
| **3. Player** | Every block; Splits via fan-out, switched to B5 when it lands | Matches `Player.dc.html` incl. `?state=loading/error/notfound/nostats` and `?surface=Carpet` |
| **4. Matchup** | Picker, headline, splits, momentum, meetings, careers | Matches `Versus.dc.html` incl. never met / no pair |
| **5. Tournament** | Browse + event, B4 | Matches `Tournament.dc.html` incl. `year=2020` |
| **6. Records** | Grid + full table | Matches `Records.dc.html` incl. `?board=ace_pct` |
| **7. Lab** | Examples, builder, editor with highlighting, results, CSV, schema drawer | Matches `Lab.dc.html` incl. `?state=error`; the deploy smoke test still sees `DROP` rejected with a 400 |
| **8. Cleanup** | Delete the old pages, sections, primitives, `recharts`, Courtside CSS; rewrite `AGENTS.md` §8 (Frontend) for the new design system | `rg Courtside` and dead-import checks come back clean |

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
2. **Slug stability.** Once links are shared, slugs are permanent. Settle B3
   (event names) before publishing tournament URLs, and keep a redirect table
   if a canonical name ever changes.
3. **Splits cost.** Until B5 lands, 14 calls per player-page load, re-run on
   every filter change. Debounce the filters and let React Query cache.
4. **Google Fonts** is the only third-party request the new design adds (same
   as today). If a CSP is ever introduced, allow `fonts.googleapis.com` and
   `fonts.gstatic.com`.
