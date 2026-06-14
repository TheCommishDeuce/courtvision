import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CHART, TOOLTIP_STYLE_SOFT, LEGEND_STYLE, monoTick } from './theme';

interface GroupedBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  groups: { key: string; color: string; label?: string }[];
  title?: string;
  yLabel?: string;
}

export default function GroupedBar({ data, xKey, groups, title, yLabel }: GroupedBarProps) {
  if (!data.length) return <p className="text-[var(--mute)] text-sm text-center py-8 ba-mono">No data</p>;
  return (
    <div>
      {title && <h3 className="ba-h3 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={CHART.grid} />
          <XAxis dataKey={xKey} tick={monoTick(11, CHART.tickMute)} />
          <YAxis
            tick={monoTick(11, CHART.tickMute)}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: monoTick(11, CHART.tickMute) } : undefined}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE_SOFT} />
          <Legend wrapperStyle={{ ...LEGEND_STYLE, fontSize: 12 }} />
          {groups.map(g => (
            <Bar key={g.key} dataKey={g.key} name={g.label ?? g.key} fill={g.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
