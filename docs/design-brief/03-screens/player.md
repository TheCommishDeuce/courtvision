# Player: `/player/:slug`

**Purpose:** everything this player has done, cut however the reader wants,
with each figure one tap from the matches behind it.

**Sample data:** `samples/player.json` (Jannik Sinner, career) and
`samples/player-splits.json`.

## Filters

Surface · Level · Years (see the shared filter model in 02-shell). Tour is
implied by the player.

What the filters apply to:

| Block | Filters apply? |
|---|---|
| Identity header | No: always the career. |
| Form | Surface, level (the windows are always "most recent"). |
| Career shape | Surface and level. Years narrows the charts. |
| Record vs ranked opponents, Splits, Serve & return, Recent matches | All filters. |
| Percentiles vs tour | No: always the career vs the whole tour. Label it. |
| Milestones | No: always the career. |

The active-filter summary ("Clay · 2023–2026") sits at the top of the filtered
region, so it is obvious which figures are filtered and which are career.

## Blocks, in priority order

### 1. Identity header
- Name · country · age (born 16 Aug 2001) · plays R/L · height · career-high
  rank · current rank.
- Career W–L and win % (`425–123 · 77.6%`).
- Titles by tier: Grand Slams · tour titles · Challenger · ITF (`4 · 26 · 3 · 2`).
- Actions: **Compare with…** (opens search pre-set to build a matchup) ·
  **Copy link**.

### 2. Form
- Three windows: last 10 (`9–1`), last 20 (`19–1`), last 52 weeks (`83–8 · 91.2%`).
- Recent wins over top-50 players (date, opponent + rank, event, round).
- Recent losses to lower-ranked players.

### 3. Career shape
- **Win % by year**, with the match count visible per year.
- **Ranking trajectory**: weekly ranking over the career. Rank 1 at the top;
  the axis runs from ~1,600 down to 1, so it needs a log-like scale or a
  "top 100 only" view.
- **Surface × level grid**: win % and matches for each combination
  (e.g. Clay × Grand Slam: `23–7 · 76.7%`). Empty cells are empty, not 0%.
- **Records by surface** and **by level**: W–L and win %.

### 4. Record vs ranked opponents
- vs top 5 / 10 / 20 / 50 / 100: W–L and win % each (`vs top 10: 67–37 · 64.4%`).

### 5. Splits (new home of "Player vs cohort")
A table of how the player does in specific situations. Every row has three
columns: **career** · **last 5 years** · **last 52 weeks**, each as W–L plus
win %.

| Group | Rows |
|---|---|
| Opponent | vs left-handers · vs right-handers · vs top 10 · vs top 50 · vs younger · vs older · vs compatriots |
| Situation | after winning the 1st set · after losing the 1st set · in a deciding set · after leading 2–0 · after trailing 0–2 (best-of-5 only) |
| Stage | in finals · quarterfinal or later |

Row interactions:
- Expand a row → the matches behind it (match rows, most recent first).
- "Open in Lab" → the equivalent SQL in the Lab (for a journalist who wants
  the full list or a CSV).

Sinner's real figures show why this block matters: `after losing 1st set:
57–80 · 41.6%` against `after winning 1st set: 360–36 · 90.9%`.

### 6. Serve & return
- **Serve:** ace %, double-fault %, 1st serve in %, 1st serve won %, 2nd serve
  won %, break points saved %, tiebreaks W–L. Filtered.
- **Return:** 1st-serve return won %, 2nd-serve return won %, break points
  converted %. Filtered.
- **Percentile vs tour:** where each serve and return figure ranks among the
  tour (`n = 2,525 players`). Career, unfiltered.
- The number of matches with point statistics is shown: older matches often
  lack them, so this can be far below the match count.

### 7. Milestones
Dates of the first top-100, top-50, top-20 and top-10 ranking; first title
(any level) with its event; first tour-level title with its event.

### 8. Recent matches
- The last 52 weeks (filtered), as match rows, each expanding to the match
  stats panel.
- "All matches in the Lab →" (SQL pre-filled for this player and these filters).

## States
- Unknown slug → not found, with suggestions.
- Filters leave zero matches → one empty state across the filtered region
  (not eight empty blocks), with "Reset filters".
- Player with no point statistics (older or lower-tier career) → the Serve &
  return block says so; the block does not disappear silently.
