import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CHART, TOOLTIP_STYLE, LEGEND_STYLE, monoTick, GRID_PROPS, AXIS_PROPS } from './theme';

interface GroupedBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  groups: { key: string; color: string; label?: string }[];
  title?: string;
  yLabel?: string;
}

export default function GroupedBar({ data, xKey, groups, title, yLabel }: GroupedBarProps) {
  if (!data.length) return <p className="ba-kicker text-center py-8">No data</p>;
  return (
    <div>
      {title && <h3 className="ba-h3 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 6, right: 16, left: 0, bottom: 4 }} barCategoryGap="22%">
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={xKey} tick={monoTick(10, CHART.tickMute)} {...AXIS_PROPS} />
          <YAxis
            tick={monoTick(10, CHART.tickMute)}
            width={34}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: monoTick(10, CHART.tickMute) } : undefined}
            {...AXIS_PROPS}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--clay-wash)' }} />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="square" iconSize={8} />
          {groups.map(g => (
            <Bar key={g.key} dataKey={g.key} name={g.label ?? g.key} fill={g.color} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
