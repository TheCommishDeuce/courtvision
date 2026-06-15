import { useQuery } from '@tanstack/react-query';
import {
  fetchYearRange,
  fetchConstants,
  fetchPlayers,
  fetchTournaments,
  fetchH2H,
  fetchPlayerSummary,
  fetchPlayerMatches,
  fetchPlayerServeStats,
  fetchPlayerReturnStats,
  fetchPlayerServePercentiles,
  fetchPlayerReturnPercentiles,
  fetchTopNRecords,
  fetchTournamentYears,
  fetchTournamentRecap,
  fetchSearchMatches,
  fetchRankHistory,
  fetchSurfaceHeatmap,
  fetchMetaStats,
  fetchRecentUpsets,
  fetchRecentChampions,
  fetchStorylines,
  fetchLeadersWins,
  fetchLeadersServe,
  fetchLeadersReturn,
  fetchLeadersUpsets,
  fetchLeadersComebacks,
  fetchLeadersActivity,
  fetchLeadersActivityCombined,
  fetchLeadersBakery,
  fetchPlayerMilestones,
  fetchSimilarPlayers,
  fetchSimilarPlayersReturn,
  fetchPlayerForm,
  fetchLeadersStreaks,
  fetchLeadersDrawStrength,
  fetchLeadersTop10Wins,
  fetchLeadersFinals,
  fetchLeadersSlamRecord,
  fetchLeadersTiebreaks,
  fetchCommonOpponents,
  fetchTournamentDrawStrength,
  fetchRelationalMatches,
  fetchMatchExtremes,
  fetchNationalityStage,
  fetchCountryLeaders,
  fetchCountries,
  fetchComebackScatter,
} from '../api/client';
import { createQueryHook, STALE } from './createQueryHook';

// ── Meta / no-params or positional-args hooks (hand-written) ─────────────────

export const useYearRange = () =>
  useQuery({ queryKey: ['yearRange'], queryFn: fetchYearRange, staleTime: STALE });

export const useConstants = () =>
  useQuery({ queryKey: ['constants'], queryFn: fetchConstants, staleTime: STALE });

export const usePlayers = (tour?: string) =>
  useQuery({ queryKey: ['players', tour], queryFn: () => fetchPlayers(tour), staleTime: STALE });

export const useTournaments = (tour?: string) =>
  useQuery({ queryKey: ['tournaments', tour], queryFn: () => fetchTournaments(tour), staleTime: STALE });

export const useMetaStats = () =>
  useQuery({ queryKey: ['metaStats'], queryFn: fetchMetaStats, staleTime: STALE });

export const useRecentUpsets = (tour?: string) =>
  useQuery({ queryKey: ['recentUpsets', tour], queryFn: () => fetchRecentUpsets(tour), staleTime: STALE });

export const useRecentChampions = (tour?: string) =>
  useQuery({ queryKey: ['recentChampions', tour], queryFn: () => fetchRecentChampions(tour), staleTime: STALE });

export const useStorylines = () =>
  useQuery({ queryKey: ['storylines'], queryFn: () => fetchStorylines(), staleTime: STALE });

export const useTournamentYears = (tournament: string, tour?: string) =>
  useQuery({
    queryKey: ['tournamentYears', tournament, tour],
    queryFn: () => fetchTournamentYears(tournament, tour),
    enabled: !!tournament,
    staleTime: STALE,
  });

export const useCountries = (tour?: string) =>
  useQuery({ queryKey: ['countries', tour], queryFn: () => fetchCountries(tour), staleTime: STALE });

// ── Standard params-object hooks (factory-built) ─────────────────────────────

export const useH2H = createQueryHook('h2h', fetchH2H);
export const usePlayerSummary = createQueryHook('playerSummary', fetchPlayerSummary);
export const usePlayerMatches = createQueryHook('playerMatches', fetchPlayerMatches);
export const usePlayerServeStats = createQueryHook('playerServeStats', fetchPlayerServeStats);
export const usePlayerReturnStats = createQueryHook('playerReturnStats', fetchPlayerReturnStats);
export const usePlayerServePercentiles = createQueryHook('playerServePercentiles', fetchPlayerServePercentiles);
export const usePlayerReturnPercentiles = createQueryHook('playerReturnPercentiles', fetchPlayerReturnPercentiles);
export const useTopNRecords = createQueryHook('topNRecords', fetchTopNRecords);
export const useRankHistory = createQueryHook('rankHistory', fetchRankHistory);
export const useSurfaceHeatmap = createQueryHook('surfaceHeatmap', fetchSurfaceHeatmap);
export const useTournamentRecap = createQueryHook('tournamentRecap', fetchTournamentRecap);
export const useSearchMatches = createQueryHook('searchMatches', fetchSearchMatches);
export const useLeadersWins = createQueryHook('leadersWins', fetchLeadersWins);
export const useLeadersServe = createQueryHook('leadersServe', fetchLeadersServe);
export const useLeadersReturn = createQueryHook('leadersReturn', fetchLeadersReturn);
export const useLeadersUpsets = createQueryHook('leadersUpsets', fetchLeadersUpsets);
export const useLeadersComebacks = createQueryHook('leadersComebacks', fetchLeadersComebacks);
export const useLeadersActivity = createQueryHook('leadersActivity', fetchLeadersActivity);
export const useLeadersActivityCombined = createQueryHook('leadersActivityCombined', fetchLeadersActivityCombined);
export const useLeadersBakery = createQueryHook('leadersBakery', fetchLeadersBakery);
export const usePlayerMilestones = createQueryHook('playerMilestones', fetchPlayerMilestones);
export const useSimilarPlayers = createQueryHook('similarPlayers', fetchSimilarPlayers);
export const useSimilarPlayersReturn = createQueryHook('similarPlayersReturn', fetchSimilarPlayersReturn);
export const usePlayerForm = createQueryHook('playerForm', fetchPlayerForm);
export const useLeadersStreaks = createQueryHook('leadersStreaks', fetchLeadersStreaks);
export const useLeadersDrawStrength = createQueryHook('leadersDrawStrength', fetchLeadersDrawStrength);
export const useLeadersTop10Wins = createQueryHook('leadersTop10Wins', fetchLeadersTop10Wins);
export const useLeadersFinals = createQueryHook('leadersFinals', fetchLeadersFinals);
export const useLeadersSlamRecord = createQueryHook('leadersSlamRecord', fetchLeadersSlamRecord);
export const useLeadersTiebreaks = createQueryHook('leadersTiebreaks', fetchLeadersTiebreaks);
export const useCommonOpponents = createQueryHook('commonOpponents', fetchCommonOpponents);
export const useTournamentDrawStrength = createQueryHook('tournamentDrawStrength', fetchTournamentDrawStrength);
export const useRelationalMatches = createQueryHook('relationalMatches', fetchRelationalMatches);
export const useMatchExtremes = createQueryHook('matchExtremes', fetchMatchExtremes);
export const useNationalityStage = createQueryHook('nationalityStage', fetchNationalityStage);
export const useCountryLeaders = createQueryHook('countryLeaders', fetchCountryLeaders);
export const useComebackScatter = createQueryHook('comebackScatter', fetchComebackScatter);
