import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  LabelList,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useComebackScatter } from '../hooks';
import Spinner from '../components/ui/Spinner';
import QueryError from '../components/ui/QueryError';
import EmptyState from '../components/ui/EmptyState';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import TourToggle from '../components/filters/TourToggle';
import type { ComebackScatterParams } from '../api/client';
import type { ComebackScatterPoint } from '../types/tennis';

const COHORTS = [
  { value: 'live_top_10', label: 'Live top 10' },
  { value: 'live_top_25', label: 'Live top 25' },
  { value: 'live_top_50', label: 'Live top 50' },
  { value: 'live_top_100', label: 'Live top 100' },
];

const METRIC_GROUPS = [
  {
    label: 'Serve',
    metrics: [
      { value: 'ace_pct', label: 'Ace %' },
      { value: 'df_pct', label: 'DF %' },
      { value: 'first_in_pct', label: '1st serve in %' },
      { value: 'first_win_pct', label: '1st serve win %' },
      { value: 'second_win_pct', label: '2nd serve win %' },
      { value: 'serve_points_won_pct', label: 'Serve points won %' },
      { value: 'bp_saved_pct', label: 'BP saved %' },
      { value: 'tb_played', label: 'TBs played' },
      { value: 'tb_win_pct', label: 'TB win %' },
    ],
  },
  {
    label: 'Return',
    metrics: [
      { value: 'first_return_win_pct', label: '1st return %' },
      { value: 'second_return_win_pct', label: '2nd return %' },
      { value: 'return_points_won_pct', label: 'Return points won %' },
    ],
  },
  {
    label: 'Situations',
    metrics: [
      { value: 'comeback_wins', label: 'Comeback wins' },
      { value: 'upset_wins', label: 'Upset wins' },
      { value: 'upset_losses', label: 'Upset losses' },
      { value: 'bagels_given', label: 'Bagels given' },
      { value: 'bagels_received', label: 'Bagels received' },
      { value: 'breadsticks_given', label: 'Breadsticks given' },
      { value: 'breadsticks_received', label: 'Breadsticks received' },
    ],
  },
];
const METRICS = METRIC_GROUPS.flatMap(group => group.metrics);

const metricLabel = (metric: string) => METRICS.find(m => m.value === metric)?.label ?? metric;
const isPctMetric = (metric: string) => metric.endsWith('_pct');

function formatMetricValue(value: number | null | undefined, metric: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return isPctMetric(metric) ? value.toFixed(1).replace(/\.0$/, '') : String(Math.round(value));
}

function niceUpper(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function metricDomain(values: number[], metric: string): [number, number] {
  const finite = values.filter(v => Number.isFinite(v));
  if (finite.length === 0) return [0, isPctMetric(metric) ? 100 : 10];

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (!isPctMetric(metric)) return [0, niceUpper(max * 1.08)];

  const range = Math.max(max - min, 1);
  const pad = Math.max(2, range * 0.18);
  const lo = Math.max(0, Math.floor((min - pad) / 5) * 5);
  const hi = Math.min(100, Math.ceil((max + pad) / 5) * 5);
  return lo === hi ? [Math.max(0, lo - 5), Math.min(100, hi + 5)] : [lo, hi];
}

type ChartPoint = ComebackScatterPoint & {
  x_value: number;
  y_value: number;
  x_metric?: string;
  y_metric?: string;
};

type LabelProps = {
  x?: number;
  y?: number;
  payload?: ChartPoint;
};

type ShapeProps = {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
};

type ScatterClick = { payload?: ChartPoint };

function metricValue(point: ComebackScatterPoint, metric: string): number {
  const value = point[metric as keyof ComebackScatterPoint];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function PlayerDot({ cx = 0, cy = 0, payload }: ShapeProps) {
  if (!payload) return null;
  if (payload.is_highlight) {
    return <circle cx={cx} cy={cy} r={7.5} fill="var(--clay)" stroke="var(--clay-deep)" strokeWidth={1.4} />;
  }
  if (payload.is_live_top10) {
    return <circle cx={cx} cy={cy} r={5.5} fill="#1d4ed8" stroke="var(--paper)" strokeWidth={1.1} />;
  }
  return <circle cx={cx} cy={cy} r={4.2} fill="#64748b" fillOpacity={0.62} stroke="var(--paper)" strokeWidth={0.8} />;
}

function MedianDot({ cx = 0, cy = 0 }: ShapeProps) {
  return <rect x={cx - 5} y={cy - 5} width={10} height={10} transform={`rotate(45 ${cx} ${cy})`} fill="var(--ink)" stroke="var(--paper)" strokeWidth={1.1} />;
}

function PlayerLabel({ x = 0, y = 0, payload }: LabelProps) {
  if (!payload) return null;
  const isTop10 = payload.is_live_top10;
  const isHighlight = payload.is_highlight;
  const fill = isHighlight ? 'var(--clay-deep)' : isTop10 ? '#1d4ed8' : 'var(--ink)';
  const dy = isTop10 ? -10 : isHighlight ? -12 : 14;
  return (
    <text
      x={x + 8}
      y={y + dy}
      fill={fill}
      fontSize={isTop10 || isHighlight ? 12 : 11}
      fontWeight={isTop10 || isHighlight ? 700 : 500}
      paintOrder="stroke"
      stroke="var(--bone)"
      strokeWidth={4}
      strokeLinejoin="round"
    >
      {payload.player_name}
    </text>
  );
}

function MedianLabel({ x = 0, y = 0, payload }: LabelProps) {
  if (!payload) return null;
  return (
    <text
      x={x + 12}
      y={y - 16}
      fill="var(--ink)"
      fontSize={11}
      fontWeight={700}
      paintOrder="stroke"
      stroke="var(--bone)"
      strokeWidth={4}
      strokeLinejoin="round"
    >
      Median profile
    </text>
  );
}

function SelectedReferenceLabel({ viewBox, value }: { viewBox?: { x?: number; y?: number }; value?: string }) {
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;
  return (
    <text
      x={x}
      y={y - 12}
      textAnchor="middle"
      fill="var(--clay-deep)"
      fontSize={12}
      fontWeight={700}
      paintOrder="stroke"
      stroke="var(--bone)"
      strokeWidth={4}
      strokeLinejoin="round"
    >
      {value}
    </text>
  );
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[12px] shadow-sm">
      <div className="font-semibold text-[var(--ink)]">{p.player_name}</div>
      <div className="ba-mono text-[10px] text-[var(--mute)] mb-1">rank #{p.current_rank} · {p.country}</div>
      <div>{formatMetricValue(p.x_value, p.x_metric ?? '')} {metricLabel(p.x_metric ?? 'x')}</div>
      <div>{formatMetricValue(p.y_value, p.y_metric ?? '')} {metricLabel(p.y_metric ?? 'y')}</div>
    </div>
  );
}

export function MetricScatterSection() {
  const [tour, setTour] = useState('F');
  const [cohort, setCohort] = useState('live_top_100');
  const [yearMin, setYearMin] = useState('2023');
  const [yearMax, setYearMax] = useState('');
  const [surface, setSurface] = useState('All');
  const [level, setLevel] = useState('All Tour');
  const [xMetric, setXMetric] = useState('ace_pct');
  const [yMetric, setYMetric] = useState('serve_points_won_pct');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [params, setParams] = useState<ComebackScatterParams>({
    tour: 'F',
    cohort: 'live_top_100',
    year_min: 2023,
    surface: undefined as string | undefined,
    level: 'All Tour' as string | undefined,
    x_metric: 'ace_pct',
    y_metric: 'serve_points_won_pct',
  });

  const applyFilters = (event?: React.FormEvent) => {
    event?.preventDefault();
    setSelectedPlayer(null);
    setParams({
      tour,
      cohort,
      year_min: Number(yearMin) || 2023,
      year_max: yearMax ? Number(yearMax) : undefined,
      surface: surface === 'All' ? undefined : surface,
      level: level || undefined,
      x_metric: xMetric,
      y_metric: yMetric,
    });
    setSubmitted(true);
  };

  const [submitted, setSubmitted] = useState(false);
  const { data, isFetching, isError, refetch } = useComebackScatter(params, submitted);
  const points = data?.points ?? [];

  const chartPoints = useMemo<ChartPoint[]>(() => points.map(p => ({
    ...p,
    is_highlight: selectedPlayer === p.player_name,
    x_value: metricValue(p, xMetric),
    y_value: metricValue(p, yMetric),
    x_metric: xMetric,
    y_metric: yMetric,
  })), [points, selectedPlayer, xMetric, yMetric]);

  const normal = chartPoints.filter(p => !p.is_live_top10 && !p.is_highlight);
  const liveTop10 = chartPoints.filter(p => p.is_live_top10 && !p.is_highlight);
  const highlighted = chartPoints.filter(p => p.is_highlight);
  const selectedPoint = highlighted[0];
  const xDomain = metricDomain(chartPoints.map(p => p.x_value), xMetric);
  const yDomain = metricDomain(chartPoints.map(p => p.y_value), yMetric);
  const medianX = data?.meta.median[xMetric];
  const medianY = data?.meta.median[yMetric];
  const medianPoint = typeof medianX === 'number' && typeof medianY === 'number'
    ? [{
        player_name: 'Median profile',
        current_rank: 0,
        country: null,
        total_matches: 0,
        total_wins: 0,
        ace_pct: null,
        df_pct: null,
        first_in_pct: null,
        first_win_pct: null,
        second_win_pct: null,
        serve_points_won_pct: null,
        bp_saved_pct: null,
        tb_played: 0,
        tb_win_pct: null,
        first_return_win_pct: null,
        second_return_win_pct: null,
        return_points_won_pct: null,
        comeback_wins: 0,
        upset_wins: 0,
        upset_losses: 0,
        bagels_given: 0,
        bagels_received: 0,
        breadsticks_given: 0,
        breadsticks_received: 0,
        is_live_top10: false,
        is_highlight: false,
        is_top10_comebacker: false,
        x_value: medianX,
        y_value: medianY,
      } satisfies ChartPoint]
    : [];

  const handlePointClick = (point: unknown) => {
    const payload = (point as ScatterClick).payload;
    if (payload?.player_name) setSelectedPlayer(payload.player_name);
  };

  return (
      <section className="ba-card space-y-4">
        <form onSubmit={applyFilters} className="space-y-4 border-b border-[var(--rule)] pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="ba-kicker text-[10px] mb-1">Scatter · Player Summaries</div>
              <h2 className="ba-h2">Metric <span className="text-[var(--clay)]">Scatter</span></h2>
            </div>
            <button type="submit" className="ba-btn ba-btn-primary">Update chart</button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="ba-kicker">Tour</label>
              <TourToggle value={tour} onChange={v => { setTour(v); setLevel('All Tour'); setSurface('All'); }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ba-kicker">Cohort</label>
              <select value={cohort} onChange={e => setCohort(e.target.value)} className="ba-select text-sm px-2 py-1.5">
                {COHORTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <SurfaceSelect value={surface} onChange={setSurface} />
            <LevelSelect tour={tour} value={level} onChange={setLevel} />
            <div className="flex flex-col gap-1">
              <label className="ba-kicker">Years</label>
              <div className="flex items-center gap-2">
                <input value={yearMin} onChange={e => setYearMin(e.target.value)} className="ba-input w-24" inputMode="numeric" aria-label="Start year" />
                <span className="text-[var(--mute)]">–</span>
                <input value={yearMax} onChange={e => setYearMax(e.target.value)} className="ba-input w-24" inputMode="numeric" placeholder="now" aria-label="End year" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
            <div className="flex flex-col gap-1">
              <label className="ba-kicker">X-axis</label>
              <select value={xMetric} onChange={e => setXMetric(e.target.value)} className="ba-select text-sm px-2 py-1.5">
                {METRIC_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.metrics.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="ba-kicker">Y-axis</label>
              <select value={yMetric} onChange={e => setYMetric(e.target.value)} className="ba-select text-sm px-2 py-1.5">
                {METRIC_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.metrics.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </form>

        {isFetching && <div className="py-16 flex justify-center"><Spinner /></div>}
        {!isFetching && isError && <QueryError message="Couldn't load analysis chart." onRetry={() => refetch()} />}
        {!isFetching && data && points.length === 0 && <EmptyState message="No players found for this cohort." />}

        {!isFetching && data && chartPoints.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-[12px] text-[var(--ink-2)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#64748b] opacity-70 ring-1 ring-white" />
                Live #11+
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8] ring-1 ring-white" />
                Live top 10
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rotate-45 bg-[var(--ink)] ring-1 ring-white" />
                Median profile
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[var(--clay)] ring-1 ring-[var(--clay-deep)]" />
                Selected
              </span>
            </div>
            <div className="h-[590px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 32, right: 34, bottom: 44, left: 12 }}>
                  <CartesianGrid stroke="var(--rule)" strokeOpacity={0.7} vertical={false} />
                  <XAxis
                    type="number"
                    dataKey="x_value"
                    name={metricLabel(xMetric)}
                    domain={xDomain}
                    tick={{ fill: 'var(--ink-2)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--rule)' }}
                    tickLine={false}
                    label={{ value: metricLabel(xMetric), position: 'insideBottom', offset: -26, fill: 'var(--ink-2)' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y_value"
                    name={metricLabel(yMetric)}
                    domain={yDomain}
                    tick={{ fill: 'var(--ink-2)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--rule)' }}
                    tickLine={false}
                    label={{ value: metricLabel(yMetric), angle: -90, position: 'insideLeft', fill: 'var(--ink-2)' }}
                  />
                  <ZAxis range={[40, 40]} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--rule)', strokeDasharray: '4 4' }} />

                  {typeof medianX === 'number' && <ReferenceLine x={medianX} stroke="var(--rule-strong)" strokeDasharray="4 4" />}
                  {typeof medianY === 'number' && <ReferenceLine y={medianY} stroke="var(--rule-strong)" strokeDasharray="4 4" />}

                  <Scatter name="Live #11+" data={normal} shape={<PlayerDot />} onClick={handlePointClick} isAnimationActive={false} />
                  <Scatter name="Live top 10" data={liveTop10} shape={<PlayerDot />} onClick={handlePointClick} isAnimationActive={false}>
                    <LabelList content={<PlayerLabel />} />
                  </Scatter>
                  <Scatter name="Selected" data={highlighted} shape={<PlayerDot />} onClick={handlePointClick} isAnimationActive={false} />
                  {selectedPoint && (
                    <ReferenceDot
                      x={selectedPoint.x_value}
                      y={selectedPoint.y_value}
                      r={0}
                      ifOverflow="extendDomain"
                      label={<SelectedReferenceLabel value={selectedPoint.player_name} />}
                    />
                  )}
                  <Scatter name="Median profile" data={medianPoint} shape={<MedianDot />} isAnimationActive={false}>
                    <LabelList content={<MedianLabel />} />
                  </Scatter>

                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-3 text-[12px] text-[var(--mute)]">
              <span>
                Source: {data.meta.source}. {data.meta.level || 'All levels'}{data.meta.surface ? ` · ${data.meta.surface}` : ''}. Click a point to highlight it.
              </span>
              <span className="ba-mono">
                Median: {formatMetricValue(medianX, xMetric)} {metricLabel(xMetric)} · {formatMetricValue(medianY, yMetric)} {metricLabel(yMetric)}
              </span>
            </div>
          </>
        )}
      </section>
  );
}

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="ba-kicker">Analysis · Chart builder</div>
        <h1 className="ba-display text-[42px] leading-none tracking-tight">
          Summary <span className="text-[var(--clay)]">charts</span>
        </h1>
        <p className="max-w-3xl text-[var(--ink-2)]">
          Choose a live-ranked cohort and map two player-level metrics against each other.
        </p>
      </header>
      <MetricScatterSection />
    </div>
  );
}
