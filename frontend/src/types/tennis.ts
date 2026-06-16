export interface YearRange {
  year_min: number;
  year_max: number;
}

export interface Constants {
  surfaces: string[];
  levels_atp: Record<string, string>;
  levels_wta: Record<string, string>;
  level_groups: Record<string, string>;
  tours: Record<string, string>;
  rounds: string[];
  hands?: Record<string, string>;
  opp_relations?: Record<string, string>;
  opp_age_relations?: Record<string, string>;
}

export interface CountryInfo {
  country: string;
  players: number;
}

export interface RelationalMatchRow {
  date: string;
  tournament: string;
  level_name: string;
  round: string;
  surface: string;
  result: 'W' | 'L';
  player_name: string;
  player_rank: number | null;
  opponent_name: string;
  opponent_rank: number | null;
  opp_hand: string | null;
  opp_country: string | null;
  opp_height: number | null;
  opp_age: number | null;
  player_age: number | null;
  score: string;
  time: number | null;
  tour: string;
  year: number;
  is_upset: boolean;
  is_retirement: boolean;
  num_sets: number | null;
  // full per-match stats — focal player (p_*) and opponent (o_*)
  p_aces: number | null;   o_aces: number | null;
  p_dfs: number | null;    o_dfs: number | null;
  p_pts: number | null;    o_pts: number | null;
  p_firsts: number | null; o_firsts: number | null;
  p_fwon: number | null;   o_fwon: number | null;
  p_swon: number | null;   o_swon: number | null;
  p_games: number | null;  o_games: number | null;
  p_saved: number | null;  o_saved: number | null;
  p_chances: number | null; o_chances: number | null;
  p_tb_won: number | null; o_tb_won: number | null;
  p_tb_lost: number | null; o_tb_lost: number | null;
}

export interface RelationalSummary {
  total: number;
  wins: number;
  losses: number;
  win_pct: number | null;
  y5_total: number;
  y5_wins: number;
  y5_losses: number;
  y5_win_pct: number | null;
  w52_total: number;
  w52_wins: number;
  w52_losses: number;
  w52_win_pct: number | null;
}

export interface RelationalResponse {
  total: number;
  shown: number;
  summary: RelationalSummary;
  matches: RelationalMatchRow[];
}

export interface MatchExtremeRow {
  metric_value: number | null;
  date: string;
  tournament: string;
  level_name: string;
  round: string;
  surface: string;
  score: string;
  time: number | null;
  winner_name: string;
  winner_rank: number | null;
  loser_name: string;
  loser_rank: number | null;
  num_sets: number | null;
  is_upset: boolean;
  rank_diff: number | null;
  tour: string;
  year: number;
  is_retirement: boolean;
  w_aces: number | null;
  l_aces: number | null;
  winner_dfs: number | null;     loser_dfs: number | null;
  winner_pts: number | null;     loser_pts: number | null;
  winner_firsts: number | null;  loser_firsts: number | null;
  winner_fwon: number | null;    loser_fwon: number | null;
  winner_swon: number | null;    loser_swon: number | null;
  winner_saved: number | null;   loser_saved: number | null;
  winner_chances: number | null; loser_chances: number | null;
}

export interface MatchExtremesResponse {
  filters: Record<string, unknown>;
  results: MatchExtremeRow[];
}

export interface NationalityStageRow {
  player_name: string;
  tour: string;
  country: string;
  reached_date: string;
  tournament: string;
  year: number;
  surface: string;
  level_name: string;
  won_title: number;
  deepest_round: string | null;
}

export interface NationalityStageResponse {
  filters: Record<string, unknown>;
  results: NationalityStageRow[];
}

export interface CountryLeaderRow {
  country: string;
  players: number;
  titles: number;
  finals: number;
  semis_or_better: number;
  wins: number;
  metric_value: number;
}

export interface CountryLeadersResponse {
  filters: Record<string, unknown>;
  results: CountryLeaderRow[];
}

export interface ComebackScatterPoint {
  current_rank: number;
  player_name: string;
  country: string | null;
  total_matches: number;
  total_wins: number;
  ace_pct: number | null;
  df_pct: number | null;
  first_in_pct: number | null;
  first_win_pct: number | null;
  second_win_pct: number | null;
  serve_points_won_pct: number | null;
  bp_saved_pct: number | null;
  tb_played: number;
  tb_win_pct: number | null;
  first_return_win_pct: number | null;
  second_return_win_pct: number | null;
  return_points_won_pct: number | null;
  comeback_wins: number;
  upset_wins: number;
  upset_losses: number;
  bagels_given: number;
  bagels_received: number;
  breadsticks_given: number;
  breadsticks_received: number;
  is_live_top10: boolean;
  is_highlight: boolean;
  is_top10_comebacker: boolean;
}

export interface ComebackScatterResponse {
  meta: {
    tour: string;
    cohort: string;
    year_min: number;
    year_max: number | null;
    level: string | null;
    surface: string | null;
    x_metric: string;
    y_metric: string;
    median: {
      [metric: string]: number | null;
    };
    source: string;
  };
  points: ComebackScatterPoint[];
}

export interface MatchRow {
  date: string;
  tournament: string;
  surface: string;
  level_name: string;
  round: string;
  score: string;
  time: number | null;
  winner_name: string;
  winner_rank: number | null;
  loser_name: string;
  loser_rank: number | null;
  is_upset: boolean;
  is_retirement: boolean;
  tour: string;
  year: number;
  // optional stat columns (returned from search endpoint)
  w_aces?: number | null;
  l_aces?: number | null;
  w_dfs?: number | null;
  l_dfs?: number | null;
  w_first_in_pct?: number | null;
  l_first_in_pct?: number | null;
  w_first_won_pct?: number | null;
  l_first_won_pct?: number | null;
  w_second_won_pct?: number | null;
  l_second_won_pct?: number | null;
  w_bp_saved_pct?: number | null;
  l_bp_saved_pct?: number | null;
}

export interface PlayerMatchRow {
  player_name: string;
  opponent_name: string;
  result: 'W' | 'L';
  player_rank: number | null;
  opponent_rank: number | null;
  aces: number | null;
  dfs: number | null;
  // focal-player serve line
  fwon: number | null;
  swon: number | null;
  firsts: number | null;
  pts: number | null;
  bp_saved: number | null;
  bp_chances: number | null;
  // opponent serve line (for return%/total%)
  o_aces: number | null;
  o_dfs: number | null;
  o_pts: number | null;
  o_firsts: number | null;
  o_fwon: number | null;
  o_swon: number | null;
  o_saved: number | null;
  o_chances: number | null;
  date: string;
  tournament: string;
  surface: string;
  level: string;
  level_name: string;
  round: string;
  score: string;
  time: number | null;
  tour: string;
  year: number;
  is_upset: boolean;
}

export interface H2HRow {
  winner_name: string;
  loser_name: string;
  date: string;
  tournament: string;
  surface: string;
  level: string;
  level_name: string;
  round: string;
  score: string;
  time: number | null;
  tour: string;
  year: number;
  winner_rank: number | null;
  loser_rank: number | null;
  is_upset: boolean;
  is_retirement: boolean;
  // raw serve columns for H2H stats
  winner_aces: number | null;
  winner_dfs: number | null;
  winner_pts: number | null;
  winner_firsts: number | null;
  winner_fwon: number | null;
  winner_swon: number | null;
  loser_aces: number | null;
  loser_dfs: number | null;
  loser_pts: number | null;
  loser_firsts: number | null;
  loser_fwon: number | null;
  loser_swon: number | null;
  winner_chances: number | null;
  winner_saved: number | null;
  loser_chances: number | null;
  loser_saved: number | null;
}

export interface H2HSummary {
  player_a: string;
  player_b: string;
  wins_a: number;
  wins_b: number;
}

export interface BySurface {
  surface: string;
  winner_name: string;
  wins: number;
}

export interface ByLevel {
  level_name: string;
  winner_name: string;
  wins: number;
}

export interface H2HResponse {
  summary: H2HSummary;
  by_surface: BySurface[];
  by_level: ByLevel[];
  timeline: H2HRow[];
  matches: H2HRow[];
}

export interface PlayerSummary {
  total: number;
  wins: number;
  losses: number;
  career_high_rank: number | null;
  country?: string | null;
  birthdate?: string | null;
  age?: number | null;
  hand?: string | null;
  height?: number | null;
  gs_titles: number;
  tour_titles: number;
  challenger_titles: number;
  itf_titles: number;
}

export interface WinPctRow {
  surface?: string;
  level_name?: string;
  year?: number;
  wins: number;
  total: number;
  win_pct: number;
}

export interface PlayerMatchesResponse {
  total: number;
  by_surface: WinPctRow[];
  by_level: WinPctRow[];
  by_year: WinPctRow[];
  last20: PlayerMatchRow[];
  recent52w: PlayerMatchRow[];
}

export interface ServeStats {
  matches_with_stats: number;
  'ace%': number | null;
  'df%': number | null;
  '1st_in%': number | null;
  '1st_win%': number | null;
  '2nd_win%': number | null;
  'bp_saved%': number | null;
  tb_won: number;
  tb_lost: number;
  'tb_W-L': string;
  'tb_win%': number | null;
}

export interface ReturnStats {
  matches_with_stats: number;
  '1st_return_win%': number | null;
  '2nd_return_win%': number | null;
  'bp_converted%': number | null;
}

export interface TopNRecord {
  'W-L': string;
  'win%': number;
}

export interface TopNRecords {
  top5?: TopNRecord;
  top10?: TopNRecord;
  top20?: TopNRecord;
  top50?: TopNRecord;
  top100?: TopNRecord;
}

export interface TournamentMeta {
  tournament: string;
  year: number | null;
  date: string | null;
  surface: string | null;
  level: string | null;
  level_name: string | null;
  total_matches: number;
  total_upsets: number;
}

export interface KeyMatch {
  round: string;
  winner_name: string;
  winner_rank: number | null;
  loser_name: string;
  loser_rank: number | null;
  score: string;
}

export interface TournamentMatchRow {
  round: string;
  winner_name: string;
  winner_rank: number | null;
  loser_name: string;
  loser_rank: number | null;
  score: string;
  time?: number | null;
  is_upset: boolean;
  is_retirement: boolean;
  rank_diff?: number | null;
  winner_aces?: number | null;   loser_aces?: number | null;
  winner_dfs?: number | null;    loser_dfs?: number | null;
  winner_pts?: number | null;    loser_pts?: number | null;
  winner_firsts?: number | null; loser_firsts?: number | null;
  winner_fwon?: number | null;   loser_fwon?: number | null;
  winner_swon?: number | null;   loser_swon?: number | null;
  winner_saved?: number | null;  loser_saved?: number | null;
  winner_chances?: number | null; loser_chances?: number | null;
}

export interface TournamentRoundGroup {
  round: string;
  matches: TournamentMatchRow[];
}

export interface TournamentStatsLeader {
  player: string;
  [key: string]: number | string;
}

export interface TournamentRecap {
  meta: TournamentMeta;
  matches_by_round: TournamentRoundGroup[];
  longest_matches: Record<string, unknown>[];
  biggest_upsets: Record<string, unknown>[];
  stats: {
    aces: TournamentStatsLeader[];
    dfs: TournamentStatsLeader[];
    first_serve_won_pct: TournamentStatsLeader[];
    second_serve_won_pct: TournamentStatsLeader[];
    return_win_pct: TournamentStatsLeader[];
    bp_saved: TournamentStatsLeader[];
  };
}

export interface RecentChampion {
  tournament: string;
  year: number;
  winner_name: string;
  loser_name: string;
  score: string;
  surface: string;
  level: string;
  level_name: string;
  date: string;
}

export interface SearchResponse {
  total: number;
  matches: MatchRow[];
}

// Rank history
export interface RankHistoryPoint {
  date: string;
  rank: number;
}

// Surface × Level heatmap
export interface HeatmapCell {
  surface: string;
  level_name: string;
  wins: number;
  total: number;
  win_pct: number;
}

// Stat leaders
export interface WinsLeaderRow {
  player_name: string;
  tour: string;
  total: number;
  wins: number;
  win_pct: number;
}

export interface ServeLeaderRow {
  player_name: string;
  tour: string;
  n_matches: number;
  total_aces: number;
  ace_pct: number | null;
  first_in_pct: number | null;
  first_win_pct: number | null;
  second_win_pct: number | null;
  bp_saved_pct: number | null;
}

export interface ReturnLeaderRow {
  player_name: string;
  tour: string;
  n_matches: number;
  first_return_win_pct: number | null;
  second_return_win_pct: number | null;
  bp_converted_pct: number | null;
}

export interface UpsetLeaderRow {
  player: string;
  tour: string;
  upset_wins?: number;
  upset_losses?: number;
}

export interface ComebackLeaderRow {
  player: string;
  tour: string;
  comebacks: number;
}

export interface ActivityLeaderRow {
  player_name: string;
  tour: string;
  matches: number;
  tb_played: number;
  tb_won: number;
  tb_win_pct: number | null;
  finals_played: number;
  finals_won: number;
  finals_win_pct: number | null;
}

export interface BakeryLeaderRow {
  player_name: string;
  tour: string;
  matches: number;
  bagels_given: number;
  bagels_received: number;
  breadsticks_given: number;
  breadsticks_received: number;
}

export interface MetaStats {
  total_matches: number;
  year_min: number;
  year_max: number;
  total_upsets: number;
  total_tournaments: number;
  total_players: number;
  data_through?: string;
  total_points_played?: number;
}

// Career milestones
export interface PlayerMilestones {
  first_top100: string | null;
  first_top50: string | null;
  first_top20: string | null;
  first_top10: string | null;
  first_title_date: string | null;
  first_title_tournament: string | null;
  first_tour_title_date: string | null;
  first_tour_title_tournament: string | null;
}

// Similar players
export interface SimilarPlayerRow {
  player_name: string;
  tour: string;
  n_matches: number;
  ace_pct: number | null;
  first_in_pct: number | null;
  first_win_pct: number | null;
  second_win_pct: number | null;
  bp_saved_pct: number | null;
  distance: number;
}

// Similar players — return profile
export interface SimilarReturnPlayerRow {
  player_name: string;
  tour: string;
  n_matches: number;
  first_return_win_pct: number | null;
  second_return_win_pct: number | null;
  bp_converted_pct: number | null;
  distance: number;
}

// Streaks leaders
export interface StreakLeaderRow {
  player_name: string;
  tour: string;
  streak_length: number;
  surface: string;
  start_date: string;
  end_date: string | null;
}

// Draw strength
export interface DrawStrengthRow {
  player_name: string;
  avg_opp_rank: number;
  matches_played: number;
  best_opp_rank: number;
  worst_opp_rank: number;
}

export interface DrawStrengthLeaderRow {
  player_name: string;
  tournament: string;
  year: number;
  tour: string;
  surface: string;
  avg_opp_rank: number;
  matches_won: number;
  best_opp_beaten: number;
}

export interface RecentUpset {
  date: string;
  tournament: string;
  round: string;
  winner_name: string;
  winner_rank: number | null;
  loser_name: string;
  loser_rank: number | null;
  score: string;
  tour: string;
  rank_diff: number | null;
}

export interface PlayerFormWindow {
  wins: number;
  losses: number;
  win_pct?: number | null;
}

export interface PlayerFormMatchRow {
  date: string;
  opponent_name: string;
  opponent_rank: number | null;
  tournament: string;
  surface: string;
  round: string;
}

export interface PlayerForm {
  last10: PlayerFormWindow;
  last20: PlayerFormWindow;
  last52w: PlayerFormWindow;
  top_wins_recent: PlayerFormMatchRow[];
  upset_losses_recent: PlayerFormMatchRow[];
}

export interface CommonOpponentRow {
  opponent_name: string;
  a_wins: number;
  a_losses: number;
  b_wins: number;
  b_losses: number;
  total_matches: number;
}

export interface CommonOpponentsResponse {
  summary: {
    player_a: string;
    player_b: string;
    common_opponents: number;
    a_total_wins: number;
    a_total_losses: number;
    b_total_wins: number;
    b_total_losses: number;
  };
  opponents: CommonOpponentRow[];
}

export interface Top10WinsLeaderRow {
  player_name: string;
  tour: string;
  top10_matches: number;
  top10_wins: number;
  top10_win_pct: number | null;
}

export interface FinalsLeaderRow {
  player_name: string;
  tour: string;
  finals: number;
  titles: number;
  finals_win_pct: number | null;
  gs_finals: number;
  gs_titles: number;
}

export interface SlamRecordLeaderRow {
  player_name: string;
  tour: string;
  slam_matches: number;
  slam_wins: number;
  slam_win_pct: number | null;
}

export interface TiebreakLeaderRow {
  player_name: string;
  tour: string;
  tb_played: number;
  tb_won: number;
  tb_lost: number;
  tb_win_pct: number | null;
}

export interface Storyline {
  type: string;
  label: string;
  headline: string;
  detail: string;
  player_name: string;
  tour: string;
  value: string;
  link: string;
}
