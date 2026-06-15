import axios from 'axios';
import type {
  YearRange,
  Constants,
  H2HResponse,
  PlayerSummary,
  PlayerMatchesResponse,
  ServeStats,
  ReturnStats,
  TopNRecords,
  TournamentRecap,
  RecentChampion,
  SearchResponse,
  RankHistoryPoint,
  HeatmapCell,
  WinsLeaderRow,
  ServeLeaderRow,
  ReturnLeaderRow,
  UpsetLeaderRow,
  ComebackLeaderRow,
  ActivityLeaderRow,
  BakeryLeaderRow,
  MetaStats,
  RecentUpset,
  PlayerMilestones,
  SimilarPlayerRow,
  SimilarReturnPlayerRow,
  StreakLeaderRow,
  DrawStrengthRow,
  DrawStrengthLeaderRow,
  PlayerForm,
  CommonOpponentsResponse,
  Top10WinsLeaderRow,
  FinalsLeaderRow,
  SlamRecordLeaderRow,
  TiebreakLeaderRow,
  Storyline,
  CountryInfo,
  RelationalResponse,
  MatchExtremesResponse,
  NationalityStageResponse,
  CountryLeadersResponse,
  ComebackScatterResponse,
} from '../types/tennis';

const api = axios.create({ baseURL: '/api' });

const get = <T,>(path: string, params?: object): Promise<T> =>
  api.get<T>(path, { params }).then(r => r.data);

// ── Meta ──────────────────────────────────────────────────────────────────────

export const fetchYearRange = (): Promise<YearRange> =>
  get<YearRange>('/meta/year-range');

export const fetchConstants = (): Promise<Constants> =>
  get<Constants>('/meta/constants');

export const fetchPlayers = (tour?: string): Promise<string[]> =>
  get<{ players: string[] }>('/meta/players', { tour }).then(d => d.players);

export const fetchTournaments = (tour?: string): Promise<string[]> =>
  get<{ tournaments: string[] }>('/meta/tournaments', { tour }).then(d => d.tournaments);

export const fetchMetaStats = (): Promise<MetaStats> =>
  get<MetaStats>('/meta/stats');

export const fetchRecentUpsets = (tour?: string, limit = 8): Promise<RecentUpset[]> =>
  get<RecentUpset[]>('/meta/recent-upsets', { tour, limit });

export const fetchRecentChampions = (tour?: string, limit = 10): Promise<RecentChampion[]> =>
  get<RecentChampion[]>('/tournament/recent-champions', { tour, limit });

export const fetchStorylines = (limit = 6): Promise<Storyline[]> =>
  get<Storyline[]>('/meta/storylines', { limit });

// ── H2H ──────────────────────────────────────────────────────────────────────

export interface H2HParams {
  player_a: string;
  player_b: string;
  surface?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
  tour?: string;
}

export const fetchH2H = (params: H2HParams): Promise<H2HResponse> =>
  get<H2HResponse>('/h2h', params);

// ── Player ───────────────────────────────────────────────────────────────────

export interface PlayerParams {
  player: string;
  surface?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
  tour?: string;
}

export const fetchPlayerSummary = (params: { player: string; tour?: string; year_min?: number; year_max?: number; surface?: string }): Promise<PlayerSummary> =>
  get<PlayerSummary>('/player/summary', params);

export const fetchPlayerMatches = (params: PlayerParams): Promise<PlayerMatchesResponse> =>
  get<PlayerMatchesResponse>('/player/matches', params);

export const fetchPlayerServeStats = (params: PlayerParams): Promise<ServeStats> =>
  get<ServeStats>('/player/serve-stats', params);

export const fetchPlayerReturnStats = (params: PlayerParams): Promise<ReturnStats> =>
  get<ReturnStats>('/player/return-stats', params);

export interface ServePercentiles {
  'ace%'?: number | null;
  '1st_in%'?: number | null;
  '1st_win%'?: number | null;
  '2nd_win%'?: number | null;
  'bp_saved%'?: number | null;
  'tb_win%'?: number | null;
  tour_size?: number;
}

export interface ReturnPercentiles {
  '1st_return_win%'?: number | null;
  '2nd_return_win%'?: number | null;
  'bp_converted%'?: number | null;
  tour_size?: number;
}

export const fetchPlayerServePercentiles = (params: { player: string; tour: string }): Promise<ServePercentiles> =>
  get<ServePercentiles>('/player/serve-percentiles', params);

export const fetchPlayerReturnPercentiles = (params: { player: string; tour: string }): Promise<ReturnPercentiles> =>
  get<ReturnPercentiles>('/player/return-percentiles', params);

export const fetchTopNRecords = (params: {
  player: string;
  tour?: string;
  surface?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
}): Promise<TopNRecords> =>
  get<TopNRecords>('/player/top-n-records', params);

export const fetchRankHistory = (params: { player: string; tour?: string; year_min?: number; year_max?: number }): Promise<RankHistoryPoint[]> =>
  get<RankHistoryPoint[]>('/player/rank-history', params);

export const fetchSurfaceHeatmap = (params: { player: string; tour?: string; year_min?: number; year_max?: number }): Promise<HeatmapCell[]> =>
  get<HeatmapCell[]>('/player/surface-heatmap', params);

export const fetchPlayerMilestones = (params: { player: string; tour?: string }): Promise<PlayerMilestones> =>
  get<PlayerMilestones>('/player/milestones', params);

export const fetchSimilarPlayers = (params: { player: string; tour?: string; min_matches?: number }): Promise<SimilarPlayerRow[]> =>
  get<SimilarPlayerRow[]>('/player/similar', params);

export const fetchSimilarPlayersReturn = (params: { player: string; tour?: string; min_matches?: number }): Promise<SimilarReturnPlayerRow[]> =>
  get<SimilarReturnPlayerRow[]>('/player/similar-return', params);

export const fetchPlayerForm = (params: PlayerParams): Promise<PlayerForm> =>
  get<PlayerForm>('/player/form', params);

// ── Tournament ────────────────────────────────────────────────────────────────

export const fetchTournamentYears = (tournament: string, tour?: string): Promise<number[]> =>
  get<{ years: number[] }>('/tournament/years', { tournament, tour }).then(d => d.years);

export const fetchTournamentRecap = (params: { tournament: string; year?: number; tour?: string }): Promise<TournamentRecap> =>
  get<TournamentRecap>('/tournament/recap', params);

export const fetchTournamentDrawStrength = (params: { tournament: string; year?: number; tour?: string }): Promise<DrawStrengthRow[]> =>
  get<DrawStrengthRow[]>('/tournament/draw-strength', params);

// ── Search ────────────────────────────────────────────────────────────────────

export interface StatFilter {
  min?: number;
  max?: number;
}

export interface SearchParams {
  winner?: string;
  loser?: string;
  tournament?: string;
  surface?: string;
  level?: string;
  round?: string;
  tour?: string;
  upsets_only?: boolean;
  with_stats_only?: boolean;
  year_min?: number;
  year_max?: number;
  limit?: number;
  stat_filters?: Record<string, StatFilter>;
}

export function _flattenSearchParams(params: SearchParams): Record<string, string> {
  const flat: Record<string, string> = {};
  const { stat_filters, ...rest } = params;
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') flat[k] = String(v);
  });
  if (stat_filters) {
    Object.entries(stat_filters).forEach(([col, f]) => {
      if (f.min !== undefined) flat[`${col}_min`] = String(f.min);
      if (f.max !== undefined) flat[`${col}_max`] = String(f.max);
    });
  }
  return flat;
}

export const fetchSearchMatches = (params: SearchParams): Promise<SearchResponse> =>
  get<SearchResponse>('/search/matches', _flattenSearchParams(params));

export const searchMatchesCsvUrl = (params: SearchParams): string => {
  const q = new URLSearchParams(_flattenSearchParams(params));
  return `/api/search/matches/csv?${q.toString()}`;
};

// ── Relational search & analysis ───────────────────────────────────────────────

export interface RelationalParams {
  player?: string;
  tour?: string;
  opp_hand?: string;
  opp_country?: string;
  opp_rank_max?: number;
  opp_age_min?: number;
  opp_age_max?: number;
  relation?: string;       // 'compatriot' | 'foreign'
  age_relation?: string;   // 'younger' | 'older'
  min_stage?: string;      // 'R16' | 'QF' | 'SF' | 'F'
  situation?: string;      // 'won_first' | 'lost_first' | 'deciding_set' | 'led_2_0' | ...
  surface?: string;
  level?: string;
  round?: string;
  result?: string;         // 'W' | 'L'
  year_min?: number;
  year_max?: number;
  limit?: number;
}

export const fetchRelationalMatches = (params: RelationalParams): Promise<RelationalResponse> =>
  get<RelationalResponse>('/search/relational', params);

export interface MatchExtremesParams {
  metric?: string;
  order?: string;
  tour?: string;
  level?: string;
  surface?: string;
  round?: string;
  year_min?: number;
  year_max?: number;
  completed_only?: boolean;
  limit?: number;
}

export const fetchMatchExtremes = (params: MatchExtremesParams): Promise<MatchExtremesResponse> =>
  get<MatchExtremesResponse>('/analysis/match-extremes', params);

export interface NationalityStageParams {
  country: string;
  stage?: string;
  tour?: string;
  level?: string;
  surface?: string;
  year_min?: number;
  year_max?: number;
  order?: string;
  limit?: number;
}

export const fetchNationalityStage = (params: NationalityStageParams): Promise<NationalityStageResponse> =>
  get<NationalityStageResponse>('/analysis/nationality-stage', params);

export interface CountryLeadersParams {
  metric?: string;
  tour?: string;
  level?: string;
  surface?: string;
  year_min?: number;
  year_max?: number;
  limit?: number;
}

export const fetchCountryLeaders = (params: CountryLeadersParams): Promise<CountryLeadersResponse> =>
  get<CountryLeadersResponse>('/analysis/country-leaders', params);

export interface ComebackScatterParams {
  tour?: string;
  cohort?: string;
  year_min?: number;
  year_max?: number;
  surface?: string;
  level?: string;
  x_metric?: string;
  y_metric?: string;
}

export const fetchComebackScatter = (params: ComebackScatterParams): Promise<ComebackScatterResponse> =>
  get<ComebackScatterResponse>('/analysis/comeback-scatter', params);

export const fetchCountries = (tour?: string): Promise<CountryInfo[]> =>
  get<{ countries: CountryInfo[] }>('/meta/countries', { tour }).then(d => d.countries);

// ── Leaders ───────────────────────────────────────────────────────────────────

export interface LeadersParams {
  tour?: string;
  surface?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
}

export const fetchLeadersWins = (params: LeadersParams & { min_matches?: number; sort_by?: string }): Promise<WinsLeaderRow[]> =>
  get<WinsLeaderRow[]>('/leaders/wins', params);

export const fetchLeadersServe = (params: LeadersParams & { min_matches?: number; sort_by?: string }): Promise<ServeLeaderRow[]> =>
  get<ServeLeaderRow[]>('/leaders/serve', params);

export const fetchLeadersReturn = (params: LeadersParams & { min_matches?: number; sort_by?: string }): Promise<ReturnLeaderRow[]> =>
  get<ReturnLeaderRow[]>('/leaders/return', params);

export const fetchLeadersUpsets = (params: LeadersParams): Promise<{ wins: UpsetLeaderRow[]; losses: UpsetLeaderRow[] }> =>
  get<{ wins: UpsetLeaderRow[]; losses: UpsetLeaderRow[] }>('/leaders/upsets', params);

export const fetchLeadersComebacks = (params: LeadersParams): Promise<ComebackLeaderRow[]> =>
  get<ComebackLeaderRow[]>('/leaders/comebacks', params);

export const fetchLeadersActivity = (params: LeadersParams & { sort_by?: string }): Promise<ActivityLeaderRow[]> =>
  get<ActivityLeaderRow[]>('/leaders/activity', params);

export interface ActivityCombinedRow {
  player_name: string;
  tour: string;
  matches: number;
  wins: number;
  win_pct: number | null;
  finals: number;
  titles: number;
  tb_played: number;
  tb_won: number;
  upset_wins: number;
  comebacks: number;
  bagels_given: number;
  bagels_received: number;
  breadsticks_given: number;
  breadsticks_received: number;
}

export const fetchLeadersActivityCombined = (params: LeadersParams & { min_matches?: number }): Promise<ActivityCombinedRow[]> =>
  get<ActivityCombinedRow[]>('/leaders/activity-combined', params);

export const fetchLeadersBakery = (params: LeadersParams & { sort_by?: string }): Promise<BakeryLeaderRow[]> =>
  get<BakeryLeaderRow[]>('/leaders/bakery', params);

export const fetchLeadersStreaks = (params: LeadersParams & { streak_surface?: string }): Promise<StreakLeaderRow[]> =>
  get<StreakLeaderRow[]>('/leaders/streaks', params);

export const fetchLeadersDrawStrength = (params: LeadersParams): Promise<DrawStrengthLeaderRow[]> =>
  get<DrawStrengthLeaderRow[]>('/leaders/draw-strength', params);

export const fetchLeadersTop10Wins = (params: LeadersParams & { min_matches?: number }): Promise<Top10WinsLeaderRow[]> =>
  get<Top10WinsLeaderRow[]>('/leaders/top10-wins', params);

export const fetchLeadersFinals = (params: LeadersParams & { min_matches?: number }): Promise<FinalsLeaderRow[]> =>
  get<FinalsLeaderRow[]>('/leaders/finals', params);

export const fetchLeadersSlamRecord = (params: LeadersParams & { min_matches?: number }): Promise<SlamRecordLeaderRow[]> =>
  get<SlamRecordLeaderRow[]>('/leaders/slam-record', params);

export const fetchLeadersTiebreaks = (params: LeadersParams & { min_matches?: number }): Promise<TiebreakLeaderRow[]> =>
  get<TiebreakLeaderRow[]>('/leaders/tiebreaks', params);

export const fetchCommonOpponents = (params: {
  player_a: string;
  player_b: string;
  tour?: string;
  surface?: string;
  year_min?: number;
  year_max?: number;
}): Promise<CommonOpponentsResponse> =>
  get<CommonOpponentsResponse>('/compare/common-opponents', params);
