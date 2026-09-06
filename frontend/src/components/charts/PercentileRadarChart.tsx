import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { CHART, TOOLTIP_STYLE, LEGEND_STYLE, monoTick, LINE_WIDTH, CHART_FS } from './theme';
import AdaptiveTable from '../primitives/AdaptiveTable';

interface Props<T extends { tour_size?: number }> {
  percentiles: T;
  percentilesB?: T;
  subjects: { key: keyof T; label: string }[];
  labelA?: string;
  labelB?: string;
  title?: string;
}

export default function PercentileRadarChart<T extends { tour_size?: number }>({
  percentiles,
  percentilesB,
  subjects,
  labelA = 'Player A',
  labelB = 'Player B',
  title,
}: Props<T>) {
  const data = subjects.map(s => ({
    subject: s.label,
    A: (percentiles[s.key] as number | null | undefined) ?? null,
    B: percentilesB ? ((percentilesB[s.key] as number | null | undefined) ?? null) : undefined,
  }));
  const hasMissing = data.some(row => row.A == null || (percentilesB && row.B == null));
  const format = (value: number | null | undefined) => value == null ? '—' : `${Math.round(value)}th pct`;
  const tourSize = percentiles.tour_size;

  return (
    <div>
      {title && <h3 className="ba-h3 mb-2">{title}</h3>}
      {hasMissing ? (
        <>
          {/* Recharts maps null radar radii to zero. Keep available metrics in a
              table rather than draw a misleading polygon for a partial profile. */}
          <p className="ba-kicker mb-2">Missing metrics are unranked, not zero.</p>
          <AdaptiveTable
            rows={data}
            columns={[
              { key: 'subject', header: 'Metric', cell: row => row.subject, hideOnCard: true },
              { key: 'A', header: labelA, num: true, cell: row => format(row.A) },
              ...(percentilesB ? [{ key: 'B', header: labelB, num: true, cell: (row: typeof data[number]) => format(row.B) }] : []),
            ]}
            rowKey={row => row.subject}
            cardTitle={row => row.subject}
            density="agate"
          />
        </>
      ) : (
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 6, left: 30 }}>
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis dataKey="subject" tick={monoTick(CHART_FS.tick, CHART.tickMute)} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={labelA}
            dataKey="A"
            stroke={CHART.clay}
            fill={CHART.clay}
            fillOpacity={0.16}
            strokeWidth={LINE_WIDTH}
            isAnimationActive={false}
          />
          {percentilesB && (
            <Radar
              name={labelB}
              dataKey="B"
              stroke={CHART.ink}
              fill={CHART.ink}
              fillOpacity={0.08}
              strokeWidth={LINE_WIDTH}
              isAnimationActive={false}
            />
          )}
          <Legend wrapperStyle={LEGEND_STYLE} iconType="square" iconSize={8} />
          <Tooltip formatter={(v: number | undefined) => v != null ? `${Math.round(v)}th pct` : '—'} contentStyle={TOOLTIP_STYLE} />
        </RadarChart>
      </ResponsiveContainer>
      )}
      <p className="ba-label text-center mt-2">
        Tour percentiles{tourSize ? ` · ${tourSize.toLocaleString()} eligible players` : ''} · populations vary by metric
      </p>
    </div>
  );
}
