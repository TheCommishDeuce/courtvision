import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePlayers, useYearRange, useH2H } from '../hooks';
import TourToggle from '../components/filters/TourToggle';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import YearRangeSlider from '../components/filters/YearRangeSlider';
import PlayerAutocomplete from '../components/filters/PlayerAutocomplete';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import QueryError from '../components/ui/QueryError';
import FilterPanel from '../components/ui/FilterPanel';
import SectionHeader from '../components/ui/SectionHeader';
import MatchStatsPanel, { type SideStats } from '../components/ui/MatchStatsPanel';
import MomentumTimeline from '../components/charts/MomentumTimeline';
import type { BySurface, H2HRow } from '../types/tennis';
import { fmtTime, surfaceClass, lastName } from '../utils';

import { parseYearRange, DEFAULT_YEAR_RANGE } from '../lib/yearRange';
import { CHART } from '../components/charts/theme';

const COLOR_A = CHART.clay;
const COLOR_B = CHART.ink;

function computeSurfaceSplits(bySurface: BySurface[], playerA: string, playerB: string) {
  const out: Record<string, { a: number; b: number }> = {};
  for (const row of bySurface) {
    if (!out[row.surface]) out[row.surface] = { a: 0, b: 0 };
    if (row.winner_name === playerA) out[row.surface].a += row.wins;
    else if (row.winner_name === playerB) out[row.surface].b += row.wins;
  }
  return out;
}

function sideStats(m: H2HRow, isWinner: boolean): SideStats {
  return isWinner
    ? { aces: m.winner_aces, dfs: m.winner_dfs, pts: m.winner_pts, firsts: m.winner_firsts,
        fwon: m.winner_fwon, swon: m.winner_swon, saved: m.winner_saved, chances: m.winner_chances }
    : { aces: m.loser_aces, dfs: m.loser_dfs, pts: m.loser_pts, firsts: m.loser_firsts,
        fwon: m.loser_fwon, swon: m.loser_swon, saved: m.loser_saved, chances: m.loser_chances };
}

function SurfaceRow({ surface, a, b, last = false }: { surface: string; a: number; b: number; last?: boolean }) {
  const total = a + b;
  const pctA = total > 0 ? (a / total) * 100 : 0;
  return (
    <div className={`flex items-center gap-3 px-1 py-3 flex-1 ${last ? '' : 'border-b border-[var(--rule)]'}`}>
      <span className={`px-1.5 py-0.5 ba-mono text-[10px] font-bold tracking-[0.15em] uppercase w-[60px] text-center ${surfaceClass(surface, 'ba-surface-hard')}`}>
        {surface}
      </span>
      <span className="ba-stat-sm text-[var(--clay)] min-w-[2ch] text-right">{a}</span>
      <div className="flex-1 h-1.5 bg-[var(--bone-3)] flex overflow-hidden">
        <div className="h-full bg-[var(--clay)]" style={{ width: `${pctA}%` }} />
        <div className="h-full bg-[var(--ink)]" style={{ width: `${100 - pctA}%` }} />
      </div>
      <span className="ba-stat-sm text-[var(--ink)] min-w-[2ch]">{b}</span>
    </div>
  );
}

export default function H2HPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: yr } = useYearRange();

  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [playerA, setPlayerA] = useState(searchParams.get('a') ?? '');
  const [playerB, setPlayerB] = useState(searchParams.get('b') ?? '');
  const [surface, setSurface] = useState(searchParams.get('surface') ?? 'All');
  const [level, setLevel] = useState(searchParams.get('level') ?? '');
  const [yearRange, setYearRange] = useState<[number, number] | null>(() => parseYearRange(searchParams));
  const [submitted, setSubmitted] = useState(!!(searchParams.get('a') && searchParams.get('b')));

  const { data: players } = usePlayers(tour);
  const activeYearRange = useMemo<[number, number]>(
    () => yearRange ?? (yr ? [yr.year_min, yr.year_max] as [number, number] : DEFAULT_YEAR_RANGE),
    [yearRange, yr],
  );

  useEffect(() => {
    const p: Record<string, string> = { tour };
    if (playerA) p.a = playerA;
    if (playerB) p.b = playerB;
    if (surface !== 'All') p.surface = surface;
    if (level) p.level = level;
    p.y0 = String(activeYearRange[0]);
    p.y1 = String(activeYearRange[1]);
    setSearchParams(p, { replace: true });
  }, [activeYearRange, level, playerA, playerB, setSearchParams, surface, tour]);

  const params = {
    player_a: playerA,
    player_b: playerB,
    tour,
    surface: surface === 'All' ? undefined : surface,
    level: level || undefined,
    year_min: activeYearRange[0],
    year_max: activeYearRange[1],
  };

  const { data: h2h, isFetching, isError, refetch } = useH2H(params, submitted && !!playerA && !!playerB);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const surfaceSplits = h2h ? computeSurfaceSplits(h2h.by_surface, playerA, playerB) : {};
  const orderedSurfaces = ['Clay', 'Grass', 'Hard'].filter(s => surfaceSplits[s]);
  const showSurfaceSplit = surface === 'All' && orderedSurfaces.length > 0;

  const leaderName = h2h ? (h2h.summary.wins_a > h2h.summary.wins_b ? playerA : h2h.summary.wins_b > h2h.summary.wins_a ? playerB : null) : null;

  return (
    <div className="space-y-10">
      {/* ============ PAGE HEADER ============ */}
      <header className="border-b border-[var(--rule)] pb-4">
        <div className="ba-kicker mb-2">Rivalry · Explorer</div>
        <h1 className="ba-display">
          Head-to-<span className="text-[var(--clay)]">Head</span>
        </h1>
      </header>

      {/* ============ FILTER PANEL ============ */}
      <FilterPanel
        kicker="Rivalry filters"
        summary={`${tour === 'M' ? 'ATP' : 'WTA'} · ${surface}${level ? ` · ${level}` : ''} · ${activeYearRange[0]}–${activeYearRange[1]}`}
        actions={(
          <button onClick={() => setSubmitted(true)} disabled={!playerA || !playerB} className="ba-btn ba-btn-primary">
            Compare →
          </button>
        )}
      >
        <TourToggle value={tour} onChange={v => { setTour(v); setSubmitted(false); }} />

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <PlayerAutocomplete
            label="Player A"
            value={playerA}
            onChange={v => { setPlayerA(v); setSubmitted(false); }}
            players={players ?? []}
          />
          <span className="ba-display text-3xl self-end pb-1 text-[var(--clay)] hidden sm:block">×</span>
          <PlayerAutocomplete
            label="Player B"
            value={playerB}
            onChange={v => { setPlayerB(v); setSubmitted(false); }}
            players={players ?? []}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_auto_minmax(20rem,1fr)] gap-4 items-end">
          <SurfaceSelect value={surface} onChange={setSurface} />
          <LevelSelect tour={tour} value={level} onChange={setLevel} />
          {yr && (
            <YearRangeSlider
              key={`h2h-year-${activeYearRange[0]}-${activeYearRange[1]}-${yr.year_min}-${yr.year_max}`}
              min={yr.year_min}
              max={yr.year_max}
              value={activeYearRange}
              onChange={setYearRange}
            />
          )}
        </div>
      </FilterPanel>

      {isFetching && <div className="py-12 flex justify-center"><Spinner /></div>}

      {!isFetching && isError && (
        <QueryError message="Couldn't load this head-to-head. The API may be unavailable." onRetry={() => refetch()} />
      )}

      {!isFetching && submitted && h2h && h2h.matches.length === 0 && (
        <EmptyState title="No rivalry ledger" message="No matches found for these two players with the selected filters." />
      )}

      {!isFetching && h2h && h2h.matches.length > 0 && (
        <div className="space-y-10">
          {/* ============ HERO STATS ============ */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* HERO KPI — RIVALRY SCORE */}
            <div className={`${showSurfaceSplit ? 'md:col-span-7' : 'md:col-span-12'} ba-kpi px-5 py-6 md:px-7 md:py-8`}>
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-baseline justify-between">
                  <span className="font-['JetBrains_Mono',ui-monospace,monospace] text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--bone)]/90">
                    Rivalry Score
                  </span>
                  <span className="font-['JetBrains_Mono',ui-monospace,monospace] text-[11px] text-[var(--bone)]/85">
                    {h2h.matches.length} {h2h.matches.length === 1 ? 'meeting' : 'meetings'}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 flex-1">
                  <div className="text-right min-w-0">
                    <div className="font-['JetBrains_Mono',ui-monospace,monospace] text-[11px] text-[var(--bone)]/85 mb-1 truncate">
                      {h2h.summary.player_a}
                    </div>
                    <div className="ba-stat text-[var(--bone)]">{h2h.summary.wins_a}</div>
                  </div>
                  <div className="ba-stat text-[var(--bone)]/70">
                    —
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-['JetBrains_Mono',ui-monospace,monospace] text-[11px] text-[var(--bone)]/85 mb-1 truncate">
                      {h2h.summary.player_b}
                    </div>
                    <div className="ba-stat text-[var(--bone)]/85">{h2h.summary.wins_b}</div>
                  </div>
                </div>

                {leaderName && (
                  <div className="pt-2 border-t border-[var(--bone)]/25 flex items-baseline justify-between">
                    <span className="font-['JetBrains_Mono',ui-monospace,monospace] text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--bone)]/90">
                      Current leader
                    </span>
                    <span className="ba-h3 text-[var(--bone)]">{leaderName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SURFACE SPLIT — stripped rows, hidden when a specific surface is filtered */}
            {showSurfaceSplit && (
              <div className="md:col-span-5 flex flex-col">
                <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-2 mb-1">
                  <h3 className="ba-h2">Wins by Surface</h3>
                  <span className="ba-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--mute)]">
                    A vs B
                  </span>
                </div>
                <div className="flex flex-col justify-between flex-1">
                  {orderedSurfaces.map((s, i) => (
                    <SurfaceRow
                      key={s}
                      surface={s}
                      a={surfaceSplits[s].a}
                      b={surfaceSplits[s].b}
                      last={i === orderedSurfaces.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ============ MOMENTUM ============ */}
          <section className="ba-card">
            <MomentumTimeline matches={h2h.matches} playerA={playerA} playerB={playerB} colorA={COLOR_A} colorB={COLOR_B} />
          </section>

          {/* ============ MATCH LOG ============ */}
          <section>
            <SectionHeader title="Match Log" kicker={`${h2h.matches.length} matches · tap a row for stats`} />
            <div className="ba-card p-0 overflow-x-auto">
              <table className="ba-table min-w-full">
                <thead>
                  <tr>
                    {['Date', 'Tournament', 'Surface', 'Level', 'Round', 'Winner', 'Score', 'Time'].map(h => (
                      <th key={h} className="px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h2h.matches.map((m, i) => {
                    const hasData = m.winner_pts != null;
                    const isOpen = expandedIdx === i;
                    const winnerColor = m.winner_name === playerA ? 'var(--clay)' : 'var(--ink)';
                    return (
                      <Fragment key={i}>
                        <tr
                          className={hasData ? 'cursor-pointer' : ''}
                          onClick={() => hasData && setExpandedIdx(isOpen ? null : i)}
                          onKeyDown={e => {
                            if (!hasData) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpandedIdx(isOpen ? null : i);
                            }
                          }}
                          role={hasData ? 'button' : undefined}
                          tabIndex={hasData ? 0 : -1}
                          aria-expanded={hasData ? isOpen : undefined}
                        >
                          <td className="px-3 ba-mono text-[12px] text-[var(--mute)]">{m.date?.slice(0, 10)}</td>
                          <td className="px-3">
                            <Link
                              to={`/tournament?t=${encodeURIComponent(m.tournament)}&year=${m.date?.slice(0, 4)}&tour=${tour}`}
                              className="ba-link"
                              onClick={e => e.stopPropagation()}
                            >
                              {m.tournament}
                            </Link>
                          </td>
                          <td className="px-3">
                            <span className={`px-1.5 py-0.5 ba-mono text-[10px] font-bold uppercase tracking-[0.12em] ${surfaceClass(m.surface, 'ba-surface-hard')}`}>
                              {m.surface}
                            </span>
                          </td>
                          <td className="px-3 text-[13px] text-[var(--ink-2)]">{m.level_name}</td>
                          <td className="px-3 ba-mono text-[12px] text-[var(--ink-2)]">{m.round}</td>
                          <td className="px-3 font-semibold" style={{ color: winnerColor }}>
                            {m.winner_name}
                            {m.is_retirement && <span className="ml-1 ba-mono text-[10px] text-[var(--mute)]">(ret.)</span>}
                          </td>
                          <td className="px-3 ba-mono">{m.score}</td>
                          <td className="px-3 ba-mono text-[12px] text-[var(--mute)]">{fmtTime(m.time)}</td>
                        </tr>
                        {isOpen && hasData && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <MatchStatsPanel
                                a={sideStats(m, m.winner_name === playerA)}
                                b={sideStats(m, m.winner_name !== playerA)}
                                aLabel={lastName(playerA)}
                                bLabel={lastName(playerB)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
