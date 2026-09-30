/** Shared data hooks used across pages. Page-specific queries live with their page. */
import { useQuery } from '@tanstack/react-query';
import { fetchMetaStats, fetchRecentUpsets, fetchStorylines } from '../api/client';

/** The database is read-only and changes at most daily. */
export const STALE = 5 * 60 * 1000;

export const useMetaStats = () =>
  useQuery({ queryKey: ['metaStats'], queryFn: fetchMetaStats, staleTime: STALE });

export const useRecentUpsets = (tour?: string) =>
  useQuery({ queryKey: ['recentUpsets', tour], queryFn: () => fetchRecentUpsets(tour), staleTime: STALE });

export const useStorylines = () =>
  useQuery({ queryKey: ['storylines'], queryFn: () => fetchStorylines(), staleTime: STALE });
