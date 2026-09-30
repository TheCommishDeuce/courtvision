/** Plain-English meanings for the Lab's schema reference (brief 04-data-dictionary.md). */

export const RELATION_TEXT: Record<string, string> = {
  matches_main: 'One row per match, with winner and loser columns.',
  player_match_view: 'One row per player per match, from that player’s side (result W / L).',
  h2h_view: 'One row per match, with the pair in alphabetical order (player_a, player_b).',
  players: 'One row per player: country, birthdate, hand, height, current rank.',
};

const MEANING: Record<string, string> = {
  unique_match_key: 'Unique id for the match',
  date: 'Tournament start date',
  tournament: 'Event name',
  surface: 'Hard, Clay, Grass or Carpet',
  level: 'Tier code (G = Grand Slam, M = Masters…)',
  level_name: 'Tier name, e.g. Grand Slam',
  round: 'F, SF, QF, R16… Q1–Q3',
  score: 'Score as stored, e.g. 6-7(5) 7-6(8)',
  time: 'Duration in minutes (some values are wrong)',
  winner_name: 'Player who won',
  loser_name: 'Player who lost',
  winner_rank: 'Winner’s rank at the time (lower is better)',
  loser_rank: 'Loser’s rank at the time',
  rank_diff: 'Gap between the two ranks',
  tour: 'M = ATP, F = WTA',
  year: 'Season',
  num_sets: 'Sets played',
  is_retirement: 'Ended early through injury (counts in records)',
  is_walkover: 'Never played (excluded from records)',
  is_complete: 'Played to the finish',
  had_tiebreak: 'At least one tiebreak',
  is_upset: 'The lower-ranked player won',
  player_name: 'The player this row is about',
  opponent_name: 'Their opponent',
  result: 'W or L for player_name',
  player_rank: 'Player’s rank at the time',
  opponent_rank: 'Opponent’s rank at the time',
  aces: 'Aces served',
  dfs: 'Double faults',
  fwon: '1st-serve points won',
  swon: '2nd-serve points won',
  firsts: '1st serves in',
  pts: 'Serve points played',
  bp_saved: 'Break points saved',
  bp_chances: 'Break points faced',
  saved: 'Break points saved',
  chances: 'Break points faced',
  games: 'Games won',
  tb_won: 'Tiebreaks won',
  tb_lost: 'Tiebreaks lost',
  player_a: 'First player, alphabetically',
  player_b: 'Second player, alphabetically',
  player_id: 'Player id',
  name: 'Player name',
  url_name: 'Tennis Abstract page name',
  country: 'Three-letter country code',
  birthdate: 'Date of birth',
  current_rank: 'Latest ranking',
  hand: 'R or L',
  height: 'Height in cm',
  historically_ranked: 'Has ever held a ranking',
};

export function columnMeaning(name: string): string {
  if (MEANING[name]) return MEANING[name];
  const m = /^(winner|loser)_(.+)$/.exec(name);
  if (m) return `${MEANING[m[2]] ?? m[2].replace(/_/g, ' ')} (${m[1]})`;
  return name.replace(/_/g, ' ');
}

/** Result columns that hold a player's name, so the cell links to the player. */
export const NAME_COLUMNS = new Set([
  'winner_name', 'loser_name', 'player_name', 'opponent_name', 'name', 'player', 'opponent', 'player_a', 'player_b',
]);
