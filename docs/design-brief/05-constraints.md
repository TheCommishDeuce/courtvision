# 05 — Constraints

Hard requirements the design must meet. Everything visual not listed here is
open: the previous design ("Courtside") is being discarded, not reskinned.

## Devices
- **Mobile first.** Every screen must work at **390 px** and must not scroll
  sideways at **320 px** (the Lab's results table is the only exception).
- Touch targets ≥ 44 px on touch devices.
- Tables with more than about 4 columns collapse to cards on phones.
  Designers should show both layouts for the match row and the Records full
  table.
- Desktop up to ~1440 px wide. Content should not stretch edge-to-edge on
  ultrawide screens.

## Themes
- Light and dark, both first-class, plus "follow the system". Charts must work
  in both.

## Accessibility
- WCAG 2.2 AA contrast for text and for the data marks that carry meaning.
- Win/loss, surfaces and tours are never encoded by colour alone (add
  a label, shape or position as well).
- Fully keyboard-operable: search (`/`, arrows, Enter, Esc), filters, table
  sorting, row expansion, the Lab (⌘/Ctrl+Enter).
- Charts have a text equivalent (the underlying figures are available in a
  table or on focus).

## Numbers and typography
- Figures in columns are tabular (aligned digits).
- Percentages to one decimal (`64.4%`); counts with thousands separators
  (`1,069,410`); years without them (`2026`).
- Ranks shown as `#3` or `(3)`; unknown rank as `—`.
- Scores are shown exactly as stored (`6-7(5) 7-6(8) 7-6(2) 3-6 7-6(3)`);
  long five-setters must fit or wrap sensibly on phones.
- Durations as `h:mm` (`5:04`).
- Names can be long ("Giovanni Mpetshi Perricard", "Juan Manuel Cerundolo").
  Test with them.

## Charts in v1
Only these, all on the Player and Matchup pages:
- Win % by year (per-year sample visible)
- Ranking trajectory (inverted: rank 1 at the top; range 1 to ~1,600)
- Surface × level grid (a heat-style table)
- Percentile vs tour (serve and return)
- Head-to-head momentum (the sequence of meetings)

Charts should be flat and readable: no 3D, gradients or decorative area fills.

## Performance
- Screens are made of independent blocks that load in parallel; design for
  blocks arriving at different times (skeletons, no layout jump).
- The database is read-only and changes at most daily.

## Content tone
- Plain English, no jargon in headings ("Record against top-10 players", not
  "Top-N W-L").
- Headlines may be written like journalism ("Reilly Opelka aces at will"),
  but each figure next to them stays exact.

## Brand
- Product name: **CourtVision**.
- Credit Tennis Abstract / Jeff Sackmann for the underlying match data. The
  design must not imitate Tennis Abstract's or any tour's branding.
