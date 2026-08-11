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
import { useComebackScatter } from '../../../hooks';
import Spinner from '../../ui/Spinner';
import QueryError from '../../ui/QueryError';
import EmptyState from '../../ui/EmptyState';
import SectionHeader from '../../ui/SectionHeader';
import { CHART, GRID_PROPS, monoTick, TOOLTIP_CLASS } from '../../charts/theme';
import type { ComebackScatterPoint } from '../../../types/tennis';
import type { RecordsFilters } from './sources';

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
      { value: 'df_pct', label: 'Double fault %' },
      { value: 'first_in_pct', label: '1st serve in %' },
      { value: 'first_win_pct', label: '1st serve won %' },
      { value: 'second_win_pct', label: '2nd serve won %' },
      { value: 'serve_points_won_pct', label: 'Serve points won %' },
      { value: 'bp_saved_pct', label: 'BP saved %' },
      { value: 'tb_played', label: 'Tiebreaks played' },
      { value: 'tb_win_pct', label: 'Tiebreak win %' },
    ],
  },
  {
    label: 'Return',
    metrics: [
      { value: 'first_return_win_pct', label: '1st return won %' },
      { value: 'second_return_win_pct', label: '2nd return won %' },
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
const METRICS = METRIC_GROUPS.flatMap(g => g.metrics);

const metricLabel = (metric: string) => METRICS.find(m => m.value === metric)?.label ?? metric;
const isPctMetric = (metric: string) => metric.endsWith('_pct');

function formatMetricValue(value: number | null | undefined, metric: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
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

type LabelProps = { x?: number; y?: number; value?: string | number };
type ShapeProps = { cx?: number; cy?: number; payload?: ChartPoint };
type TooltipProps = { active?: boolean; payload?: Array<{ payload: ChartPoint }> };
type ScatterClick = { payload?: ChartPoint };

function metricValue(point: ComebackScatterPoint, metric: string): number {
  const value = point[metric as keyof ComebackScatterPoint];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Three marks, distinguished by size and shape as well as tone, so the chart
 * still reads if you can't separate the greys: small open grey for the field,
 * solid ink for the live top ten, clay for the point you clicked, and an ink
 * diamond for the cohort median.
 */
function PlayerDot({ cx = 0, cy = 0, payload }: ShapeProps) {
  if (!payload) return null;
  if (payload.is_highlight) {
    return <circle cx={cx} cy={cy} r={6} fill={CHART.clay} stroke={CHART.paper} strokeWidth={1.5} />;
  }
  if (payload.is_live_top10) {
    return <circle cx={cx} cy={cy} r={4} fill={CHART.ink} stroke={CHART.paper} strokeWidth={1} />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="none" stroke={CHART.mute} strokeWidth={1} />;
}

function MedianDot({ cx = 0, cy = 0 }: ShapeProps) {
  return (
    <rect
      x={cx - 4.5}
      y={cy - 4.5}
      width={9}
      height={9}
      transform={`rotate(45 ${cx} ${cy})`}
      fill={CHART.paper}
      stroke={CHART.ink}
      strokeWidth={1.5}
    />
  );
}

function haloText(fill: string, weight: number, size: number) {
  return {
    fill,
    fontSize: size,
    fontWeight: weight,
    fontFamily: 'Inter, sans-serif',
    paintOrder: 'stroke' as const,
    stroke: 'var(--paper)',
    strokeWidth: 4,
    strokeLinejoin: 'round' as const,
  };
}

/**
 * LabelList hands its content `value` (from `dataKey`) rather than the row —
 * `payload` is undefined for Scatter, which is why these labels have to read
 * `value`.
 */
function PlayerLabel({ x = 0, y = 0, value }: LabelProps) {
  if (!value) return null;
  return (
    <text x={x + 7} y={y - 7} {...haloText(CHART.ink, 600, 10.5)}>
      {value}
    </text>
  );
}

function MedianLabel({ x = 0, y = 0 }: LabelProps) {
  return (
    <text x={x + 9} y={y - 10} {...haloText(CHART.ink, 700, 9.5)}>
      Median
    </text>
  );
}

function SelectedLabel({ viewBox, value }: { viewBox?: { x?: number; y?: number }; value?: string }) {
  return (
    <text
      x={viewBox?.x ?? 0}
      y={(viewBox?.y ?? 0) - 12}
      textAnchor="middle"
      {...haloText('var(--clay-deep)', 700, 12)}
    >
      {value}
    </text>
  );
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className={TOOLTIP_CLASS}>
      <div className="font-semibold text-[var(--ink)]">{p.player_name}</div>
      <div className="ba-mono ba-agate text-[var(--mute)] mb-1">
        rank #{p.current_rank}
        {p.country ? ` · ${p.country}` : ''}
      </div>
      <div className="ba-mono ba-meta">
        {formatMetricValue(p.x_value, p.x_metric ?? '')} {metricLabel(p.x_metric ?? 'x')}
      </div>
      <div className="ba-mono ba-meta">
        {formatMetricValue(p.y_value, p.y_metric ?? '')} {metricLabel(p.y_metric ?? 'y')}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="ba-label inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <circle cx="5" cy="5" r="3" fill="none" stroke={CHART.mute} />
        </svg>
        Rest of cohort
      </span>
      <span className="ba-label inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill={CHART.ink} />
        </svg>
        Live top 10
      </span>
      <span className="ba-label inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" fill="none" stroke={CHART.ink} strokeWidth="1.5" />
        </svg>
        Cohort median
      </span>
      <span className="ba-label inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill={CHART.clay} />
        </svg>
        Selected
      </span>
    </div>
  );
}

export default function MetricScatter({ filters }: { filters: RecordsFilters }) {
  const [cohort, setCohort] = useState('live_top_100');
  const [xMetric, setXMetric] = useState('ace_pct');
  const [yMetric, setYMetric] = useState('serve_points_won_pct');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Same rule as the extremes table above: the reader picks the cohort and the
  // two axes, then asks for the chart. Nothing fires on mount.
  const [submitted, setSubmitted] = useState(false);
  const chartKey = [
    cohort, xMetric, yMetric, filters.tour, filters.surface, filters.level,
    filters.yearRange[0], filters.yearRange[1],
  ].join('|');
  const [drawnKey, setDrawnKey] = useState('');
  const stale = submitted && drawnKey !== chartKey;

  const { data, isFetching, isError, refetch } = useComebackScatter(
    {
      tour: filters.tour,
      cohort,
      year_min: filters.yearRange[0],
      year_max: filters.yearRange[1],
      surface: filters.surface === 'All' ? undefined : filters.surface,
      level: filters.level || undefined,
      x_metric: xMetric,
      y_metric: yMetric,
    },
    submitted && !stale,
  );

  const draw = () => {
    setSelectedPlayer(null);
    setDrawnKey(chartKey);
    setSubmitted(true);
  };

  const points = useMemo(() => data?.points ?? [], [data?.points]);

  const chartPoints = useMemo<ChartPoint[]>(
    () =>
      points.map(p => ({
        ...p,
        is_highlight: selectedPlayer === p.player_name,
        x_value: metricValue(p, xMetric),
        y_value: metricValue(p, yMetric),
        x_metric: xMetric,
        y_metric: yMetric,
      })),
    [points, selectedPlayer, xMetric, yMetric],
  );

  const normal = chartPoints.filter(p => !p.is_live_top10 && !p.is_highlight);
  const liveTop10 = chartPoints.filter(p => p.is_live_top10 && !p.is_highlight);
  const highlighted = chartPoints.filter(p => p.is_highlight);
  const selectedPoint = highlighted[0];
  const xDomain = metricDomain(chartPoints.map(p => p.x_value), xMetric);
  const yDomain = metricDomain(chartPoints.map(p => p.y_value), yMetric);
  const medianX = data?.meta.median[xMetric];
  const medianY = data?.meta.median[yMetric];

  const medianPoint =
    typeof medianX === 'number' && typeof medianY === 'number'
      ? [{ player_name: 'Median', x_value: medianX, y_value: medianY } as unknown as ChartPoint]
      : [];

  const handlePointClick = (point: unknown) => {
    const payload = (point as ScatterClick).payload;
    if (payload?.player_name) {
      setSelectedPlayer(prev => (prev === payload.player_name ? null : payload.player_name));
    }
  };

  const metricSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <label className="flex flex-col gap-0.5 min-w-0 flex-1">
      <span className="ba-label">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="ba-select w-full">
        {METRIC_GROUPS.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.metrics.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );

  return (
    <section>
      <SectionHeader
        title="Metric scatter"
        kicker="Two player metrics against each other · click a point to name it"
      />

      <div className="ba-well border-t-2 border-t-[var(--rule-ink)] px-3 py-2.5 mb-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex flex-col gap-0.5 sm:w-40">
            <span className="ba-label">Cohort</span>
            <select value={cohort} onChange={e => setCohort(e.target.value)} className="ba-select w-full">
              {COHORTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          {metricSelect('Horizontal axis', xMetric, setXMetric)}
          {metricSelect('Vertical axis', yMetric, setYMetric)}
          <button
            type="button"
            onClick={draw}
            className="ba-btn ba-btn-primary self-end sm:mb-0"
          >
            {submitted && !stale ? 'Draw again' : 'Draw chart'}
          </button>
        </div>
      </div>

      {!submitted ? (
        <EmptyState
          title="Choose two metrics"
          message="Pick a cohort and the two axes above, then select Draw chart."
        />
      ) : stale ? (
        <EmptyState
          title="Selection changed"
          message="Select Draw chart to plot the new cohort or metrics."
        />
      ) : isError ? (
        <QueryError
          title="The scatter did not load"
          message="The request failed. Retry, or pick a smaller cohort."
          onRetry={() => refetch()}
        />
      ) : isFetching && points.length === 0 ? (
        <Spinner />
      ) : points.length === 0 ? (
        <EmptyState
          title="No players in this cohort"
          message="Widen the year range, or choose a larger cohort."
        />
      ) : (
        <>
          <div className="flex justify-end mb-1"><Legend /></div>
          <div className="h-[520px] w-full border border-[var(--rule)] border-t-2 border-t-[var(--rule-ink)] bg-[var(--paper-raised)] pt-3 pr-3">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 18, right: 24, bottom: 42, left: 8 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  type="number"
                  dataKey="x_value"
                  name={metricLabel(xMetric)}
                  domain={xDomain}
                  tick={monoTick(10, CHART.tickMute)}
                  tickLine={false}
                  axisLine={{ stroke: CHART.axis }}
                  label={{
                    value: metricLabel(xMetric),
                    position: 'insideBottom',
                    offset: -24,
                    fontSize: 10,
                    fill: CHART.tickMute,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y_value"
                  name={metricLabel(yMetric)}
                  domain={yDomain}
                  tick={monoTick(10, CHART.tickMute)}
                  tickLine={false}
                  axisLine={{ stroke: CHART.axis }}
                  width={44}
                  label={{
                    value: metricLabel(yMetric),
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fill: CHART.tickMute,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />

                {typeof medianX === 'number' && <ReferenceLine x={medianX} stroke={CHART.axis} strokeDasharray="3 3" />}
                {typeof medianY === 'number' && <ReferenceLine y={medianY} stroke={CHART.axis} strokeDasharray="3 3" />}

                <Scatter name="Rest of cohort" data={normal} shape={<PlayerDot />} onClick={handlePointClick} isAnimationActive={false} />
                <Scatter name="Live top 10" data={liveTop10} shape={<PlayerDot />} onClick={handlePointClick} isAnimationActive={false}>
                  <LabelList dataKey="player_name" content={<PlayerLabel />} />
                </Scatter>
                <Scatter name="Selected" data={highlighted} shape={<PlayerDot />} onClick={handlePointClick} isAnimationActive={false} />
                {selectedPoint && (
                  <ReferenceDot
                    x={selectedPoint.x_value}
                    y={selectedPoint.y_value}
                    r={0}
                    ifOverflow="extendDomain"
                    label={<SelectedLabel value={selectedPoint.player_name} />}
                  />
                )}
                <Scatter name="Median" data={medianPoint} shape={<MedianDot />} isAnimationActive={false}>
                  <LabelList dataKey="player_name" content={<MedianLabel />} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-[var(--rule)] mt-2 pt-2">
            <span className="ba-kicker">
              {data?.meta.source}
              {data?.meta.level ? ` · ${data.meta.level}` : ' · all levels'}
              {data?.meta.surface ? ` · ${data.meta.surface}` : ''}
            </span>
            <span className="ba-mono ba-agate text-[var(--mute)]">
              Median {formatMetricValue(medianX, xMetric)} {metricLabel(xMetric)} ·{' '}
              {formatMetricValue(medianY, yMetric)} {metricLabel(yMetric)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
