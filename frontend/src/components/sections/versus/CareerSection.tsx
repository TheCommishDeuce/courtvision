import { Link } from 'react-router-dom';
import {
  useCommonOpponents,
  usePlayerMatches,
  usePlayerReturnPercentiles,
  usePlayerReturnStats,
  usePlayerServePercentiles,
  usePlayerServeStats,
  usePlayerSummary,
  useRankHistory,
  useTopNRecords,
} from '../../../hooks';
import AdaptiveTable, { type Column } from '../../primitives/AdaptiveTable';
import SectionHeader from '../../primitives/SectionHeader';
import Spinner from '../../primitives/Spinner';
import QueryError from '../../primitives/QueryError';
import EmptyState from '../../primitives/EmptyState';
import ServeRadarChart from '../../charts/ServeRadarChart';
import ReturnRadarChart from '../../charts/ReturnRadarChart';
import RankHistoryChart from '../../charts/RankHistoryChart';
import GroupedBar from '../../charts/GroupedBar';
import CompareRow from '../compare/CompareRow';
import ComparisonCard from '../compare/ComparisonCard';
import PlayerHeroBlock from '../compare/PlayerHeroBlock';
import { CHART } from '../../charts/theme';
import { pct } from '../../../domain/compare';
import { lastName } from '../../../utils';
import type { CommonOpponentRow, WinPctRow } from '../../../types/tennis';
import { playerParams, type VersusFilters } from './filters';

const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);

export default function CareerSection({ f }: { f: VersusFilters }) {
  const paramsA = playerParams(f, f.a!);
  const paramsB = playerParams(f, f.b!);
  const pctParamsA = { player: f.a!, tour: f.tour };
  const pctParamsB = { player: f.b!, tour: f.tour };
  const on = f.enabled;

  const { data: sumA, isFetching: loadA, isError: errA, refetch: retryA } = usePlayerSummary(paramsA, on);
  const { data: sumB, isFetching: loadB, isError: errB, refetch: retryB } = usePlayerSummary(paramsB, on);
  const { data: matchA } = usePlayerMatches(paramsA, on);
  const { data: matchB } = usePlayerMatches(paramsB, on);
  const { data: serveA } = usePlayerServeStats(paramsA, on);
  const { data: serveB } = usePlayerServeStats(paramsB, on);
  const { data: returnA } = usePlayerReturnStats(paramsA, on);
  const { data: returnB } = usePlayerReturnStats(paramsB, on);
  const { data: servePctA } = usePlayerServePercentiles(pctParamsA, on);
  const { data: servePctB } = usePlayerServePercentiles(pctParamsB, on);
  const { data: returnPctA } = usePlayerReturnPercentiles(pctParamsA, on);
  const { data: returnPctB } = usePlayerReturnPercentiles(pctParamsB, on);
  const { data: topNA } = useTopNRecords(paramsA, on);
  const { data: topNB } = useTopNRecords(paramsB, on);
  const { data: rankA } = useRankHistory(paramsA, on);
  const { data: rankB } = useRankHistory(paramsB, on);
  const { data: common } = useCommonOpponents(
    { player_a: f.a!, player_b: f.b!, tour: f.tour },
    on,
  );

  if (!on) return null;
  if (errA || errB) {
    return (
      <QueryError
        title="Career data did not load"
        message="One or both player profiles failed to load. Retry, or check the names."
        onRetry={() => {
          if (errA) retryA();
          if (errB) retryB();
        }}
      />
    );
  }
  if ((loadA || loadB) && (!sumA || !sumB)) return <Spinner />;
  if (!sumA || !sumB || !matchA || !matchB) {
    return (
      <EmptyState
        title="Career comparison unavailable"
        message="Couldn't load a profile for both players. Check the spelling of each name."
      />
    );
  }

  const totals = (m: typeof matchA) => {
    const wins = m.by_year.reduce((s, r) => s + r.wins, 0);
    const total = m.by_year.reduce((s, r) => s + r.total, 0);
    return { wins, losses: total - wins, total };
  };
  const tA = totals(matchA);
  const tB = totals(matchB);

  const surfaces = [
    ...new Set([
      ...matchA.by_surface.map(r => r.surface ?? ''),
      ...matchB.by_surface.map(r => r.surface ?? ''),
    ]),
  ].filter(Boolean);

  const surfaceData = surfaces.map(surf => ({
    surface: surf,
    [f.a!]: matchA.by_surface.find((r: WinPctRow) => r.surface === surf)?.win_pct ?? 0,
    [f.b!]: matchB.by_surface.find((r: WinPctRow) => r.surface === surf)?.win_pct ?? 0,
  }));

  const hasServe = !!serveA && !!serveB && Object.keys(serveA).length > 0 && Object.keys(serveB).length > 0;
  const hasReturn = !!returnA && !!returnB && Object.keys(returnA).length > 0 && Object.keys(returnB).length > 0;
  const hasServePct = !!servePctA && !!servePctB && Object.keys(servePctA).length > 0;
  const hasReturnPct = !!returnPctA && !!returnPctB && Object.keys(returnPctA).length > 0;

  const oppColumns: Column<CommonOpponentRow>[] = [
    {
      key: 'opponent_name',
      header: 'Opponent',
      hideOnCard: true,
      cell: r => (
        <Link
          to={`/player?p=${encodeURIComponent(r.opponent_name)}&tour=${f.tour}`}
          className="font-medium whitespace-nowrap text-ink hover:text-clay-deep"
        >
          {r.opponent_name}
        </Link>
      ),
    },
    {
      key: 'a',
      header: `${lastName(f.a!)} W–L`,
      num: true,
      cell: r => <span className="text-clay font-semibold">{r.a_wins}–{r.a_losses}</span>,
    },
    {
      key: 'b',
      header: `${lastName(f.b!)} W–L`,
      num: true,
      cell: r => <span className="text-ink font-semibold">{r.b_wins}–{r.b_losses}</span>,
    },
    {
      key: 'total_matches',
      header: 'Matches',
      num: true,
      cell: r => <span className="text-mute">{r.total_matches}</span>,
    },
  ];

  return (
    <section id="careers" className="space-y-5">
      <SectionHeader
        title="The two careers"
        kicker={
          f.level
            ? 'Follows surface and years · the level filter applies to the head-to-head only'
            : 'Follows the filters above'
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PlayerHeroBlock
          name={f.a!}
          tour={f.tour}
          winPct={pct(tA.wins, tA.total)}
          record={`${tA.wins}–${tA.losses}`}
          peakRank={sumA.career_high_rank}
          titles={sumA.gs_titles + sumA.tour_titles}
          variant="clay"
        />
        <PlayerHeroBlock
          name={f.b!}
          tour={f.tour}
          winPct={pct(tB.wins, tB.total)}
          record={`${tB.wins}–${tB.losses}`}
          peakRank={sumB.career_high_rank}
          titles={sumB.gs_titles + sumB.tour_titles}
          variant="ink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <ComparisonCard title="Career" playerA={f.a!} playerB={f.b!}>
          <CompareRow label="W–L" a={`${sumA.wins}–${sumA.losses}`} b={`${sumB.wins}–${sumB.losses}`} better="none" />
          <CompareRow label="Win %" a={`${pct(sumA.wins, sumA.total)}%`} b={`${pct(sumB.wins, sumB.total)}%`} />
          <CompareRow label="Peak rank" a={sumA.career_high_rank ? `#${sumA.career_high_rank}` : '—'} b={sumB.career_high_rank ? `#${sumB.career_high_rank}` : '—'} better="lower" />
          <CompareRow label="Grand slams" a={sumA.gs_titles} b={sumB.gs_titles} />
          <CompareRow label="Tour titles" a={sumA.tour_titles} b={sumB.tour_titles} />
          <CompareRow label="Challenger" a={sumA.challenger_titles} b={sumB.challenger_titles} />
          <CompareRow label="ITF" a={sumA.itf_titles} b={sumB.itf_titles} />
          <CompareRow label="vs top 10" a={topNA?.top10?.['W-L']} b={topNB?.top10?.['W-L']} better="none" />
          <CompareRow label="vs top 10 win %" a={topNA?.top10 ? `${topNA.top10['win%']}%` : '—'} b={topNB?.top10 ? `${topNB.top10['win%']}%` : '—'} />
        </ComparisonCard>

        <div className="space-y-3">
          {hasServe && (
            <ComparisonCard title="Serve" playerA={f.a!} playerB={f.b!}>
              <CompareRow label="Ace %" a={fmtPct(serveA['ace%'])} b={fmtPct(serveB['ace%'])} />
              <CompareRow label="Double fault %" a={fmtPct(serveA['df%'])} b={fmtPct(serveB['df%'])} better="lower" />
              <CompareRow label="1st in %" a={fmtPct(serveA['1st_in%'])} b={fmtPct(serveB['1st_in%'])} />
              <CompareRow label="1st won %" a={fmtPct(serveA['1st_win%'])} b={fmtPct(serveB['1st_win%'])} />
              <CompareRow label="2nd won %" a={fmtPct(serveA['2nd_win%'])} b={fmtPct(serveB['2nd_win%'])} />
              <CompareRow label="BP saved %" a={fmtPct(serveA['bp_saved%'])} b={fmtPct(serveB['bp_saved%'])} />
            </ComparisonCard>
          )}
          {hasReturn && (
            <ComparisonCard title="Return" playerA={f.a!} playerB={f.b!}>
              <CompareRow label="1st return won %" a={fmtPct(returnA['1st_return_win%'])} b={fmtPct(returnB['1st_return_win%'])} />
              <CompareRow label="2nd return won %" a={fmtPct(returnA['2nd_return_win%'])} b={fmtPct(returnB['2nd_return_win%'])} />
              <CompareRow label="BP converted %" a={fmtPct(returnA['bp_converted%'])} b={fmtPct(returnB['bp_converted%'])} />
            </ComparisonCard>
          )}
        </div>
      </div>

      {(hasServePct || hasReturnPct) && (
        <div>
          <SectionHeader level="sub" title="Profile overlay" kicker="Tour percentiles" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {hasServePct && (
              <div className="ba-card">
                <ServeRadarChart
                  percentiles={servePctA}
                  percentilesB={servePctB}
                  labelA={lastName(f.a!)}
                  labelB={lastName(f.b!)}
                  title="Serve"
                  tour={f.tour}
                />
              </div>
            )}
            {hasReturnPct && (
              <div className="ba-card">
                <ReturnRadarChart
                  percentiles={returnPctA}
                  percentilesB={returnPctB}
                  labelA={lastName(f.a!)}
                  labelB={lastName(f.b!)}
                  title="Return"
                  tour={f.tour}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {((rankA && rankA.length > 0) || (rankB && rankB.length > 0)) && (
        <div>
          <SectionHeader level="sub" title="Ranking trajectory" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rankA && rankA.length > 0 && (
              <div className="ba-card">
                <RankHistoryChart data={rankA} careerHigh={sumA.career_high_rank} color={CHART.clay} title={f.a!} label={lastName(f.a!)} />
              </div>
            )}
            {rankB && rankB.length > 0 && (
              <div className="ba-card">
                <RankHistoryChart data={rankB} careerHigh={sumB.career_high_rank} color={CHART.ink} title={f.b!} label={lastName(f.b!)} />
              </div>
            )}
          </div>
        </div>
      )}

      {surfaceData.length > 0 && (
        <div>
          <SectionHeader level="sub" title="Win % by surface" />
          <div className="ba-card">
            <GroupedBar
              data={surfaceData}
              xKey="surface"
              groups={[
                { key: f.a!, color: CHART.clay, label: lastName(f.a!) },
                { key: f.b!, color: CHART.ink, label: lastName(f.b!) },
              ]}
              yLabel="Win %"
            />
          </div>
        </div>
      )}

      {common && common.opponents.length > 0 && (
        <div>
          <SectionHeader
            level="sub"
            title="Common opponents"
            kicker={`${common.summary.common_opponents} shared · ${common.summary.a_total_wins}–${common.summary.a_total_losses} vs ${common.summary.b_total_wins}–${common.summary.b_total_losses}`}
          />
          <AdaptiveTable
            rows={common.opponents}
            columns={oppColumns}
            rowKey={r => r.opponent_name}
            density="dense"
            cardTitle={r => r.opponent_name}
            pageSize={50}
            unit="opponents"
          />
        </div>
      )}
    </section>
  );
}
