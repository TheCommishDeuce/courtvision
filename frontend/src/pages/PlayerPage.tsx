import { useMemo, useState } from 'react';
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
import Spinner from '../components/primitives/Spinner';
import EmptyState from '../components/primitives/EmptyState';
import QueryError from '../components/primitives/QueryError';
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
import { clampRange } from '../domain/yearRange';
import { useUrlFilters } from '../state/useUrlFilters';
import { playerFilterSchema, defaultPlayerFilters } from '../components/sections/player/filters';

export default function PlayerPage() {
  const { data: yr } = useYearRange();

  const [filters, setFilters] = useUrlFilters(playerFilterSchema, defaultPlayerFilters);

  // A URL that names a player is already a request for that profile: every
  // player link in the app points here, so arriving with `p` set loads it
  // rather than showing "pick a player" over the name the link just named.
  const [isSubmitted, setIsSubmitted] = useState(Boolean(filters.p));

  // The typed name is page state until it is submitted. Writing it to the URL
  // per keystroke would remount this page (App keys the route on `p`) and
  // re-run the profile against half a name.
  const [draft, setDraft] = useState(filters.p ?? '');

  const { data: players } = usePlayers(filters.tour);

  const globalMin = yr?.year_min ?? 1990;
  const globalMax = yr?.year_max ?? new Date().getFullYear();

  // We want the query arguments to be exact only when submitted
  const runParams = useMemo(() => {
    if (!isSubmitted || !filters.p) return null;
    return {
      player: filters.p,
      tour: filters.tour,
      surface: filters.surface === 'All' ? undefined : filters.surface,
      level: filters.level === 'All Tour' ? undefined : filters.level,
      year_min: filters.y0,
      year_max: filters.y1,
    };
  }, [isSubmitted, filters]);

  // Data fetching
  const summaryQ = usePlayerSummary(runParams!, !!runParams);
  const matchesQ = usePlayerMatches(runParams!, !!runParams);
  const formQ = usePlayerForm(runParams!, !!runParams);
  const serveQ = usePlayerServeStats(runParams!, !!runParams);
  const returnQ = usePlayerReturnStats(runParams!, !!runParams);
  const topRecordsQ = useTopNRecords(runParams!, !!runParams);
  const rankQ = useRankHistory(runParams!, !!runParams);
  const milestonesQ = usePlayerMilestones({ player: runParams?.player || '', tour: runParams?.tour }, !!runParams);
  const servePctQ = usePlayerServePercentiles({ player: runParams?.player || '', tour: runParams?.tour || 'M' }, !!runParams);
  const retPctQ = usePlayerReturnPercentiles({ player: runParams?.player || '', tour: runParams?.tour || 'M' }, !!runParams);
  const simServeQ = useSimilarPlayers({ player: runParams?.player || '', tour: runParams?.tour }, !!runParams);
  const simRetQ = useSimilarPlayersReturn({ player: runParams?.player || '', tour: runParams?.tour }, !!runParams);

  // The slider offers this player's career, not the archive's 1910–2026.
  //
  // The bounds come from an unfiltered read of their matches, deliberately:
  // taking them from `matchesQ` would let a narrowed range narrow the bounds
  // under it, one drag at a time, with no way back. On first load this is the
  // same request the page already makes, so it is a cache hit, not a fetch.
  const careerQ = usePlayerMatches({ player: runParams?.player ?? '', tour: filters.tour }, !!runParams);
  const careerYears = (careerQ.data?.by_year ?? [])
    .map(r => r.year)
    .filter((y): y is number => typeof y === 'number');
  const sliderMin = careerYears.length ? Math.min(...careerYears) : globalMin;
  const sliderMax = careerYears.length ? Math.max(...careerYears) : globalMax;

  const isAnyLoading = summaryQ.isLoading || matchesQ.isLoading;
  const isAnyError = summaryQ.isError || matchesQ.isError;
  const hasNoMatches = isSubmitted && !isAnyLoading && !isAnyError && matchesQ.data?.total === 0;

  return (
    <div className="ba-flow pb-[var(--space-2xl)]">
      <PlayerHeader player={draft} summary={summaryQ.data} submitted={isSubmitted} />

      <PlayerFilterPanel
        tour={filters.tour}
        player={draft}
        surface={filters.surface}
        level={filters.level}
        players={players ?? []}
        yearRange={clampRange([filters.y0 ?? sliderMin, filters.y1 ?? sliderMax], sliderMin, sliderMax)}
        sliderMin={sliderMin}
        sliderMax={sliderMax}
        onTourChange={t => { setDraft(''); setIsSubmitted(false); setFilters({ tour: t as 'M'|'F', p: '' }); }}
        onPlayerChange={p => { setDraft(p); setIsSubmitted(false); }}
        onSurfaceChange={s => setFilters({ surface: s })}
        onLevelChange={l => setFilters({ level: l })}
        onYearRangeChange={([y0, y1]) => setFilters({ y0, y1 })}
        onSubmit={() => { setFilters({ p: draft }); setIsSubmitted(true); }}
      />

      {isSubmitted && isAnyLoading && (
        <div className="ba-card flex items-center justify-center py-20 mt-[var(--space-md)]">
          <Spinner />
        </div>
      )}

      {isSubmitted && isAnyError && (
        <div className="mt-[var(--space-md)]">
          <QueryError onRetry={() => {
            summaryQ.refetch();
            matchesQ.refetch();
          }} />
        </div>
      )}

      {isSubmitted && !isAnyLoading && !isAnyError && !hasNoMatches && (
        <div className="ba-flow mt-[var(--space-md)]">
          <KpiDossier
            summary={summaryQ.data!}
            filteredWins={matchesQ.data!.total > 0 ? (matchesQ.data!.by_surface.reduce((acc, r) => acc + r.wins, 0)) : 0}
            filteredLosses={matchesQ.data!.total > 0 ? (matchesQ.data!.by_surface.reduce((acc, r) => acc + (r.total - r.wins), 0)) : 0}
            filteredWinPct={matchesQ.data!.total > 0 ? ((matchesQ.data!.by_surface.reduce((acc, r) => acc + r.wins, 0) / matchesQ.data!.by_surface.reduce((acc, r) => acc + r.total, 0)) * 100).toFixed(1) + '%' : '—'}
            topN={topRecordsQ.data}
            playerForm={formQ.data}
          />

          <FormSection playerForm={formQ.data} tour={filters.tour} />

          <CareerPulseSection matchData={matchesQ.data!} rankHistory={rankQ.data} summary={summaryQ.data!} />

          <MilestonesRecordsSection milestones={milestonesQ.data} topN={topRecordsQ.data} />

          <ServeReturnSection
            serveStats={serveQ.data}
            returnStats={returnQ.data}
            servePct={servePctQ.data}
            returnPct={retPctQ.data}
            player={filters.p!}
            tour={filters.tour}
          />

          <SimilarProfilesSection
            similarPlayers={simServeQ.data}
            similarReturn={simRetQ.data}
            tour={filters.tour}
          />

          <RecentMatchesSection recentMatches={matchesQ.data!.recent52w} tour={filters.tour} />
        </div>
      )}

      {hasNoMatches && (
        <div className="mt-[var(--space-md)]">
          <EmptyState
            title="No matches found"
            message="This player has no recorded matches under these specific filters. Try widening the year range or surface."
          />
        </div>
      )}

      {!isSubmitted && (
        <div className="mt-[var(--space-md)]">
          <EmptyState
            title="Pick a player"
            message="Search for a player by name to view their complete match archive."
          />
        </div>
      )}
    </div>
  );
}
