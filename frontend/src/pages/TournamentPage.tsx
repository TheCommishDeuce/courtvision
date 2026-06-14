import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTournaments, useTournamentYears, useTournamentRecap, useRecentChampions, useTournamentDrawStrength } from '../hooks';
import TourToggle from '../components/filters/TourToggle';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import QueryError from '../components/ui/QueryError';
import FilterPanel from '../components/ui/FilterPanel';
import SectionHeader from '../components/ui/SectionHeader';
import DrawResults from '../components/sections/tournament/DrawResults';
import StatsLeaderTable from '../components/sections/tournament/StatsLeaderTable';
import StatRow from '../components/sections/tournament/StatRow';
import Storylines from '../components/sections/tournament/Storylines';
import type { RecentChampion } from '../types/tennis';
import { surfaceClass } from '../utils';

export default function TournamentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [search, setSearch] = useState(searchParams.get('t') ?? '');
  const [selected, setSelected] = useState(searchParams.get('t') ?? '');
  const [year, setYear] = useState<number | undefined>(
    searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
  );

  const { data: allTournaments } = useTournaments(tour);
  const { data: years } = useTournamentYears(selected, tour);
  const { data: recentChampions, isLoading: loadingChampions, isError: errorChampions, refetch: refetchChampions } = useRecentChampions(tour);
  const activeYear = year ?? years?.[0];
  const { data: recap, isFetching, isError: errorRecap, refetch: refetchRecap } = useTournamentRecap({ tournament: selected, year: activeYear, tour }, !!selected);
  const { data: drawStrength } = useTournamentDrawStrength({ tournament: selected, year: activeYear, tour }, !!selected && !!activeYear);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tour', tour);
    if (selected) {
      next.set('t', selected);
      if (activeYear) next.set('year', String(activeYear));
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeYear, searchParams, selected, setSearchParams, tour]);

  const filtered = (allTournaments ?? []).filter(t => t.toLowerCase().includes(search.toLowerCase()));
  const handleSelect = (t: string, y?: number) => {
    setSelected(t);
    setSearch(t);
    setYear(y);
  };

  const champion = recap?.matches_by_round?.find(g => g.round === 'F')?.matches?.[0];

  return (
    <div className="space-y-10">
      {/* ============ PAGE HEADER ============ */}
      <header className="border-b border-[var(--rule)] pb-4">
        <div className="ba-kicker text-[10px] mb-2">Tournament · Recap</div>
        <h1 className="ba-display">
          Draw &amp; <span className="text-[var(--clay)]">Champion</span>
        </h1>
      </header>

      {/* ============ FILTER PANEL ============ */}
      <FilterPanel
        kicker="Tournament filters"
        summary={`${tour === 'M' ? 'ATP' : 'WTA'}${selected ? ` · ${selected}` : ''}${activeYear ? ` · ${activeYear}` : ''}`}
      >
        <TourToggle value={tour} onChange={v => { setTour(v); setSelected(''); setSearch(''); setYear(undefined); }} />

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(16rem,24rem)_auto] gap-4 items-end">
          <div className="flex flex-col gap-1 relative w-full">
            <label className="ba-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--mute)]">Tournament</label>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(''); }}
              placeholder="Type to search…"
              className="ba-input w-full"
            />
            {search && !selected && filtered.length > 0 && (
              <ul className="absolute top-full left-0 z-10 bg-[var(--bone)] border border-[var(--ink)] max-h-56 overflow-y-auto w-full text-sm">
                {filtered.slice(0, 30).map(t => (
                  <li key={t} className="border-b border-[var(--rule)] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => handleSelect(t)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[var(--clay)] hover:text-[var(--bone)]"
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {years && years.length > 0 && (
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="ba-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--mute)]">Year</label>
              <select value={activeYear ?? ''} onChange={e => setYear(Number(e.target.value))} className="ba-select w-full">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
      </FilterPanel>

      {/* ============ LATEST CHAMPIONS (no selection) ============ */}
      {!selected && (
        <section>
          <SectionHeader title="Latest Champions" kicker="Click a row to open the recap" />
          {loadingChampions ? (
            <div className="py-12 flex justify-center"><Spinner /></div>
          ) : errorChampions ? (
            <QueryError message="Couldn't load recent champions." onRetry={() => refetchChampions()} />
          ) : (
            <ul className="divide-y divide-[var(--rule)] border-t border-b border-[var(--rule)]">
              {(recentChampions ?? []).map((c: RecentChampion, i) => (
                <li key={i} className="px-2 py-1">
                  <button
                    type="button"
                    className="w-full text-left px-0 py-2 hover:bg-[var(--bone-2)] cursor-pointer"
                    onClick={() => handleSelect(c.tournament, c.year)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 ba-mono text-[9px] font-bold uppercase tracking-[0.12em] ${surfaceClass(c.surface)}`}>
                            {c.surface}
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--ink)] truncate">{c.tournament}</span>
                        </div>
                        <div className="text-[12px]">
                          <span className="text-[var(--clay-deep)] font-semibold">{c.winner_name}</span>
                          <span className="text-[var(--mute)] mx-1.5 text-[10px] ba-mono">def</span>
                          <span className="text-[var(--ink-2)]">{c.loser_name}</span>
                          <span className="ba-mono text-[var(--mute)] text-[10px] ml-2">{c.score}</span>
                        </div>
                      </div>
                      <div className="ba-mono text-[10px] text-[var(--mute)] whitespace-nowrap">{c.date?.slice(0, 10)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isFetching && <div className="py-12 flex justify-center"><Spinner /></div>}
      {!isFetching && selected && errorRecap && (
        <QueryError message="Couldn't load this tournament recap. The API may be unavailable." onRetry={() => refetchRecap()} />
      )}
      {!isFetching && selected && recap && recap.meta.total_matches === 0 && (
        <EmptyState title="No draw on file" message="No matches found for this tournament/year." />
      )}

      {!isFetching && recap && recap.meta.total_matches > 0 && (
        <div className="space-y-10">
          {/* ============ HERO STATS ============ */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* CHAMPION HERO */}
            <div className="md:col-span-7 ba-kpi px-5 py-6 md:px-7 md:py-8">
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-baseline justify-between">
                  <span className="font-['JetBrains_Mono',ui-monospace,monospace] text-[10px] font-medium tracking-[0.12em] uppercase text-[var(--bone)]/90">
                    {recap.meta.year} · {recap.meta.tournament} · Champion
                  </span>
                </div>

                {champion ? (
                  <div className="flex flex-col gap-2 flex-1 justify-center">
                    <Link
                      to={`/player?p=${encodeURIComponent(champion.winner_name)}&tour=${tour}`}
                      className="ba-display text-[var(--bone)] hover:underline"
                    >
                      {champion.winner_name}
                    </Link>
                    <div className="text-[12.5px]" style={{ color: 'color-mix(in oklab, var(--bone) 80%, transparent)' }}>
                      <span className="ba-mono mr-2 text-[11px]">def</span>
                      <Link
                        to={`/player?p=${encodeURIComponent(champion.loser_name)}&tour=${tour}`}
                        className="hover:underline underline-offset-2"
                        style={{ color: 'inherit' }}
                      >
                        {champion.loser_name}
                      </Link>
                      {champion.loser_rank && <span className="ba-mono ml-1.5 text-[11px]">#{champion.loser_rank}</span>}
                      <span className="mx-2">·</span>
                      <span className="ba-mono text-[11px]">{champion.score}</span>
                    </div>
                  </div>
                ) : (
                  <div className="ba-h2 text-[var(--bone)]/80">No final on record</div>
                )}
              </div>
            </div>

            {/* META STATS */}
            <div className="md:col-span-5 flex flex-col border-t-2 border-[var(--ink)]">
              <StatRow
                label="Surface"
                value={
                  recap.meta.surface ? (
                    <span className={`px-2 py-0.5 ba-mono text-[12px] font-bold uppercase tracking-[0.12em] ${surfaceClass(recap.meta.surface)}`}>
                      {recap.meta.surface}
                    </span>
                  ) : '—'
                }
              />
              <StatRow label="Level" value={recap.meta.level_name ?? recap.meta.level ?? '—'} />
              <StatRow label="Date" value={recap.meta.date?.slice(0, 10) ?? recap.meta.year ?? '—'} last />
            </div>
          </section>

          {/* ============ DRAW ============ */}
          {recap.matches_by_round.length > 0 && (
            <section>
              <SectionHeader title="Draw" kicker="Upsets highlighted" />
              <div className="ba-card p-0 overflow-hidden">
                <DrawResults matchesByRound={recap.matches_by_round} tour={tour} />
              </div>
            </section>
          )}

          {/* ============ STORYLINES ============ */}
          <Storylines recap={recap} drawStrength={drawStrength} tour={tour} />

          {/* ============ STAT LEADERS ============ */}
          {(recap.stats.aces.length > 0 || recap.stats.first_serve_won_pct.length > 0) && (
            <section>
              <SectionHeader title="Stat Leaders" />
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <StatsLeaderTable title="Aces" rows={recap.stats.aces} valueKey="aces" tour={tour} />
                <StatsLeaderTable title="1st Won %" rows={recap.stats.first_serve_won_pct} valueKey="first_serve_won_pct" unit="%" tour={tour} />
                <StatsLeaderTable title="2nd Won %" rows={recap.stats.second_serve_won_pct} valueKey="second_serve_won_pct" unit="%" tour={tour} />
                <StatsLeaderTable title="Ret Pts Won %" rows={recap.stats.return_win_pct} valueKey="return_win_pct" unit="%" tour={tour} />
                <StatsLeaderTable title="BP Saved" rows={recap.stats.bp_saved} valueKey="bp_saved" tour={tour} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
