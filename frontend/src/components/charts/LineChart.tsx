import {
  LineChart as RcLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CHART, monoTick, GRID_PROPS, AXIS_PROPS, LINE_WIDTH, TOOLTIP_CLASS } from './theme';

interface LineChartProps {
  data: { x: string | number; y: number; wins?: number; total?: number }[];
  title?: string;
  color?: string;
  referenceLine?: number;
}

interface TooltipPayloadItem {
  payload?: { x: string | number; y: number; wins?: number; total?: number };
  value?: number;
  dataKey?: string;
  name?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload.find(p => p.dataKey === 'y') ?? payload[0];
  const d = item.payload;
  if (!d) return null;
  const y = typeof item.value === 'number' ? item.value : d.y;
  return (
    <div className={TOOLTIP_CLASS}>
      <div className="ba-mono font-bold text-[var(--ink)] mb-0.5">{d.x}</div>
      <div className="ba-mono text-[var(--ink-2)]">
        Win %: <span className="font-bold text-[var(--clay)]">{y.toFixed(1)}%</span>
        {d.wins != null && <span className="text-[var(--mute)] ml-1">({d.wins}/{d.total})</span>}
      </div>
    </div>
  );
}

export default function LineChart({ data, title, color = CHART.clay, referenceLine }: LineChartProps) {
  if (!data.length) return <p className="ba-kicker text-center py-8">No data</p>;
  return (
    <div>
      {title && <h3 className="ba-h3 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={240}>
        <RcLineChart data={data} margin={{ top: 6, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="x" tick={monoTick(10, CHART.tickMute)} {...AXIS_PROPS} />
          <YAxis
            domain={[0, 100]}
            tick={monoTick(10, CHART.tickMute)}
            tickFormatter={v => `${v}%`}
            width={34}
            {...AXIS_PROPS}
          />
          <Tooltip content={<CustomTooltip />} />
          {referenceLine !== undefined && (
            <ReferenceLine y={referenceLine} stroke={CHART.mute} strokeDasharray="3 3" />
          )}
          <Line
            type="linear"
            dataKey="y"
            stroke={color}
            strokeWidth={LINE_WIDTH}
            dot={{ r: 2, fill: color, stroke: CHART.paper, strokeWidth: 1 }}
            activeDot={{ r: 3.5, fill: color, stroke: CHART.paper, strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </RcLineChart>
      </ResponsiveContainer>
    </div>
  );
}
