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
import type { H2HRow } from '../../types/tennis';
import { CHART, monoTick } from './theme';
import { lastName } from '../../utils';

interface MomentumPoint {
  match_num: number;
  lead: number;
  date: string;
  winner: string;
  tournament: string;
  score: string;
}

interface Props {
  matches: H2HRow[];
  playerA: string;
  playerB: string;
  colorA?: string;
  colorB?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: MomentumPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[var(--paper)] border border-[var(--rule)] p-2 text-xs max-w-[180px]">
      <div className="font-semibold truncate text-[var(--ink)]">{d.winner}</div>
      <div className="text-[var(--mute)] ba-mono">{d.date} · {d.tournament}</div>
      <div className="ba-mono text-[var(--ink-2)]">{d.score}</div>
      <div className="mt-0.5 font-medium text-[var(--ink)]">
        Lead: {d.lead > 0 ? `+${d.lead}` : d.lead === 0 ? 'Tied' : d.lead}
      </div>
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number; payload?: MomentumPoint; colorA: string; colorB: string }) {
  const { cx, cy, payload, colorA, colorB } = props;
  if (cx == null || cy == null || !payload) return null;
  const color = payload.lead > 0 ? colorA : payload.lead < 0 ? colorB : CHART.tickMute;
  return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="var(--bone)" strokeWidth={1} />;
}

export default function MomentumTimeline({
  matches,
  playerA,
  playerB,
  colorA = CHART.clay,
  colorB = CHART.ink,
}: Props) {
  const data: MomentumPoint[] = [...matches].reverse().reduce<MomentumPoint[]>((acc, m, i) => {
    const prev = i === 0 ? 0 : acc[i - 1].lead;
    acc.push({
      match_num: i + 1,
      lead: m.winner_name === playerA ? prev + 1 : prev - 1,
      date: m.date?.slice(0, 10) ?? '',
      winner: m.winner_name,
      tournament: m.tournament,
      score: m.score,
    });
    return acc;
  }, []);

  const maxAbs = Math.max(...data.map(d => Math.abs(d.lead)), 1);
  const nameA = lastName(playerA);
  const nameB = lastName(playerB);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="ba-h3">Rivalry Momentum</h3>
        <div className="flex gap-4 text-xs ba-mono">
          <span style={{ color: colorA }}>▲ {nameA} leads</span>
          <span style={{ color: colorB }}>▼ {nameB} leads</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={CHART.grid} opacity={0.5} />
          <XAxis
            dataKey="match_num"
            tick={monoTick(10, CHART.tickMute)}
            label={{ value: 'Match #', position: 'insideBottom', offset: -8, fontSize: 10, fill: CHART.tickMute, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            domain={[-maxAbs - 1, maxAbs + 1]}
            tick={monoTick(10, CHART.tickMute)}
            tickFormatter={v => (v > 0 ? `+${v}` : String(v))}
            width={32}
          />
          <ReferenceLine y={0} stroke="var(--ink-2)" strokeWidth={1.5} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="lead"
            stroke="var(--ink-2)"
            strokeWidth={2}
            dot={<CustomDot colorA={colorA} colorB={colorB} />}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
