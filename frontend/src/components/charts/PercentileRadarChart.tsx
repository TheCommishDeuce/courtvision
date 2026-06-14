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
import { CHART, TOOLTIP_STYLE, LEGEND_STYLE, monoTick } from './theme';

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
    A: (percentiles[s.key] as number | null | undefined) ?? 0,
    B: percentilesB ? ((percentilesB[s.key] as number | null | undefined) ?? 0) : undefined,
  }));

  const tourSize = percentiles.tour_size;

  return (
    <div>
      {title && <h3 className="ba-h3 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={270}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis dataKey="subject" tick={monoTick(11, CHART.tickInk)} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={labelA}
            dataKey="A"
            stroke={CHART.clay}
            fill={CHART.clay}
            fillOpacity={0.28}
            strokeWidth={2}
          />
          {percentilesB && (
            <Radar
              name={labelB}
              dataKey="B"
              stroke={CHART.ink}
              fill={CHART.ink}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          )}
          <Legend wrapperStyle={{ ...LEGEND_STYLE, fontSize: 12 }} />
          <Tooltip formatter={(v: number | undefined) => v != null ? `${Math.round(v)}th pct` : '—'} contentStyle={TOOLTIP_STYLE} />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-[var(--mute)] text-center -mt-1 ba-mono tracking-[0.1em] uppercase">
        Tour percentiles{tourSize ? ` · vs ${tourSize.toLocaleString()} players` : ''}
      </p>
    </div>
  );
}
