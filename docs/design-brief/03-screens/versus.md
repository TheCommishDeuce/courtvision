# Matchup: `/versus/:slugA/:slugB`

**Purpose:** who leads this rivalry, where and when, and how the two careers
compare overall.

**Sample data:** `samples/versus.json` (Sinner vs Alcaraz, plus a "never met"
example: Sinner vs Nadal on grass).

## Entry
- From search (two names), from a player's **Compare with…**, or from this
  page's own pair picker.
- **Pair picker:** two player searches and a **swap** button. Player B is limited
  to player A's tour.
- With no pair chosen (`/versus`): the picker plus 4–6 suggested rivalries
  (static list), e.g. Sinner–Alcaraz, Sabalenka–Swiatek, Djokovic–Nadal.

## Filters
Surface · Level · Years. They apply to the head-to-head blocks (1–4). The career
comparison (5) is always the whole career and is labelled so.

## Blocks, in priority order

### 1. Headline record
- `Alcaraz 11 – 7 Sinner`, the leader shown distinctly.
- Under it: the first meeting, the last meeting, and the current run
  ("Alcaraz has won the last 3").

### 2. Split by surface and by level
- Per surface: `Hard 7–3 Alcaraz · Clay 4–2 Alcaraz · Grass 2–0 Sinner`.
- Per level: Grand Slam, Masters, etc.
- Surfaces or levels where they have never met are omitted, not shown as 0–0.

### 3. Momentum
- Every meeting in date order, showing who won each one. You should see the
  rivalry swing at a glance (e.g. early Alcaraz, a Sinner run, and so on).
- Each point → that match.

### 4. Every meeting
- Match rows, newest first: date · event · round · surface · winner · score ·
  duration.
- Each expands to the match stats panel for both players.
- Retirements count and are marked. Walkovers are excluded from the record.

### 5. The two careers
Side by side, A left and B right, with the better figure marked on each row:
- career W–L and win %, career-high rank, titles by tier
- record vs top 10
- serve: ace %, 1st serve won %, 2nd serve won %, break points saved %
- return: return points won on 1st and 2nd serve, break points converted %

## States
- **Never met (under these filters):** "Sinner and Nadal never met on grass."
  Offer to clear the filters; still show the career comparison.
- **Never met at all:** say so; still show the career comparison.
- **Same player twice / different tours:** blocked in the picker.
