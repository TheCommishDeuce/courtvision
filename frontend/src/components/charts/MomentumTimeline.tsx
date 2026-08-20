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
import { CHART, monoTick, GRID_PROPS, AXIS_PROPS, LINE_WIDTH, TOOLTIP_CLASS, CHART_FS } from './theme';
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
    <div className={`${TOOLTIP_CLASS} max-w-[190px]`}>
      <div className="font-semibold truncate text-ink">{d.winner}</div>
      <div className="text-mute ba-mono">{d.date} · {d.tournament}</div>
      <div className="ba-mono text-ink-2">{d.score}</div>
      <div className="mt-0.5 font-medium text-ink">
        Lead: {d.lead > 0 ? `+${d.lead}` : d.lead === 0 ? 'Tied' : d.lead}
      </div>
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number; payload?: MomentumPoint; colorA: string; colorB: string }) {
  const { cx, cy, payload, colorA, colorB } = props;
  if (cx == null || cy == null || !payload) return null;
  const color = payload.lead > 0 ? colorA : payload.lead < 0 ? colorB : CHART.tickMute;
  return <circle cx={cx} cy={cy} r={2.75} fill={color} stroke={CHART.paper} strokeWidth={1} />;
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
        <h3 className="ba-h3">Rivalry momentum</h3>
        <div className="flex gap-4 ba-mono ba-meta uppercase tracking-[0.08em]">
          <span style={{ color: colorA }}>▲ {nameA} leads</span>
          <span style={{ color: colorB }}>▼ {nameB} leads</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="match_num"
            tick={monoTick(CHART_FS.tick, CHART.tickMute)}
            label={{ value: 'Match #', position: 'insideBottom', offset: -8, fontSize: CHART_FS.label, fill: CHART.tickMute, fontFamily: 'JetBrains Mono' }}
            {...AXIS_PROPS}
          />
          <YAxis
            domain={[-maxAbs - 1, maxAbs + 1]}
            tick={monoTick(CHART_FS.tick, CHART.tickMute)}
            tickFormatter={v => (v > 0 ? `+${v}` : String(v))}
            width={30}
            {...AXIS_PROPS}
          />
          <ReferenceLine y={0} stroke={CHART.ink} strokeWidth={1} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="linear"
            dataKey="lead"
            stroke={CHART.mute}
            strokeWidth={LINE_WIDTH}
            dot={<CustomDot colorA={colorA} colorB={colorB} />}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
