# 01 — Product

## One line

**CourtVision — find the story in the numbers.** A tennis statistics site where
journalists and fans go from a hunch to a verified figure to a link they can
share, across a century of ATP and WTA results.

## Who it is for

| Who | Arrives with | Needs to leave with |
|---|---|---|
| **Journalist / writer** | A name, an event or a matchup, often on deadline | A figure they trust, the context behind it (sample size, date range, caveats), and a link or CSV to cite |
| **Engaged fan** | Curiosity: "is Sinner really better after losing a set?" | An answer, and a nudge towards the next interesting question |
| **Power user** | A precise question no screen answers | Raw SQL over the whole database, results, CSV |

The site must feel **friendly to the fan** without **hiding power from the
power user**. The SQL tool ("the Lab") is a headline feature, not an admin
screen — but it is reached through plain-English example questions, not a blank
box.

## Principles

1. **Every view is a link.** Anything on screen — a player with filters, a
   matchup on clay since 2020, a leaderboard sorted by a column, a SQL query —
   is reproducible from its URL. Sharing is copying the address.
2. **Show the denominator.** A percentage is never shown without its sample
   (`64.4% · 67–37`). Small samples are visibly marked, not hidden.
3. **Say what the data can't.** Caveats (missing ranks, unreliable durations,
   thin pre-1990 point stats) appear next to the figure they affect.
4. **Names are doors.** Every player name links to the player; every
   tournament-year links to its recap; every pair of names can open a matchup.
5. **One question per block.** Each block on a screen answers one question
   you could say out loud ("How has she done against the top 10?").
6. **Freshness is visible.** The date the data runs through is on every page.

## Journeys the design must make easy

1. **Name → figure.** Type "swiatek" → player page → narrow to clay, last 3
   years → read her record vs top-10 → copy link.
2. **Matchup.** Type "sinner alcaraz" → matchup → 7–11 → split by surface →
   open the 2025 Roland Garros final.
3. **Event recap.** Search "wimbledon" → 2025 → champion, draw, biggest upsets,
   longest match → click a name in the draw → that player.
4. **Browse for a story.** Home → "Leading this season" card → the leaderboard
   behind it → full sortable table → a player.
5. **Ask something new.** Home → "Which teenagers have beaten a world No. 1?"
   → the Lab with the SQL pre-filled → results → tweak the SQL → CSV.

## v1 scope

| Screen | Route | Spec |
|---|---|---|
| Home | `/` | [03-screens/home.md](03-screens/home.md) |
| Player | `/player/:slug` | [03-screens/player.md](03-screens/player.md) |
| Matchup | `/versus/:slugA/:slugB` | [03-screens/versus.md](03-screens/versus.md) |
| Tournament | `/tournament/:slug/:year` | [03-screens/tournament.md](03-screens/tournament.md) |
| Records | `/records` | [03-screens/records.md](03-screens/records.md) |
| Lab | `/lab` | [03-screens/lab.md](03-screens/lab.md) |

Plus the global shell (header, search, footer): [02-shell.md](02-shell.md).

### Deliberately out of v1

Not bad ideas — second wave. Do not design them now, but don't design
yourself into a corner either (the Player page will grow sections).

- Metric scatter (plot any two per-match metrics)
- Nationality milestones and country leaderboards
- "Closest profiles" (players with similar serve/return fingerprints)
- Common opponents on the matchup page
- Single-match extremes browser
- A dedicated match page
- Tournament roll of honour (all champions of an event)
- Rankings pages, season pages, "on this day"
