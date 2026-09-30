# CourtVision — design brief

A package for designing the CourtVision frontend from scratch. It defines
**what each screen does and what data it has**; it deliberately says nothing
about the visual direction, which is the designer's to set.

## Reading order

1. [01-product.md](01-product.md): pitch, audience, principles, journeys, v1 scope
2. [02-shell.md](02-shell.md): header, global search, footer, URL scheme, shared
   filters, shared patterns, states
3. Screens, in priority order:
   [home](03-screens/home.md) ·
   [player](03-screens/player.md) ·
   [versus](03-screens/versus.md) ·
   [tournament](03-screens/tournament.md) ·
   [records](03-screens/records.md) ·
   [lab](03-screens/lab.md)
4. [04-data-dictionary.md](04-data-dictionary.md): what the figures mean and
   the caveats that must appear in the UI
5. [05-constraints.md](05-constraints.md): devices, themes, accessibility, number
   formatting, chart list
6. [06-engineering-gaps.md](06-engineering-gaps.md) → [../design-handoff/BUILD.md](../design-handoff/BUILD.md): the build plan (not needed for design)

## Sample data (`samples/`)

Real API responses captured from the live database (data through
10 Aug 2026). **Design with these values**: real names, real score strings,
real ranges. Long lists are trimmed to the first 6–40 items; everything
else is verbatim.

| File | Screen | Contents |
|---|---|---|
| `shell.json` | Shell | Database totals and freshness; the first of the ~38k player names (why search must rank results) |
| `home.json` | Home | Storylines, latest champions and recent upsets for both tours |
| `player.json` | Player | Jannik Sinner: summary, form, matches, ranking history, surface × level, milestones, top-N, serve, return, percentiles, one filtered example |
| `player-splits.json` | Player | Twelve splits for Sinner (career / 5y / 52w) plus example match rows |
| `versus.json` | Matchup | Sinner vs Alcaraz head-to-head; both summaries; a "never met" case |
| `tournament.json` | Tournament | Wimbledon 2025 ATP: years available, full recap, draw strength |
| `records.json` | Records | ATP 2026 tour level: activity, serve, return, streaks, draw strength |
| `lab.json` | Lab | Schema; the six example questions with SQL and results; a real error |
| `lab-examples.sql` | Home, Lab | The six example queries, each verified to run |

## What to produce

For each screen in `03-screens/`: phone (390 px) and desktop (1280 px), light
and dark, including the loading, empty and error states listed in 02-shell.
Start with **Home** and **Player**. Together they establish the shell, the
shared patterns (match row, record, stat figure, filters) and the charts.

## Status

The design came back from Claude Design on 30 Sep 2026 and is in
[../design-handoff/](../design-handoff/): `DESIGN.md` (tokens and the visual
spec for every screen), `prototype/` (HTML reference for every screen and
state) and `BUILD.md` (the engineering plan).
