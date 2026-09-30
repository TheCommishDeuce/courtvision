# Tournament: `/tournament/:slug/:year?tour=M`

**Purpose:** one event in one year, told as a story: who won, how, and what
happened along the way.

**Sample data:** `samples/tournament.json` (Wimbledon 2025, ATP).

## Two modes

### No event chosen: `/tournament`
- Tournament search (the same component as global search, limited to events)
  with a tour toggle.
- **Latest champions** list for the chosen tour: this is the browse path.
- The designer may add a way to browse "this season's events", but that isn't
  required for v1.

### Event chosen
**Year switcher:** previous and next year arrows plus a jump-to-year list (from
`/api/tournament/years`). Tour toggle (ATP / WTA) when the event has both.

## Blocks, in priority order

### 1. Header
Event name · year · surface · level · start date · number of matches.
**Champion d. runner-up, final score**, the most prominent line on the screen.

### 2. The draw
- Round by round: F → SF → QF → R16 → … → R128. Match rows showing seeds'
  ranks, score and upset marker.
- **Main draw by default. Qualifying (Q1–Q3) is behind a toggle.** Wimbledon
  2025 has 127 main-draw matches and 112 qualifying matches. Showing both
  buries the story.
- Phones: one round at a time with a round selector; desktop may show a
  bracket or columns (designer's choice). The champion's path should be easy
  to trace.
- Every match expands to the stats panel; every name → player.

### 3. Storylines
- **Biggest upsets:** largest ranking gaps (main draw by default).
- **Longest matches:** by duration (`Sonego d. Nakashima, R32, 5h04`).
  Durations can be wrong (see the data dictionary); the list carries a small
  caveat.
- **Toughest runs:** average opponent rank for each player who went deep
  (`/api/tournament/draw-strength`).

### 4. Stat leaders
Top 5 each: aces · double faults · 1st serve won % · 2nd serve won % ·
return points won % · break points saved. Main draw by default. Sample
problem: with qualifying included, Jarry "leads" aces with 150.

## States
- Event exists but not in this year → "No 2020 edition" (e.g. cancelled) with
  the nearest years.
- Event with no point statistics → the stat leaders block says so.
- Unknown slug → not found, with suggestions.
