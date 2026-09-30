# Home: `/`

**Purpose:** someone who arrives without a question should find something worth
clicking within five seconds. Someone who arrives with a question should be
able to start typing immediately.

**Sample data:** `samples/home.json`

## Blocks, in priority order

### 1. Hero search
- One line of pitch ("Find the story in a century of tennis results") and the
  global search at full size.
- 3–4 example chips below it that run a search: *Sinner vs Alcaraz* ·
  *Iga Swiatek* · *Wimbledon 2025* · *Roland Garros*.

### 2. Leading this season
- **4 cards**, each one a generated sentence about a current-season tour-level
  leader, e.g. "Reilly Opelka aces at will: 27.2% ace rate".
- Card content: headline · the figure · what it measures ("Highest ace rate
  this season at tour level") · tour tag.
- Mixes both tours. **Rotates once a day** (the same four all day, so a link
  shared in the morning still matches in the afternoon).
- Card → the Records board it comes from (`link` field).

### 3. Try asking
- **6 plain-English questions.** Each opens the Lab with the SQL loaded and
  already run. These are the Lab's shop window.
- v1 list (all verified against the live DB; SQL in `samples/lab-examples.sql`,
  results in `samples/lab.json`):
  1. Who came back from two sets down to win a Grand Slam final?
  2. Which matches had the most tiebreaks?
  3. Which teenagers have beaten a world No. 1?
  4. Who were the lowest-ranked players to beat a top-10 player at a Grand Slam?
  5. Who hit the most aces in a single ATP tour-level match?
  6. Which Grand Slam finals were won with a 6-0 set?
- Each item may show a one-line teaser of its top answer ("Alcaraz d. Sinner,
  Roland Garros 2025"). Optional.
- A link at the end: "Write your own →" the Lab.

### 4. Latest champions
- ATP and WTA side by side (stacked on phones), 6–8 each.
- Row: tournament · level · surface · champion d. runner-up · final score · date.
- Row → that tournament-year. Names → players.
- Footer link: "All tournaments →".

### 5. Recent upsets
- The biggest ranking gaps from recent weeks, ATP and WTA.
- Row: winner (rank) d. loser (rank) · the gap (`+375`) · tournament · round ·
  score.
- Match → tournament-year; names → players.

### 6. Scale and freshness
- A single line, not a headline block: `1,069,410 matches · 1910–2026 · data
  through 10 Aug 2026`. (Repeats the footer. The designer may merge the two.)

## Not on Home any more
The long lede and the four-figure totals ledger.
