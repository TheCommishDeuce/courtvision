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
import { CHART, TOOLTIP_STYLE, LEGEND_STYLE, monoTick, LINE_WIDTH } from './theme';

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
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 6, left: 30 }}>
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis dataKey="subject" tick={monoTick(10, CHART.tickMute)} />
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
      <p className="ba-label text-center -mt-1">
        Tour percentiles{tourSize ? ` · vs ${tourSize.toLocaleString()} players` : ''}
      </p>
    </div>
  );
}
