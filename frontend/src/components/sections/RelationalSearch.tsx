import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayers, useRelationalMatches } from '../../hooks';
import PlayerAutocomplete from '../filters/PlayerAutocomplete';
import SurfaceSelect from '../filters/SurfaceSelect';
import LevelSelect from '../filters/LevelSelect';
import KPIBlock from '../ui/KPIBlock';
import MatchStatsPanel, { type SideStats } from '../ui/MatchStatsPanel';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import QueryError from '../ui/QueryError';
import { fmtTime, lastName } from '../../utils';
import type { RelationalMatchRow, RelationalSummary } from '../../types/tennis';

interface Props {
  tour: string;
}

const HANDS = [
  { label: 'Any hand', value: '' },
  { label: 'vs Left-handers', value: 'L' },
  { label: 'vs Right-handers', value: 'R' },
];
const RELATIONS = [
  { label: 'Any nationality', value: '' },
  { label: 'vs Compatriots', value: 'compatriot' },
  { label: 'vs Foreign players', value: 'foreign' },
];
const AGE_RELATIONS = [
  { label: 'Any age', value: '' },
  { label: 'vs Younger', value: 'younger' },
  { label: 'vs Older', value: 'older' },
];
const RANK_CAPS = [
  { label: 'Any rank', value: '' },
  { label: 'vs Top 10', value: '10' },
  { label: 'vs Top 50', value: '50' },
  { label: 'vs Top 100', value: '100' },
];
const SITUATIONS_BASE = [
  { label: 'After winning 1st set', value: 'won_first' },
  { label: 'After losing 1st set', value: 'lost_first' },
  { label: 'In a deciding set', value: 'deciding_set' },
];
const SITUATIONS_BO5 = [
  { label: 'After leading 2–0', value: 'led_2_0' },
  { label: 'After trailing 0–2', value: 'trailed_0_2' },
  { label: 'After leading 2–1', value: 'led_2_1' },
  { label: 'After trailing 1–2', value: 'trailed_1_2' },
];
// Exact round (round = X) vs. round-or-later (min_stage = X). Encoded as
// `round:X` / `stage:X` so a single control drives both query params.
// 'Q' is a virtual code that matches any qualifying round (Q1/Q2/Q3).
const EXACT_ROUNDS = [
  { label: 'Final', value: 'F' },
  { label: 'Semifinal', value: 'SF' },
  { label: 'Quarterfinal', value: 'QF' },
  { label: 'Round of 16', value: 'R16' },
  { label: 'Round of 32', value: 'R32' },
  { label: 'Round of 64', value: 'R64' },
  { label: 'Round of 128', value: 'R128' },
  { label: 'Round robin', value: 'RR' },
  { label: 'Qualifying (Q)', value: 'Q' },
];
const STAGE_OR_LATER = [
  { label: 'Round of 16 or later', value: 'R16' },
  { label: 'Quarterfinal or later', value: 'QF' },
  { label: 'Semifinal or later', value: 'SF' },
];

function RoundSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="ba-kicker">Round</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="ba-select text-sm px-2 py-1.5">
        <option value="">All</option>
        <optgroup label="Exact round">
          {EXACT_ROUNDS.map(r => <option key={r.value} value={`round:${r.value}`}>{r.label}</option>)}
        </optgroup>
        <optgroup label="Round or later">
          {STAGE_OR_LATER.map(s => <option key={s.value} value={`stage:${s.value}`}>{s.label}</option>)}
        </optgroup>
      </select>
    </div>
  );
}

function SituationSelect({ value, onChange, showBo5 }: { value: string; onChange: (v: string) => void; showBo5: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="ba-kicker">Match situation</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="ba-select text-sm px-2 py-1.5">
        <option value="">Any situation</option>
        <optgroup label="Any format">
          {SITUATIONS_BASE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </optgroup>
        {showBo5 && (
          <optgroup label="Best-of-5 (men's Slams)">
            {SITUATIONS_BO5.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </optgroup>
        )}
      </select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="ba-mono text-[10px] font-medium tracking-[0.12em] uppercase text-[var(--mute)]">{label}</label>
      {children}
    </div>
  );
}

function record(w: number, l: number, pct: number | null): string {
  return pct == null ? '—' : `${w}–${l} · ${pct}%`;
}

function SummaryCards({ s }: { s: RelationalSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KPIBlock variant="muted" label="All-time" value={s.win_pct != null ? `${s.win_pct}%` : '—'} sub={`${record(s.wins, s.losses, s.win_pct)} · ${s.total} matches`} />
      <KPIBlock variant="muted" label="Last 5 years" value={s.y5_win_pct != null ? `${s.y5_win_pct}%` : '—'} sub={`${record(s.y5_wins, s.y5_losses, s.y5_win_pct)} · ${s.y5_total} matches`} />
      <KPIBlock variant="muted" label="Last 52 weeks" value={s.w52_win_pct != null ? `${s.w52_win_pct}%` : '—'} sub={`${record(s.w52_wins, s.w52_losses, s.w52_win_pct)} · ${s.w52_total} matches`} />
    </div>
  );
}

const focalStats = (m: RelationalMatchRow): SideStats => ({
  aces: m.p_aces, dfs: m.p_dfs, pts: m.p_pts, firsts: m.p_firsts,
  fwon: m.p_fwon, swon: m.p_swon, saved: m.p_saved, chances: m.p_chances,
});
const oppStats = (m: RelationalMatchRow): SideStats => ({
  aces: m.o_aces, dfs: m.o_dfs, pts: m.o_pts, firsts: m.o_firsts,
  fwon: m.o_fwon, swon: m.o_swon, saved: m.o_saved, chances: m.o_chances,
});

export default function RelationalSearch({ tour }: Props) {
  const { data: players = [] } = usePlayers(tour);

  const [player, setPlayer] = useState('');
  const [oppHand, setOppHand] = useState('');
  const [relation, setRelation] = useState('');
  const [ageRelation, setAgeRelation] = useState('');
  const [rankMax, setRankMax] = useState('');
  const [situation, setSituation] = useState('');
  const [round, setRound] = useState('');   // '' | 'round:F' | 'stage:QF'
  const [surface, setSurface] = useState('All');
  const [level, setLevel] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Reset the focal player when switching tours (names differ across tours);
  // also clear any best-of-5 situation, which only applies to men's Slams.
  useEffect(() => {
    setPlayer('');
    setLevel('');
    if (SITUATIONS_BO5.some(s => s.value === situation)) setSituation('');
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const exactRound = round.startsWith('round:') ? round.slice(6) : undefined;
  const minStage = round.startsWith('stage:') ? round.slice(6) : undefined;

  const params = {
    player: player || undefined,
    tour,
    opp_hand: oppHand || undefined,
    relation: relation || undefined,
    age_relation: ageRelation || undefined,
    opp_rank_max: rankMax ? Number(rankMax) : undefined,
    situation: situation || undefined,
    round: exactRound,
    min_stage: minStage,
    surface: surface === 'All' ? undefined : surface,
    level: level || undefined,
    limit: 300,
  };

  // Relations require a focal player; only enable the query when valid.
  const needsPlayer = Boolean(relation || ageRelation);
  const valid = Boolean(player) || !needsPlayer;
  const { data, isFetching, error, refetch } = useRelationalMatches(params, submitted && valid);

  const runSearch = () => { setExpandedIdx(null); setSubmitted(true); };
  const placeholder = tour === 'F' ? 'e.g. Aryna Sabalenka' : 'e.g. Carlos Alcaraz';

  return (
    <section className="ba-card space-y-5">
      <div className="border-b border-[var(--rule)] pb-2">
        <div className="ba-kicker text-[10px] mb-1">Player · vs · Cohort</div>
        <h2 className="ba-h2">
          Matches <span className="text-[var(--clay)]">Against…</span>
        </h2>
        <p className="text-[13px] text-[var(--mute)] mt-1">
          Pick a player, then filter their matches by opponent traits — left-handers, compatriots, top-ranked, or younger/older opponents.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <PlayerAutocomplete
          label="Player"
          value={player}
          onChange={v => { setPlayer(v); setSubmitted(false); }}
          players={players}
          placeholder={placeholder}
        />
        <SurfaceSelect value={surface} onChange={v => { setSurface(v); setSubmitted(false); }} />
        <LevelSelect tour={tour} value={level} onChange={v => { setLevel(v); setSubmitted(false); }} />
        <RoundSelect value={round} onChange={v => { setRound(v); setSubmitted(false); }} />
        <SituationSelect value={situation} showBo5={tour === 'M'} onChange={v => { setSituation(v); setSubmitted(false); }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Opponent hand">
          <select value={oppHand} onChange={e => { setOppHand(e.target.value); setSubmitted(false); }} className="ba-input">
            {HANDS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
        </Field>
        <Field label="Nationality">
          <select value={relation} onChange={e => { setRelation(e.target.value); setSubmitted(false); }} className="ba-input">
            {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Relative age">
          <select value={ageRelation} onChange={e => { setAgeRelation(e.target.value); setSubmitted(false); }} className="ba-input">
            {AGE_RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Opponent rank">
          <select value={rankMax} onChange={e => { setRankMax(e.target.value); setSubmitted(false); }} className="ba-input">
            {RANK_CAPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={runSearch} className="ba-btn ba-btn-primary">
          Find Matches →
        </button>
        {needsPlayer && !player && (
          <span className="text-[12px] text-[var(--clay-deep)]">
            Compatriot / younger-older filters need a player selected.
          </span>
        )}
      </div>

      {submitted && valid && isFetching && <div className="py-8 flex justify-center"><Spinner /></div>}
      {submitted && valid && error && (
        <QueryError message="Could not load matches for these filters." onRetry={() => refetch()} />
      )}
      {submitted && valid && !isFetching && data && data.total === 0 && (
        <EmptyState message="No matches found for the selected opponent filters." />
      )}
      {submitted && valid && data && data.matches.length > 0 && (
        <div className="space-y-4">
          <SummaryCards s={data.summary} />
          <div className="ba-kicker text-[10px]">
            {data.total.toLocaleString()} match{data.total !== 1 ? 'es' : ''}
            {data.shown < data.total ? ` · showing latest ${data.shown}` : ''} · tap a row for full match stats
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--rule)] text-left ba-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">
                  <th className="py-1.5 pr-3">Date</th>
                  <th className="py-1.5 pr-3">Tournament</th>
                  <th className="py-1.5 pr-3">Rd</th>
                  <th className="py-1.5 pr-3">Res</th>
                  <th className="py-1.5 pr-3">Age</th>
                  <th className="py-1.5 pr-3">Rank</th>
                  <th className="py-1.5 pr-3">Opponent</th>
                  <th className="py-1.5 pr-3">Hand</th>
                  <th className="py-1.5 pr-3">Ctry</th>
                  <th className="py-1.5 pr-3">Op Age</th>
                  <th className="py-1.5 pr-3">Op Rank</th>
                  <th className="py-1.5 pr-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.matches.map((m, i) => {
                  const isOpen = expandedIdx === i;
                  return (
                    <Fragment key={i}>
                      <tr
                        className={`border-b border-[var(--rule)] cursor-pointer ${isOpen ? 'bg-[var(--bone-2)]' : 'hover:bg-[var(--bone-2)]'}`}
                        onClick={() => setExpandedIdx(isOpen ? null : i)}
                        aria-expanded={isOpen}
                      >
                        <td className="py-1.5 pr-3 whitespace-nowrap ba-mono text-[11px]">
                          <span className="text-[var(--mute)] mr-1">{isOpen ? '▾' : '▸'}</span>{m.date?.slice(0, 10)}
                        </td>
                        <td className="py-1.5 pr-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <Link to={`/tournament?t=${encodeURIComponent(m.tournament)}&year=${m.date?.slice(0, 4)}&tour=${m.tour}`} className="ba-link font-medium">{m.tournament}</Link>
                        </td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.round}</td>
                        <td className={`py-1.5 pr-3 font-bold ${m.result === 'W' ? 'text-[var(--clay-deep)]' : 'text-[var(--mute)]'}`}>
                          {m.result}{m.is_retirement && <span className="ba-mono text-[9px] text-[var(--mute)] ml-0.5">r</span>}
                        </td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.player_age ?? '—'}</td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.player_rank ?? '—'}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <Link to={`/player?p=${encodeURIComponent(m.opponent_name)}&tour=${m.tour}`} className="ba-link font-medium">{m.opponent_name}</Link>
                        </td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.opp_hand ?? '—'}</td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.opp_country ?? '—'}</td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.opp_age ?? '—'}</td>
                        <td className="py-1.5 pr-3 ba-mono text-[11px]">{m.opponent_rank ?? '—'}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap ba-mono text-[11px]">
                          {m.score}{m.time ? <span className="text-[var(--mute)] ml-1">· {fmtTime(m.time)}</span> : null}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-[var(--rule)]">
                          <td colSpan={12} className="p-0">
                            <MatchStatsPanel a={focalStats(m)} b={oppStats(m)} aLabel={lastName(m.player_name)} bLabel={lastName(m.opponent_name)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
