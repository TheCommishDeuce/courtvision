import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CHART, monoTick } from './theme';

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
    <div className="bg-[var(--bone)] border border-[var(--ink)] px-3 py-2 text-[12px]">
      <div className="ba-mono font-bold text-[var(--ink)] mb-0.5">{d.x}</div>
      <div className="ba-mono text-[var(--ink-2)]">
        Win %: <span className="font-bold text-[var(--clay)]">{y.toFixed(1)}%</span>
        {d.wins != null && <span className="text-[var(--mute)] ml-1">({d.wins}/{d.total})</span>}
      </div>
    </div>
  );
}

export default function LineChart({ data, title, color = CHART.clay, referenceLine }: LineChartProps) {
  const gradId = 'ba-line-grad';

  if (!data.length) return <p className="text-[var(--mute)] text-sm text-center py-8 ba-mono">No data</p>;
  return (
    <div>
      {title && <h3 className="ba-h3 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" stroke={CHART.grid} />
          <XAxis dataKey="x" tick={monoTick(11, CHART.tickInk)} />
          <YAxis domain={[0, 100]} tick={monoTick(11, CHART.tickInk)} tickFormatter={v => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          {referenceLine !== undefined && (
            <ReferenceLine y={referenceLine} stroke="var(--ink-2)" strokeDasharray="4 4" />
          )}
          <Area type="monotone" dataKey="y" stroke="none" fill={`url(#${gradId})`} isAnimationActive={false} legendType="none" />
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, stroke: 'var(--bone)', strokeWidth: 1.5 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
