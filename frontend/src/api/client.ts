import { api, get } from './http';
import type {
  H2HResponse,
  PlayerSummary,
  PlayerMatchesResponse,
  ServeStats,
  ReturnStats,
  TopNRecords,
  RankHistoryPoint,
  HeatmapCell,
  ServeLeaderRow,
  ReturnLeaderRow,
  MetaStats,
  RecentUpset,
  PlayerMilestones,
  StreakLeaderRow,
  DrawStrengthLeaderRow,
  PlayerForm,
  Storyline,
} from '../types/tennis';

// ── Meta ──────────────────────────────────────────────────────────────────────

export const fetchMetaStats = (): Promise<MetaStats> =>
  get<MetaStats>('/meta/stats');

export const fetchRecentUpsets = (tour?: string, limit = 8): Promise<RecentUpset[]> =>
  get<RecentUpset[]>('/meta/recent-upsets', { tour, limit });

export const fetchStorylines = (limit = 4): Promise<Storyline[]> =>
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

export const fetchPlayerSummary = (params: PlayerParams): Promise<PlayerSummary> =>
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

export const fetchPlayerForm = (params: PlayerParams): Promise<PlayerForm> =>
  get<PlayerForm>('/player/form', params);

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

// ── Leaders ───────────────────────────────────────────────────────────────────

export interface LeadersParams {
  tour?: string;
  surface?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
}

export const fetchLeadersServe = (params: LeadersParams & { min_matches?: number; sort_by?: string }): Promise<ServeLeaderRow[]> =>
  get<ServeLeaderRow[]>('/leaders/serve', params);

export const fetchLeadersReturn = (params: LeadersParams & { min_matches?: number; sort_by?: string }): Promise<ReturnLeaderRow[]> =>
  get<ReturnLeaderRow[]>('/leaders/return', params);

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

export const fetchLeadersStreaks = (params: LeadersParams & { streak_surface?: string }): Promise<StreakLeaderRow[]> =>
  get<StreakLeaderRow[]>('/leaders/streaks', params);

export const fetchLeadersDrawStrength = (params: LeadersParams): Promise<DrawStrengthLeaderRow[]> =>
  get<DrawStrengthLeaderRow[]>('/leaders/draw-strength', params);

// ── Ad-hoc SQL (query builder) ────────────────────────────────────────────────

export interface QuerySchemaColumn {
  name: string;
  type: string;
}

export interface QuerySchemaRelation {
  name: string;
  rows: number;
  columns: QuerySchemaColumn[];
}

export interface QuerySchema {
  relations: QuerySchemaRelation[];
  limits: {
    display_rows: number;
    csv_rows: number;
    timeout_seconds: number;
  };
}

export interface QueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  truncated: boolean;
  limit: number;
  elapsed_ms: number;
}

export const fetchQuerySchema = (): Promise<QuerySchema> =>
  get<QuerySchema>('/query/schema');

export const runQuery = (sql: string, limit?: number): Promise<QueryResult> =>
  api.post<QueryResult>('/query', { sql, limit }).then(r => r.data);

/** Downloads the query as CSV. Resolves once the browser has the file. */
export const downloadQueryCsv = async (sql: string): Promise<void> => {
  const response = await api.post('/query/csv', { sql }, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'courtvision-query.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
