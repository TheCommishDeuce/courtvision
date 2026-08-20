import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTournaments, useTournamentYears, useTournamentRecap, useRecentChampions, useTournamentDrawStrength } from '../hooks';
import TourToggle from '../components/filters/TourToggle';
import Spinner from '../components/primitives/Spinner';
import EmptyState from '../components/primitives/EmptyState';
import QueryError from '../components/primitives/QueryError';
import SectionHeader from '../components/primitives/SectionHeader';
import DrawResults from '../components/sections/tournament/DrawResults';
import StatsLeaderTable from '../components/sections/tournament/StatsLeaderTable';
import StatRow from '../components/sections/tournament/StatRow';
import Storylines from '../components/sections/tournament/Storylines';
import type { RecentChampion } from '../types/tennis';
import SurfaceTag from '../components/primitives/SurfaceTag';
import { useUrlFilters } from '../state/useUrlFilters';
import { tournamentFilterSchema, defaultTournamentFilters } from '../components/sections/tournament/filters';

export default function TournamentPage() {
  const [filters, setFilters] = useUrlFilters(tournamentFilterSchema, defaultTournamentFilters);
  const tour = filters.tour;
  const selected = filters.t ?? '';
  const activeYear = filters.year;

  // Local state for the input before selection
  const [search, setSearch] = useState(selected);
  
  // Sync search input when url selected changes
  useEffect(() => {
    setSearch(selected);
  }, [selected]);

  const { data: allTournaments } = useTournaments(tour);
  const { data: years } = useTournamentYears(selected, tour);
  const { data: recentChampions, isLoading: loadingChampions, isError: errorChampions, refetch: refetchChampions } = useRecentChampions(tour);
  
  const resolvedYear = activeYear ?? years?.[0];
  const { data: recap, isFetching, isError: errorRecap, refetch: refetchRecap } = useTournamentRecap({ tournament: selected, year: resolvedYear, tour }, !!selected);
  const { data: drawStrength } = useTournamentDrawStrength({ tournament: selected, year: resolvedYear, tour }, !!selected && !!resolvedYear);

  const filtered = (allTournaments ?? []).filter(t => t.toLowerCase().includes(search.toLowerCase()));
  const handleSelect = (t: string, y?: number) => {
    setFilters({ t, year: y });
  };

  const champion = recap?.matches_by_round?.find(g => g.round === 'F')?.matches?.[0];

  return (
    <div className="space-y-5">
      <SectionHeader
        level="page"
        eyebrow="Tournament"
        title="One event, one year, every result"
        kicker={[
          tour === 'M' ? 'ATP' : 'WTA',
          selected || 'no event selected',
          activeYear ? String(activeYear) : null,
        ].filter(Boolean).join(' · ')}
      />

      <section className="ba-well px-3 py-2.5">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="flex flex-col gap-0.5 relative w-full sm:w-80">
            <span className="ba-label">Tournament</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setFilters({ t: '' }); }}
              placeholder="Type to search events…"
              className="ba-input w-full"
            />
            {search && !selected && filtered.length > 0 && (
              <ul className="absolute top-full left-0 z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-[var(--r-sm)] border border-rule bg-paper-raised shadow-[var(--shadow-2)]">
                {filtered.slice(0, 30).map(t => (
                  <li key={t} className="border-b border-rule last:border-b-0">
                    <button
                      type="button"
                      onClick={() => handleSelect(t)}
                      className="w-full text-left px-2.5 py-1 ba-cell hover:bg-clay hover:text-on-clay"
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          {years && years.length > 0 && (
            <label className="flex flex-col gap-0.5 w-full sm:w-auto">
              <span className="ba-label">Year</span>
              <select
                value={resolvedYear ?? ''}
                onChange={e => setFilters({ year: Number(e.target.value) })}
                className="ba-select w-full"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          )}

          <TourToggle
            value={tour}
            onChange={v => setFilters({ tour: v as 'M'|'F', t: '', year: undefined })}
          />
        </div>
      </section>

      {/* With no event chosen, recent finals are the way in. */}
      {!selected && (
        <section>
          <SectionHeader title="Latest champions" kicker="Pick one to open its recap" />
          {loadingChampions ? (
            <Spinner />
          ) : errorChampions ? (
            <QueryError
              title="Recent champions did not load"
              message="Retry, or search for an event by name."
              onRetry={() => refetchChampions()}
            />
          ) : (
            <ul className="overflow-hidden rounded-[var(--r-md)] border border-rule bg-paper-raised divide-y divide-[var(--rule)]">
              {(recentChampions ?? []).map((c: RecentChampion, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-2.5 py-1.5 hover:bg-clay-wash transition-colors"
                    onClick={() => handleSelect(c.tournament, c.year)}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <SurfaceTag surface={c.surface} />
                      <span className="ba-cell font-semibold text-ink">{c.tournament}</span>
                      <span className="ba-mono ba-meta text-mute">{c.year}</span>
                      <span className="ba-mono ba-meta text-mute ml-auto">
                        {c.date?.slice(0, 10)}
                      </span>
                    </div>
                    <div className="ba-cell mt-0.5">
                      <span className="font-semibold text-clay">{c.winner_name}</span>
                      <span className="ba-mono ba-meta text-mute mx-1.5">beat</span>
                      <span className="text-ink-2">{c.loser_name}</span>
                      <span className="ba-mono ba-meta text-mute ml-2">{c.score}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isFetching && <Spinner />}
      {!isFetching && selected && errorRecap && (
        <QueryError
          title="This recap did not load"
          message="Retry, or pick a different year."
          onRetry={() => refetchRecap()}
        />
      )}
      {!isFetching && selected && recap && recap.meta.total_matches === 0 && (
        <EmptyState
          title="No draw on record"
          message="This event has no matches stored for that year. Try another year."
        />
      )}

      {!isFetching && recap && recap.meta.total_matches > 0 && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-[7fr_5fr] gap-3 items-stretch">
            {/* The champion, as the page's one clay block. */}
            <div className="ba-kpi px-4 py-4 flex flex-col">
              <div className="ba-label text-on-clay-soft mb-2">
                {recap.meta.year} {recap.meta.tournament} · champion
              </div>
              {champion ? (
                /* The name is capped a step below the ramp's top: a champion is
                   a nameplate inside a block, not the page's own headline, and
                   long names wrap badly at full display size. */
                <div className="flex flex-col gap-1.5 flex-1 justify-center">
                  <Link
                    to={`/player?p=${encodeURIComponent(champion.winner_name)}&tour=${tour}`}
                    className="ba-display ba-touch text-[length:var(--step-4)] text-on-clay hover:underline"
                  >
                    {champion.winner_name}
                  </Link>
                  <div className="ba-cell text-on-clay">
                    <span className="ba-mono ba-meta mr-2">beat</span>
                    <Link
                      to={`/player?p=${encodeURIComponent(champion.loser_name)}&tour=${tour}`}
                      className="ba-touch text-on-clay hover:underline underline-offset-2"
                    >
                      {champion.loser_name}
                    </Link>
                    {champion.loser_rank && (
                      <span className="ba-mono ba-meta ml-1.5">#{champion.loser_rank}</span>
                    )}
                    <span aria-hidden="true" className="mx-2 text-on-clay-soft/60">·</span>
                    <span className="ba-mono ba-meta">{champion.score}</span>
                  </div>
                </div>
              ) : (
                <div className="ba-h3 text-on-clay-soft flex-1 flex items-center">No final on record</div>
              )}
            </div>

            <div className="flex flex-col">
              <StatRow
                label="Surface"
                value={recap.meta.surface ? <SurfaceTag surface={recap.meta.surface} size="md" /> : '—'}
              />
              <StatRow label="Level" value={recap.meta.level_name ?? recap.meta.level ?? '—'} />
              <StatRow label="Matches" value={recap.meta.total_matches.toLocaleString()} />
              <StatRow label="Played" value={recap.meta.date?.slice(0, 10) ?? recap.meta.year ?? '—'} last />
            </div>
          </section>

          {recap.matches_by_round.length > 0 && (
            <section>
              <SectionHeader
                title="The draw"
                kicker="Latest round first · clay tick marks an upset · click a row for point stats"
              />
              <DrawResults matchesByRound={recap.matches_by_round} tour={tour} />
            </section>
          )}

          <Storylines recap={recap} drawStrength={drawStrength} tour={tour} />

          {(recap.stats.aces.length > 0 || recap.stats.first_serve_won_pct.length > 0) && (
            <section>
              <SectionHeader title="Stat leaders" kicker="Top five in the draw" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                <StatsLeaderTable title="Aces" rows={recap.stats.aces} valueKey="aces" tour={tour} />
                <StatsLeaderTable title="1st serve won %" rows={recap.stats.first_serve_won_pct} valueKey="first_serve_won_pct" unit="%" tour={tour} />
                <StatsLeaderTable title="2nd serve won %" rows={recap.stats.second_serve_won_pct} valueKey="second_serve_won_pct" unit="%" tour={tour} />
                <StatsLeaderTable title="Return points won %" rows={recap.stats.return_win_pct} valueKey="return_win_pct" unit="%" tour={tour} />
                <StatsLeaderTable title="Break points saved" rows={recap.stats.bp_saved} valueKey="bp_saved" tour={tour} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
