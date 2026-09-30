# Records: `/records`

**Purpose:** who leads the tour at everything, for any season, surface or
level, with the full table one tap away.

**Sample data:** `samples/records.json` (ATP, tour level, 2026).

## Filters
Tour (ATP / WTA) · Level (default **Tour level**) · Surface · Years (default
**current season**). Switching tour keeps the other filters.

## Layout: a grid of boards
24 boards in three groups. Each board is a **top ten**: rank · player · figure
· an optional detail (e.g. a streak's surface, or a draw's year) · a footnote
with the qualifier ("Min. 20 matches with point data").

| Group | Boards |
|---|---|
| **Winning** | Most matches · Most wins · Best win % · Most titles · Most finals · Upset wins · Comebacks from a set down · Longest win streak |
| **On serve** | Most aces · Ace % · 1st serve in % · 1st serve won % · 2nd serve won % · Break points saved % · Tiebreaks won · Tiebreaks played |
| **On return & margins** | 1st return won % · 2nd return won % · Break points converted % · Toughest draw won (avg opponent rank; lower is tougher) · Bagels given · Bagels received · Breadsticks given · Breadsticks received |

Board rules:
- Boards in one group are the same height whether or not they have 10 rows,
  so the grid doesn't jump when filters change.
- A player's name → their page. The same player can legitimately appear twice
  on the streak and draw boards (two different runs); the detail text
  distinguishes the entries.
- Rate boards need a minimum sample, otherwise obscure players with 3 matches
  top them. The current floors are 10 matches (counting boards) and 20
  (rate boards).

## Full table (`?board=<id>`)
- Opening a board shows the **whole source table**, sorted by that board's
  column: for example every player's activity columns (matches, wins, win %,
  finals, titles, tiebreaks, upsets, comebacks, bagels…).
- Every column sortable; rank column; paging; phone card layout.
- Back to the grid; the filters carry over.
- Copy link reproduces the exact board, sort and filters.
