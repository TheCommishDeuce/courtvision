# 02 — Shell, shared patterns and states

Everything here appears on, or applies to, every screen.

## Header

- **Wordmark** "CourtVision" → Home.
- **Search** (see below). Always visible on desktop; on phones it collapses to
  an icon that opens a full-screen search sheet.
- **Nav:** Records · Tournaments · Lab. (Players and matchups have no nav entry
  — search is the way in. "Tournaments" opens the tournament screen in its
  no-event-chosen state.)
- **Theme switch** (light / dark / system).

## Global search

The primary way into the site. Also appears large on Home.

| Input | Suggests |
|---|---|
| One name fragment (`sinn`) | **Players**, grouped ATP / WTA, each with country, career span (`2018–2026`) and career-high rank. **Tournaments**, each with its tour and level. |
| Two name fragments (`sinner alcaraz`, `sinner vs alcaraz`, `sinner v alcaraz`) | Top suggestion: **Sinner vs Alcaraz → matchup**. Then the individual players. |
| A tournament plus a year (`wimbledon 2025`) | That tournament-year first. |
| Nothing matches | "No player or tournament matches — try asking the Lab" with a link. |

Behaviour:
- `/` focuses search from anywhere; ↑ ↓ Enter navigate; Esc closes.
- Results are ranked by prominence (career-high rank / number of matches), not
  alphabetically. The database has ~38,000 players, most with a handful of
  matches, so an alphabetical list starting "A Aguilar, A Amer, A Benson…" is
  useless (see `samples/shell.json`).
- A matchup is only offered for two players on the same tour.
- Recent searches (this browser only) show when the box is focused and empty.

## Footer

- **"Data through 10 Aug 2026"** — the latest match date (`data_through` in
  `samples/shell.json`). Journalists need this before quoting anything.
- Scale line: `1,069,410 matches · 1910–2026 · ATP & WTA`.
- Credit: match data from Tennis Abstract / Jeff Sackmann.
- Link: "About the data" — the caveats in [04-data-dictionary.md](04-data-dictionary.md).

## URL scheme

Every state a user can reach must be reproducible from the address bar.

| What | URL |
|---|---|
| Player | `/player/jannik-sinner` |
| Player, filtered | `/player/jannik-sinner?surface=Clay&from=2023&to=2026&level=Grand+Slam` |
| Matchup | `/versus/jannik-sinner/carlos-alcaraz?surface=Hard` |
| Tournament-year | `/tournament/wimbledon/2025?tour=M` |
| Tournament, no event chosen | `/tournament` |
| Records, one board opened | `/records?board=ace_pct&tour=F&from=2026&to=2026` |
| Lab, example loaded | `/lab?example=teens-beat-no1` |
| Lab, custom SQL | `/lab?sql=<url-encoded SQL>` |

Rules: filter changes replace history (Back leaves the page rather than
stepping through every filter tweak). An invalid value for one filter falls
back to its default without resetting the others.

## Shared filter model

The same filter vocabulary is used on Player, Matchup, Records and in the Lab's
query builder, so it should look and behave identically everywhere.

| Filter | Values | Default |
|---|---|---|
| Tour | ATP · WTA | Player/matchup: implied by the player (not shown). Records/Tournament: ATP. |
| Surface | All · Hard · Clay · Grass · Carpet | All |
| Level | All · Tour level (all main-tour events) · Grand Slam · Masters 1000 / WTA 1000 · 500 · 250 · Tour Finals · Olympics · Challenger / WTA 125 · ITF | Player/matchup: All. Records: Tour level. |
| Years | From–To, 1910–2026 | Player/matchup: whole career. Records: current season. |

Requirements:
- **Active filters are always summarised in words** near the content they
  affect ("Clay · Grand Slams · 2023–2026"), so a screenshot is self-explaining.
- One-tap **reset**.
- On phones, filters live behind a single "Filters (2)" control showing the
  active count.
- Tour is per screen. There is no global ATP/WTA switch.

## Shared patterns

These recur on every screen. Design them once.

| Pattern | Content | Notes |
|---|---|---|
| **Player name** | Name, optional country code, optional rank at the time (`(3)`) | Always a link to the player. |
| **Record** | `W–L` plus win % | `64.4% · 67–37`. Mark small samples (< 10 matches) as low-confidence. |
| **Match row** | Date · tournament · round · surface · winner (rank) · loser (rank) · score · duration | The winner is shown distinctly. Retirement / walkover shown in the score (`RET`, `W/O`). Expands to the match stats panel. |
| **Match stats panel** | Side-by-side for both players: aces, double faults, 1st serve in %, 1st serve won %, 2nd serve won %, break points saved / faced | Absent for many older and lower-tier matches — show "No point statistics for this match", not zeros. |
| **Stat figure** | A value, its label, its sample, and an optional caveat marker | e.g. `Ace % 12.1 · 412 matches`. |
| **Surface tag** | Hard / Clay / Grass / Carpet | Each surface is recognisable at a glance. |
| **Round label** | Codes F, SF, QF, R16…R128, RR, Q1–Q3 | Show the code in dense tables and the full name ("Quarterfinal") where there is room. |
| **Tour tag** | ATP / WTA | Needed wherever both tours appear together (Home, search). |
| **Copy link** | Copies the current URL | On every screen. Optional "Copy citation": `CourtVision, data through 10 Aug 2026, <url>`. |
| **Data table** | Sortable columns, a pinned first column, paging | On phones, rows become cards; do not rely on sideways scrolling for more than about 4 columns. |

## States (every data block)

| State | Behaviour |
|---|---|
| Loading | Skeleton in the final shape of the block. No page-wide spinner once the frame has rendered. |
| Error | Inline in the failed block: a short message and a **Retry** button. Other blocks keep working. |
| Empty | Says why, in context: "Sinner and Nadal never met on grass." / "No matches for these filters." Offers a way out (widen the filters, reset). |
| Thin data | Figure shown, with a visible low-sample marker and a tooltip giving the count. |
| Not found | Unknown player or tournament slug: "No player called 'jannik-sinnr'", with search suggestions. |

## Accessibility and devices

See [05-constraints.md](05-constraints.md).
