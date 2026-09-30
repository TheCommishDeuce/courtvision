-- The Lab's example questions: shown on Home ("Try asking") and in the Lab.
-- One block per example: @id (URL: /lab?example=<id>), @question, @teaser,
-- then the SQL. tests/test_lab_examples.py runs every block against the
-- schema, so a schema change can't silently break one. Teasers say "e.g."
-- because the data grows: they must stay true after the next refresh.

-- @id: slam-final-comebacks
-- @question: Who came back from two sets down to win a Grand Slam final?
-- @teaser: e.g. Alcaraz d. Sinner, Roland Garros 2025
WITH sets AS (
  SELECT *, string_split(regexp_replace(score, '\(\d+\)', '', 'g'), ' ') AS s
  FROM matches_main
  WHERE level = 'G' AND round = 'F' AND NOT is_walkover
)
SELECT date, tournament, winner_name, loser_name, score
FROM sets
WHERE len(s) = 5
  AND TRY_CAST(split_part(s[1], '-', 1) AS INT) < TRY_CAST(split_part(s[1], '-', 2) AS INT)
  AND TRY_CAST(split_part(s[2], '-', 1) AS INT) < TRY_CAST(split_part(s[2], '-', 2) AS INT)
ORDER BY date DESC

-- @id: most-tiebreaks
-- @question: Which matches had the most tiebreaks?
-- @teaser: e.g. Cerundolo d. Landaluce, four tiebreaks, Roland Garros 2026
SELECT date, tournament, round, winner_name, loser_name, score,
       winner_tb_won + winner_tb_lost AS tiebreaks
FROM matches_main
WHERE winner_tb_won IS NOT NULL
ORDER BY tiebreaks DESC, date DESC
LIMIT 50

-- @id: teens-beat-no1
-- @question: Which teenagers have beaten a world No. 1?
-- @teaser: e.g. Andreeva, 17, d. Sabalenka, Indian Wells 2025
SELECT m.date, m.tournament, m.round, m.winner_name,
       CAST(floor(date_diff('day', p.birthdate, m.date) / 365.25) AS INT) AS age,
       m.loser_name, m.score
FROM matches_main m
JOIN players p ON p.name = m.winner_name AND p.tour = m.tour
WHERE m.loser_rank = 1 AND NOT m.is_walkover
  AND date_diff('day', p.birthdate, m.date) < 20 * 365.25
ORDER BY m.date DESC

-- @id: slam-upsets
-- @question: Who were the lowest-ranked players to beat a top-10 player at a Grand Slam?
-- @teaser: e.g. Serena Williams (605) d. Kontaveit (2), US Open 2022
SELECT date, tournament, round, winner_name, winner_rank, loser_name, loser_rank, score
FROM matches_main
WHERE level = 'G' AND round NOT LIKE 'Q%' AND loser_rank <= 10
  AND is_upset AND NOT is_walkover
ORDER BY rank_diff DESC
LIMIT 50

-- @id: most-aces-match
-- @question: Who hit the most aces in a single ATP tour-level match?
-- @teaser: e.g. Isner, 113 aces against Mahut, Wimbledon 2010
-- ATP tour level only: lower-tier and some WTA stat lines hold implausible ace counts.
SELECT date, tournament, round, player_name AS player, aces, opponent_name AS opponent, score
FROM player_match_view
WHERE aces IS NOT NULL AND tour = 'M'
  AND level IN ('G', 'M', 'A', 'F', 'O', 'PM', 'P', 'I', 'T1', 'T2', 'T3', 'T4', 'T5', 'W')
ORDER BY aces DESC
LIMIT 50

-- @id: bagel-finals
-- @question: Which Grand Slam finals were won with a 6-0 set?
-- @teaser: e.g. Swiatek d. Anisimova 6-0 6-0, Wimbledon 2025
SELECT date, tournament, winner_name, loser_name, score
FROM matches_main
WHERE level = 'G' AND round = 'F' AND list_contains(string_split(score, ' '), '6-0')
ORDER BY date DESC
