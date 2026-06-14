import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  usePlayers,
  usePlayerSummary,
  usePlayerMatches,
  usePlayerServeStats,
  usePlayerReturnStats,
  usePlayerServePercentiles,
  usePlayerReturnPercentiles,
  useTopNRecords,
  useRankHistory,
  useCommonOpponents,
} from '../hooks';
import TourToggle from '../components/filters/TourToggle';
import PlayerAutocomplete from '../components/filters/PlayerAutocomplete';
import ServeRadarChart from '../components/charts/ServeRadarChart';
import ReturnRadarChart from '../components/charts/ReturnRadarChart';
import RankHistoryChart from '../components/charts/RankHistoryChart';
import GroupedBar from '../components/charts/GroupedBar';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import QueryError from '../components/ui/QueryError';
import FilterPanel from '../components/ui/FilterPanel';
import SectionHeader from '../components/ui/SectionHeader';
import type { WinPctRow, CommonOpponentRow } from '../types/tennis';
import { lastName } from '../utils';
import { CHART } from '../components/charts/theme';
import { pct } from '../lib/compare';
import CompareRow from '../components/sections/compare/CompareRow';
import ComparisonCard from '../components/sections/compare/ComparisonCard';
import PlayerHeroBlock from '../components/sections/compare/PlayerHeroBlock';

const COLOR_A = CHART.clay;
const COLOR_B = CHART.ink;

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [playerA, setPlayerA] = useState(searchParams.get('a') ?? '');
  const [playerB, setPlayerB] = useState(searchParams.get('b') ?? '');
  const [submitted, setSubmitted] = useState(!!(searchParams.get('a') && searchParams.get('b')));

  const { data: players } = usePlayers(tour);

  const handleCompare = () => {
    setSubmitted(true);
    setSearchParams({ a: playerA, b: playerB, tour }, { replace: true });
  };

  const enabled = submitted && !!playerA && !!playerB;
  const paramsA = { player: playerA, tour };
  const paramsB = { player: playerB, tour };

  const { data: sumA, isFetching: lsA, isError: errA, refetch: refetchA } = usePlayerSummary(paramsA, enabled);
  const { data: sumB, isFetching: lsB, isError: errB, refetch: refetchB } = usePlayerSummary(paramsB, enabled);
  const { data: matchA } = usePlayerMatches({ ...paramsA }, enabled);
  const { data: matchB } = usePlayerMatches({ ...paramsB }, enabled);
  const { data: serveA } = usePlayerServeStats(paramsA, enabled);
  const { data: serveB } = usePlayerServeStats(paramsB, enabled);
  const { data: returnA } = usePlayerReturnStats(paramsA, enabled);
  const { data: returnB } = usePlayerReturnStats(paramsB, enabled);
  const { data: servePctA } = usePlayerServePercentiles({ player: playerA, tour }, enabled);
  const { data: servePctB } = usePlayerServePercentiles({ player: playerB, tour }, enabled);
  const { data: returnPctA } = usePlayerReturnPercentiles({ player: playerA, tour }, enabled);
  const { data: returnPctB } = usePlayerReturnPercentiles({ player: playerB, tour }, enabled);
  const { data: topNA } = useTopNRecords(paramsA, enabled);
  const { data: topNB } = useTopNRecords(paramsB, enabled);
  const { data: rankHistA } = useRankHistory(paramsA, enabled);
  const { data: rankHistB } = useRankHistory(paramsB, enabled);
  const { data: commonOpponents } = useCommonOpponents({ player_a: playerA, player_b: playerB, tour }, enabled);

  const isLoading = enabled && (lsA || lsB);

  const surfaceData = (() => {
    if (!matchA || !matchB) return [];
    const surfaces = new Set([
      ...matchA.by_surface.map(r => r.surface ?? ''),
      ...matchB.by_surface.map(r => r.surface ?? ''),
    ]);
    return [...surfaces].filter(Boolean).map(surf => {
      const a = matchA.by_surface.find((r: WinPctRow) => r.surface === surf);
      const b = matchB.by_surface.find((r: WinPctRow) => r.surface === surf);
      return {
        surface: surf,
        [playerA]: a?.win_pct ?? 0,
        [playerB]: b?.win_pct ?? 0,
      };
    });
  })();

  const hasServe = serveA && Object.keys(serveA).length > 0 && serveB && Object.keys(serveB).length > 0;
  const hasReturn = returnA && Object.keys(returnA).length > 0 && returnB && Object.keys(returnB).length > 0;
  const hasServePct = servePctA && Object.keys(servePctA).length > 0;
  const hasReturnPct = returnPctA && Object.keys(returnPctA).length > 0;

  const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);

  return (
    <div className="space-y-10">
      {/* ============ PAGE HEADER ============ */}
      <header className="border-b border-[var(--rule)] pb-4">
        <div className="ba-kicker text-[10px] mb-2">Side-by-side · Profile</div>
        <h1 className="ba-display">
          Player <span className="text-[var(--clay)]">Comparison</span>
        </h1>
      </header>

      {/* ============ FILTER PANEL ============ */}
      <FilterPanel
        kicker="Comparison filters"
        summary={tour === 'M' ? 'ATP' : 'WTA'}
        actions={(
          <button onClick={handleCompare} disabled={!playerA || !playerB} className="ba-btn ba-btn-primary">
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
      </FilterPanel>

      {isLoading && <div className="py-12 flex justify-center"><Spinner /></div>}

      {!isLoading && submitted && sumA && sumB && matchA && matchB && (
        <div className="space-y-10">
          {/* ============ DUAL HERO ============ */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PlayerHeroBlock
              name={playerA}
              winPct={pct(matchA.by_year.reduce((s, r) => s + r.wins, 0), matchA.by_year.reduce((s, r) => s + r.total, 0))}
              record={`${matchA.by_year.reduce((s, r) => s + r.wins, 0)}–${matchA.by_year.reduce((s, r) => s + r.total - r.wins, 0)}`}
              peakRank={sumA.career_high_rank}
              titles={sumA.gs_titles + sumA.tour_titles}
              variant="clay"
            />
            <PlayerHeroBlock
              name={playerB}
              winPct={pct(matchB.by_year.reduce((s, r) => s + r.wins, 0), matchB.by_year.reduce((s, r) => s + r.total, 0))}
              record={`${matchB.by_year.reduce((s, r) => s + r.wins, 0)}–${matchB.by_year.reduce((s, r) => s + r.total - r.wins, 0)}`}
              peakRank={sumB.career_high_rank}
              titles={sumB.gs_titles + sumB.tour_titles}
              variant="ink"
            />
          </section>

          {/* ============ CAREER SUMMARY ============ */}
          <section>
            <SectionHeader title="Career Summary" kicker="Winning cells highlighted" />
            <ComparisonCard playerA={playerA} playerB={playerB}>
              <CompareRow label="W-L" a={`${sumA.wins}-${sumA.losses}`} b={`${sumB.wins}-${sumB.losses}`} better="none" />
              <CompareRow label="Win %" a={`${pct(sumA.wins, sumA.total)}%`} b={`${pct(sumB.wins, sumB.total)}%`} />
              <CompareRow label="Career High" a={sumA.career_high_rank ? `#${sumA.career_high_rank}` : '—'} b={sumB.career_high_rank ? `#${sumB.career_high_rank}` : '—'} better="lower" />
              <CompareRow label="Grand Slams" a={sumA.gs_titles} b={sumB.gs_titles} />
              <CompareRow label="Tour Titles" a={sumA.tour_titles} b={sumB.tour_titles} />
              <CompareRow label="Challenger" a={sumA.challenger_titles} b={sumB.challenger_titles} />
              <CompareRow label="ITF" a={sumA.itf_titles} b={sumB.itf_titles} />
              <CompareRow label="vs Top 10" a={topNA?.top10?.['W-L']} b={topNB?.top10?.['W-L']} better="none" />
              <CompareRow label="vs Top 10 Win %" a={topNA?.top10 ? `${topNA.top10['win%']}%` : '—'} b={topNB?.top10 ? `${topNB.top10['win%']}%` : '—'} />
            </ComparisonCard>
          </section>

          {/* ============ SERVE & RETURN TABLES ============ */}
          {(hasServe || hasReturn) && (
            <section>
              <SectionHeader title="Serve & Return" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {hasServe && (
                  <ComparisonCard title="Serve Stats" playerA={playerA} playerB={playerB}>
                    <CompareRow label="Ace %"       a={fmtPct(serveA['ace%'])}       b={fmtPct(serveB['ace%'])} />
                    <CompareRow label="Double Fault %" a={fmtPct(serveA['df%'])}    b={fmtPct(serveB['df%'])}    better="lower" />
                    <CompareRow label="1st In %"    a={fmtPct(serveA['1st_in%'])}    b={fmtPct(serveB['1st_in%'])} />
                    <CompareRow label="1st Win %"   a={fmtPct(serveA['1st_win%'])}   b={fmtPct(serveB['1st_win%'])} />
                    <CompareRow label="2nd Win %"   a={fmtPct(serveA['2nd_win%'])}   b={fmtPct(serveB['2nd_win%'])} />
                    <CompareRow label="BP Saved %"  a={fmtPct(serveA['bp_saved%'])}  b={fmtPct(serveB['bp_saved%'])} />
                  </ComparisonCard>
                )}
                {hasReturn && (
                  <ComparisonCard title="Return Stats" playerA={playerA} playerB={playerB}>
                    <CompareRow label="1st Ret Win %" a={fmtPct(returnA['1st_return_win%'])} b={fmtPct(returnB['1st_return_win%'])} />
                    <CompareRow label="2nd Ret Win %" a={fmtPct(returnA['2nd_return_win%'])} b={fmtPct(returnB['2nd_return_win%'])} />
                    <CompareRow label="BP Conv %"     a={fmtPct(returnA['bp_converted%'])}   b={fmtPct(returnB['bp_converted%'])} />
                  </ComparisonCard>
                )}
              </div>
            </section>
          )}

          {/* ============ RADARS (percentile overlay) ============ */}
          {(hasServePct || hasReturnPct) && (
            <section>
              <SectionHeader title="Profile Overlay" kicker="Tour percentiles" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {hasServePct && servePctA && servePctB && (
                  <div className="ba-card">
                    <ServeRadarChart
                      percentiles={servePctA}
                      percentilesB={servePctB}
                      labelA={lastName(playerA)}
                      labelB={lastName(playerB)}
                      title="Serve"
                      tour={tour}
                    />
                  </div>
                )}
                {hasReturnPct && returnPctA && returnPctB && (
                  <div className="ba-card">
                    <ReturnRadarChart
                      percentiles={returnPctA}
                      percentilesB={returnPctB}
                      labelA={lastName(playerA)}
                      labelB={lastName(playerB)}
                      title="Return"
                      tour={tour}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ============ RANK HISTORY ============ */}
          {((rankHistA && rankHistA.length > 0) || (rankHistB && rankHistB.length > 0)) && (
            <section>
              <SectionHeader title="Ranking Trajectory" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {rankHistA && rankHistA.length > 0 && (
                  <div className="ba-card">
                    <RankHistoryChart data={rankHistA} careerHigh={sumA.career_high_rank} color={COLOR_A} title={playerA} label={lastName(playerA)} />
                  </div>
                )}
                {rankHistB && rankHistB.length > 0 && (
                  <div className="ba-card">
                    <RankHistoryChart data={rankHistB} careerHigh={sumB.career_high_rank} color={COLOR_B} title={playerB} label={lastName(playerB)} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ============ SURFACE WIN % ============ */}
          {surfaceData.length > 0 && (
            <section>
              <SectionHeader title="Win % by Surface" />
              <div className="ba-card">
                <GroupedBar
                  data={surfaceData}
                  xKey="surface"
                  groups={[
                    { key: playerA, color: COLOR_A },
                    { key: playerB, color: COLOR_B },
                  ]}
                  yLabel="Win %"
                />
              </div>
            </section>
          )}

          {commonOpponents && commonOpponents.opponents.length > 0 && (
            <section>
              <SectionHeader
                title="Common Opponents"
                kicker={`${commonOpponents.summary.common_opponents} shared opponents · ${commonOpponents.summary.a_total_wins}-${commonOpponents.summary.a_total_losses} vs ${commonOpponents.summary.b_total_wins}-${commonOpponents.summary.b_total_losses}`}
              />
              <div className="ba-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--rule)] bg-[var(--bone-2)]">
                        {['Opponent', `${playerA} W-L`, `${playerB} W-L`, 'Combined'].map(h => (
                          <th key={h} className="px-4 py-2 text-left ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--ink)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {commonOpponents.opponents.slice(0, 50).map((r: CommonOpponentRow) => (
                        <tr key={r.opponent_name} className="border-b border-[var(--rule)] last:border-b-0 hover:bg-[var(--bone-3)]">
                          <td className="px-4 py-2 text-[13px] font-medium">
                            <a href={`/player?p=${encodeURIComponent(r.opponent_name)}&tour=${tour}`} className="ba-link">{r.opponent_name}</a>
                          </td>
                          <td className="px-4 py-2 ba-mono text-[12px]">{r.a_wins}-{r.a_losses}</td>
                          <td className="px-4 py-2 ba-mono text-[12px]">{r.b_wins}-{r.b_losses}</td>
                          <td className="px-4 py-2 ba-mono text-[12px] text-[var(--mute)]">{r.total_matches}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {!isLoading && submitted && (errA || errB) && (
        <QueryError
          message="Couldn't load player data. The API may be unavailable."
          onRetry={() => { if (errA) refetchA(); if (errB) refetchB(); }}
        />
      )}
      {!isLoading && submitted && !errA && !errB && (!sumA || !sumB) && (
        <EmptyState title="Comparison unavailable" message="Couldn't load data for both players. Check the names and try again." />
      )}
    </div>
  );
}
