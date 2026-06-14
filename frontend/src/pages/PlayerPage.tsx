import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  usePlayers,
  useYearRange,
  usePlayerSummary,
  usePlayerMatches,
  usePlayerServeStats,
  usePlayerReturnStats,
  usePlayerServePercentiles,
  usePlayerReturnPercentiles,
  useTopNRecords,
  useRankHistory,
  usePlayerMilestones,
  useSimilarPlayers,
  useSimilarPlayersReturn,
  usePlayerForm,
} from '../hooks';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import QueryError from '../components/ui/QueryError';
import {
  CareerPulseSection,
  FormSection,
  KpiDossier,
  MilestonesRecordsSection,
  PlayerFilterPanel,
  PlayerHeader,
  RecentMatchesSection,
  ServeReturnSection,
  SimilarProfilesSection,
} from '../components/sections/player/PlayerSections';

import { parseYearRange, DEFAULT_YEAR_RANGE } from '../lib/yearRange';

export default function PlayerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: yr } = useYearRange();

  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [player, setPlayer] = useState(searchParams.get('p') ?? '');
  const [surface, setSurface] = useState(searchParams.get('surface') ?? 'All');
  const [level, setLevel] = useState(searchParams.get('level') ?? '');
  const [yearRange, setYearRange] = useState<[number, number] | null>(() => parseYearRange(searchParams));
  const [submitted, setSubmitted] = useState(!!searchParams.get('p'));

  const { data: players } = usePlayers(tour);
  const activeYearRange = useMemo<[number, number]>(
    () => yearRange ?? (yr ? [yr.year_min, yr.year_max] as [number, number] : DEFAULT_YEAR_RANGE),
    [yearRange, yr],
  );

  useEffect(() => {
    if (!submitted) return;
    const p: Record<string, string> = { tour };
    if (player) p.p = player;
    if (surface !== 'All') p.surface = surface;
    if (level) p.level = level;
    p.y0 = String(activeYearRange[0]);
    p.y1 = String(activeYearRange[1]);
    setSearchParams(p, { replace: true });
  }, [submitted, activeYearRange, level, player, setSearchParams, surface, tour]);

  const filterParams = {
    player,
    tour,
    surface: surface === 'All' ? undefined : surface,
    level: level || undefined,
    year_min: activeYearRange[0],
    year_max: activeYearRange[1],
  };
  const baseParams = { player, tour };
  const yearParams = { ...baseParams, year_min: activeYearRange[0], year_max: activeYearRange[1] };
  const titlesParams = { ...yearParams, surface: surface === 'All' ? undefined : surface };
  const enabled = submitted && !!player;

  const { data: summary, isFetching: loadingSummary, isError: errorSummary, refetch: refetchSummary } = usePlayerSummary(titlesParams, enabled);
  const { data: matchData, isFetching: loadingMatches, isError: errorMatches, refetch: refetchMatches } = usePlayerMatches(filterParams, enabled);
  const { data: serveStats, isFetching: loadingServe } = usePlayerServeStats(filterParams, enabled);
  const { data: returnStats, isFetching: loadingReturn } = usePlayerReturnStats(filterParams, enabled);
  const { data: topN, isFetching: loadingTopN } = useTopNRecords(filterParams, enabled);
  const { data: rankHistory } = useRankHistory(yearParams, enabled);
  const { data: milestones } = usePlayerMilestones(baseParams, enabled);
  const { data: servePct } = usePlayerServePercentiles({ player, tour }, enabled);
  const { data: returnPct } = usePlayerReturnPercentiles({ player, tour }, enabled);
  const { data: similarPlayers } = useSimilarPlayers(baseParams, enabled);
  const { data: similarReturn } = useSimilarPlayersReturn(baseParams, enabled);
  const { data: playerForm } = usePlayerForm(filterParams, enabled);

  const isLoading = loadingSummary || loadingMatches || loadingServe || loadingReturn || loadingTopN;
  const playerBounds = useMemo<[number, number] | null>(() => {
    if (!matchData || matchData.by_year.length === 0) return null;
    const years = matchData.by_year.map(r => r.year ?? 0).filter(y => y > 0);
    if (years.length === 0) return null;
    return [Math.min(...years), Math.max(...years)];
  }, [matchData]);

  const filteredWins = matchData?.by_year.reduce((s, r) => s + r.wins, 0) ?? 0;
  const filteredTotal = matchData?.by_year.reduce((s, r) => s + r.total, 0) ?? 0;
  const filteredLosses = filteredTotal - filteredWins;
  const filteredWinPct = filteredTotal > 0 ? ((filteredWins / filteredTotal) * 100).toFixed(1) : '0.0';

  const sliderMin = playerBounds?.[0] ?? yr?.year_min ?? DEFAULT_YEAR_RANGE[0];
  const sliderMax = playerBounds?.[1] ?? yr?.year_max ?? DEFAULT_YEAR_RANGE[1];
  const sliderValue = useMemo<[number, number]>(() => {
    const start = Math.max(activeYearRange[0], sliderMin);
    const end = Math.min(activeYearRange[1], sliderMax);
    return start <= end ? [start, end] : [sliderMin, sliderMax];
  }, [activeYearRange, sliderMax, sliderMin]);

  const hasLoaded = submitted && !!summary && !!matchData && matchData.total > 0;

  return (
    <div className="space-y-10">
      <PlayerHeader player={player} submitted={submitted} summary={summary} />
      {yr && (
        <PlayerFilterPanel
          tour={tour}
          player={player}
          surface={surface}
          level={level}
          players={players ?? []}
          yearRange={sliderValue}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          onTourChange={v => { setTour(v); setSubmitted(false); }}
          onPlayerChange={v => { setPlayer(v); setSubmitted(false); }}
          onSurfaceChange={setSurface}
          onLevelChange={setLevel}
          onYearRangeChange={setYearRange}
          onSubmit={() => setSubmitted(true)}
        />
      )}

      {isLoading && <div className="py-12 flex justify-center"><Spinner /></div>}
      {!isLoading && (errorSummary || errorMatches) && (
        <QueryError
          message="Couldn't load this player's profile. The API may be unavailable."
          onRetry={() => { if (errorSummary) refetchSummary(); if (errorMatches) refetchMatches(); }}
        />
      )}
      {!isLoading && submitted && matchData && matchData.total === 0 && <EmptyState title="No player dossier" message="No matches found for this player with the selected filters." />}

      {!isLoading && hasLoaded && summary && matchData && (
        <div className="space-y-10">
          <KpiDossier filteredWins={filteredWins} filteredLosses={filteredLosses} filteredWinPct={filteredWinPct} summary={summary} topN={topN} playerForm={playerForm} />
          <FormSection playerForm={playerForm} tour={tour} />
          <CareerPulseSection matchData={matchData} rankHistory={rankHistory} summary={summary} />
          <MilestonesRecordsSection milestones={milestones} topN={topN} />
          <ServeReturnSection player={player} tour={tour} serveStats={serveStats} returnStats={returnStats} servePct={servePct} returnPct={returnPct} />
          <SimilarProfilesSection similarPlayers={similarPlayers} similarReturn={similarReturn} tour={tour} />
          <RecentMatchesSection recentMatches={matchData.recent52w ?? []} tour={tour} />
        </div>
      )}
    </div>
  );
}
