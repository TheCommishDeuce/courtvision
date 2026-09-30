/** Query hooks for the Player page. Each block owns its query so blocks load and fail independently. */
import { useQuery } from '@tanstack/react-query';
import {
  fetchPlayerForm, fetchPlayerMatches, fetchPlayerMilestones, fetchPlayerReturnPercentiles,
  fetchPlayerReturnStats, fetchPlayerServePercentiles, fetchPlayerServeStats, fetchPlayerSummary,
  fetchRankHistory, fetchSurfaceHeatmap, fetchTopNRecords,
} from '../../../api/client';
import { fetchSplitMatches, fetchSplits, type PlayerFilterParams } from '../../api/player';
import type { Tour } from '../../lib/filters';

export interface Who {
  player: string;
  tour: Tour;
}

const useQ = <T,>(key: unknown[], fn: () => Promise<T>, enabled = true) =>
  useQuery({ queryKey: key, queryFn: fn, enabled });

export const useCareerSummary = (w: Who) => useQ(['pl-summary', w], () => fetchPlayerSummary(w));
export const useFilteredSummary = (p: PlayerFilterParams, enabled: boolean) =>
  useQ(['pl-summary', p], () => fetchPlayerSummary(p), enabled);
export const useForm = (p: PlayerFilterParams) =>
  useQ(['pl-form', p], () => fetchPlayerForm({ player: p.player, tour: p.tour, surface: p.surface, level: p.level }));
/** Surface and level only: years narrow the charts rather than the data. */
export const useShapeMatches = (p: PlayerFilterParams) =>
  useQ(['pl-matches', { player: p.player, tour: p.tour, surface: p.surface, level: p.level }],
    () => fetchPlayerMatches({ player: p.player, tour: p.tour, surface: p.surface, level: p.level }));
export const useRecentMatches = (p: PlayerFilterParams) => useQ(['pl-matches', p], () => fetchPlayerMatches(p));
export const useRankHistory = (w: Who) => useQ(['pl-rank', w], () => fetchRankHistory(w));
export const useHeatmap = (w: Who) => useQ(['pl-heat', w], () => fetchSurfaceHeatmap(w));
export const useMilestones = (w: Who) => useQ(['pl-miles', w], () => fetchPlayerMilestones(w));
export const useTopN = (p: PlayerFilterParams) => useQ(['pl-topn', p], () => fetchTopNRecords(p));
export const useServe = (p: PlayerFilterParams) => useQ(['pl-serve', p], () => fetchPlayerServeStats(p));
export const useReturn = (p: PlayerFilterParams) => useQ(['pl-return', p], () => fetchPlayerReturnStats(p));
export const useServePct = (w: Who) => useQ(['pl-serve-pct', w], () => fetchPlayerServePercentiles(w));
export const useReturnPct = (w: Who) => useQ(['pl-return-pct', w], () => fetchPlayerReturnPercentiles(w));
export const useSplits = (p: PlayerFilterParams) => useQ(['pl-splits', p], () => fetchSplits(p));
export const useSplitMatches = (p: PlayerFilterParams, params: Record<string, string | number>, enabled: boolean) =>
  useQ(['pl-split-matches', p, params], () => fetchSplitMatches({ ...p, ...params }, 10), enabled);
