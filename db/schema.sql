-- DuckDB schema for Tennis Abstract matches
-- Run via: duckdb data/tennis.duckdb < db/schema.sql

CREATE TABLE IF NOT EXISTS matches_main (
    unique_match_key  VARCHAR PRIMARY KEY,
    date              DATE,
    tournament        VARCHAR,
    surface           VARCHAR,
    level             VARCHAR,
    level_name        VARCHAR,
    round             VARCHAR,
    score             VARCHAR,
    time              DOUBLE,
    winner_name       VARCHAR NOT NULL,
    loser_name        VARCHAR NOT NULL,
    winner_rank       DOUBLE,
    loser_rank        DOUBLE,
    winner_aces       DOUBLE,
    loser_aces        DOUBLE,
    winner_dfs        DOUBLE,
    loser_dfs         DOUBLE,
    winner_pts        DOUBLE,
    loser_pts         DOUBLE,
    winner_firsts     DOUBLE,
    loser_firsts      DOUBLE,
    winner_fwon       DOUBLE,
    loser_fwon        DOUBLE,
    winner_swon       DOUBLE,
    loser_swon        DOUBLE,
    winner_games      DOUBLE,
    loser_games       DOUBLE,
    winner_saved      DOUBLE,
    loser_saved       DOUBLE,
    winner_chances    DOUBLE,
    loser_chances     DOUBLE,
    winner_tb_won     INTEGER,
    winner_tb_lost    INTEGER,
    loser_tb_won      INTEGER,
    loser_tb_lost     INTEGER,
    tour              VARCHAR NOT NULL,
    year              INTEGER,
    num_sets          INTEGER,
    is_retirement     BOOLEAN,
    is_walkover       BOOLEAN,
    is_complete       BOOLEAN,
    had_tiebreak      BOOLEAN,
    is_upset          BOOLEAN,
    rank_diff         DOUBLE
);

CREATE INDEX IF NOT EXISTS idx_winner     ON matches_main(winner_name);
CREATE INDEX IF NOT EXISTS idx_loser      ON matches_main(loser_name);
CREATE INDEX IF NOT EXISTS idx_date       ON matches_main(date);
CREATE INDEX IF NOT EXISTS idx_tour_date  ON matches_main(tour, date);
CREATE INDEX IF NOT EXISTS idx_tournament ON matches_main(tournament, date);

-- Player perspective view: one row per player per match
CREATE OR REPLACE VIEW player_match_view AS
  SELECT winner_name AS player_name, loser_name AS opponent_name, 'W' AS result,
         winner_rank AS player_rank, loser_rank AS opponent_rank,
         winner_aces AS aces, winner_dfs AS dfs, winner_fwon AS fwon,
         winner_swon AS swon, winner_firsts AS firsts, winner_pts AS pts,
         winner_saved AS bp_saved, winner_chances AS bp_chances,
         winner_tb_won AS tb_won, winner_tb_lost AS tb_lost,
         date, tournament, surface, level, level_name, round, score, time, tour, year, is_upset
  FROM matches_main WHERE is_walkover = false
  UNION ALL
  SELECT loser_name, winner_name, 'L', loser_rank, winner_rank,
         loser_aces, loser_dfs, loser_fwon, loser_swon, loser_firsts, loser_pts,
         loser_saved, loser_chances, loser_tb_won, loser_tb_lost,
         date, tournament, surface, level, level_name, round, score, time, tour, year, is_upset
  FROM matches_main WHERE is_walkover = false;

-- H2H view: canonical player ordering so (A vs B) == (B vs A)
CREATE OR REPLACE VIEW h2h_view AS
  SELECT LEAST(winner_name, loser_name)    AS player_a,
         GREATEST(winner_name, loser_name) AS player_b,
         winner_name, loser_name,
         date, tournament, surface, level, level_name, round, score, time, tour, year,
         winner_rank, loser_rank, is_upset
  FROM matches_main
  WHERE is_walkover = false AND is_complete = true;

-- Players reference table
CREATE TABLE IF NOT EXISTS players (
    player_id    VARCHAR,
    tour         VARCHAR,
    name         VARCHAR NOT NULL,
    url_name     VARCHAR,
    country      VARCHAR,
    birthdate    DATE,
    current_rank INTEGER,
    hand         VARCHAR,
    height       DOUBLE,
    historically_ranked BOOLEAN,
    PRIMARY KEY (player_id, tour)
);
