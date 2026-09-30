/** Player page data: /api/player/* and the relational match list behind a split. */
import { get } from './http';
import type { RelationalResponse } from '../types/tennis';
import type { Tour } from '../lib/filters';

export interface SplitSummary {
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

export interface SplitRow {
  id: string;
  label: string;
  /** /api/search/relational params that list this row's matches. */
  params: Record<string, string | number>;
  summary: SplitSummary;
  lab_sql: string;
}

export interface SplitGroup {
  id: string;
  title: string;
  rows: SplitRow[];
}

export interface PlayerFilterParams {
  player: string;
  tour: Tour;
  surface?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
}

export const fetchSplits = (p: PlayerFilterParams): Promise<{ groups: SplitGroup[] }> =>
  get('/player/splits', p);

export const fetchSplitMatches = (
  p: PlayerFilterParams & Record<string, string | number | undefined>, limit = 10,
): Promise<RelationalResponse> => get('/search/relational', { ...p, limit });
