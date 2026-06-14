import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { RankHistoryPoint } from '../../types/tennis';
import { CHART, monoTick } from './theme';

interface Props {
  data: RankHistoryPoint[];
  careerHigh?: number | null;
  title?: string;
  color?: string;
  label?: string;
}

function CustomTooltip({ active, payload, color }: { active?: boolean; payload?: { payload: RankHistoryPoint }[]; color: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[var(--bone)] border border-[var(--ink)] px-3 py-2 text-[12px]">
      <div className="text-[var(--mute)] ba-mono text-[10.5px]">{d.date?.slice(0, 10)}</div>
      <div className="font-bold ba-mono" style={{ color }}>Rank #{d.rank}</div>
    </div>
  );
}

function toLog(rank: number) {
  return Math.log10(Math.max(1, rank));
}

export default function RankHistoryChart({
  data,
  careerHigh,
  title = 'Ranking History',
  color = CHART.clay,
  label,
}: Props) {
  if (!data.length) return null;

  const byMonth: Record<string, RankHistoryPoint> = {};
  for (const p of data) {
    const month = p.date?.slice(0, 7);
    if (month) {
      if (!byMonth[month] || p.rank < byMonth[month].rank) byMonth[month] = p;
    }
  }
  const reduced = Object.values(byMonth)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => ({ ...p, logRank: toLog(p.rank) }));

  const maxRank = Math.max(...reduced.map(d => d.rank));
  const minRank = Math.min(...reduced.map(d => d.rank));
  const logMax = toLog(Math.min(maxRank + Math.ceil(maxRank * 0.3), 1000));
  const logMin = Math.max(0, toLog(Math.max(1, minRank - 1)) - 0.05);
  const rankTicks = [1, 5, 10, 20, 50, 100, 200, 500].filter(r => r <= maxRank + 50);

  return (
    <div>
      <h3 className="ba-h3 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={reduced} margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={CHART.grid} opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={v => v?.slice(0, 4)}
            tick={monoTick(10, CHART.tickInk)}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[logMin, logMax]}
            reversed
            tick={monoTick(10, CHART.tickInk)}
            ticks={rankTicks.map(toLog)}
            tickFormatter={v => {
              const r = Math.round(Math.pow(10, v));
              return `#${r}`;
            }}
            width={40}
          />
          {careerHigh && (
            <ReferenceLine
              y={toLog(careerHigh)}
              stroke="var(--clay-deep)"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: `#${careerHigh}`, position: 'insideTopRight', fontSize: 9, fill: 'var(--clay-deep)', fontFamily: 'JetBrains Mono' }}
            />
          )}
          <Tooltip content={<CustomTooltip color={color} />} />
          <Line
            type="monotone"
            dataKey="logRank"
            name={label ?? 'Rank'}
            stroke={color}
            dot={false}
            strokeWidth={2.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
