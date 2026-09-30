# 04 — Data dictionary

What the figures mean, so labels, tooltips and caveats are right.

## Coverage
- **1,069,410 matches**: ATP 599,831, WTA 469,579. Dates 1910–2026; dense from
  the Open era (1968) on. **Data through 10 Aug 2026.**
- ~38,000 players, most of them opponents of scraped players who appear only a
  few times.
- Point statistics (aces, serve points, break points) exist mainly for
  tour-level matches from the 1990s onwards. Older and lower-tier matches often
  have a score only.

## Terms

| Term | Meaning |
|---|---|
| Tour | ATP (men, code `M`) or WTA (women, code `F`) |
| Level | Tier of the event. Grand Slam · Masters 1000 (WTA 1000) · ATP 250/500 · WTA 500 · WTA 250 · Tour Finals · Olympics · Davis Cup / BJK Cup · Challenger · ITF. **Tour level** = every main-tour event (excludes Challenger and ITF). |
| Round | F final · SF semifinal · QF quarterfinal · R16/R32/R64/R128 round of N · RR round robin · BR bronze match · ER early round · Q1–Q3 qualifying. Order: Q1 < Q2 < Q3 < R128 < R64 < ER < R32 < R16 < RR < QF < SF < BR < F |
| Rank | The official ranking at the time of the match. **Lower is better.** |
| Upset | The winner was ranked lower (had a bigger number) than the loser. Only defined when both ranks are known. |
| Rank gap | The difference between the two ranks, e.g. #484 d. #109 is a gap of 375. |
| Retirement (RET) | The match ended early through injury. **Counts** in records. |
| Walkover (W/O) | The match was never played. **Excluded** from records and head-to-heads. |
| Title | Won the final (`round = F`). |
| Comeback | Won the match after losing the first set. |
| Deciding set | The final possible set: the 3rd in best-of-3, the 5th in best-of-5. |
| Bagel / breadstick | A 6–0 / 6–1 set. "Given" = won by the player; "received" = lost. |
| Win streak | Consecutive match wins; walkovers don't break or extend it. |
| Draw strength | The average rank of the opponents a player beat at one event. **Lower = tougher.** |
| Percentile vs tour | Where a player's career figure ranks among all players on their tour with enough matches (n ≈ 2,500 ATP). 99 = better than 99%. |

## Serve and return figures

| Figure | Formula |
|---|---|
| Ace % | aces ÷ serve points |
| Double-fault % | double faults ÷ serve points |
| 1st serve in % | first serves in ÷ serve points |
| 1st serve won % | first-serve points won ÷ first serves in |
| 2nd serve won % | second-serve points won ÷ second-serve points |
| Break points saved % | saved ÷ faced |
| 1st / 2nd return won % | the opponent's 1st / 2nd serve points the player won |
| Break points converted % | break points won ÷ break points had |

Aggregates are computed over **only the matches that have point statistics**,
and that count is shown next to them ("412 matches with point data").

## Known caveats (show these in the UI where they apply)

| Caveat | Where it bites | UI treatment |
|---|---|---|
| **Match durations** include implausible values (multi-hour straight-sets Challengers). About 19 bad rows sort above Isner–Mahut. | Longest-match lists | A small caveat marker on any "longest" list |
| **Ranks missing** for many older and lower-tier matches | Upsets, rank gaps, record vs top-N | Show "unranked" as `—`, never `0` |
| **Some ace counts are implausible** at lower tiers and in some WTA stat lines | Single-match ace records | The Lab's example restricts itself to ATP tour level; any "most in a match" list should mention it |
| **Qualifying is mixed into tournament data** | Tournament stat leaders and upsets | Main draw by default (see the tournament spec) |
| **Tournament names aren't normalised** (`'s-Hertogenbosch`, `'s-Hertogenbosch Q`, `WTA 'S-Hertogenbosch`, `ATP Stuttgart`) | Tournament search, URLs | An engineering fix; designs should assume clean display names |
| **Thin opponents** (players with only a few matches) | Rate leaderboards | Minimum-match floors; shown in board footnotes |

## Database relations (exposed in the Lab)

| Relation | One row per | Use for |
|---|---|---|
| `matches_main` | match (winner / loser columns) | Anything about matches |
| `player_match_view` | player per match (`player_name`, `opponent_name`, `result` W/L; stats renamed to the player's perspective) | Player aggregates |
| `h2h_view` | match, with the pair ordered alphabetically (`player_a`, `player_b`) | Rivalries |
| `players` | player (country, birthdate, hand, height, current rank) | Joins for age, nationality, handedness |

Full column list with types: `samples/lab.json` → `schema`.
