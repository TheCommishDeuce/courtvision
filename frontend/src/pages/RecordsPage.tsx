import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useMatchExtremes,
  useNationalityStage,
} from '../hooks';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import QueryError from '../components/ui/QueryError';
import MatchStatsPanel, { type SideStats } from '../components/ui/MatchStatsPanel';
import { MetricScatterSection } from './AnalysisPage';
import type { MatchExtremeRow } from '../types/tennis';
import { lastName } from '../utils';

const TOURS = [
  { label: 'ATP (Men)', value: 'M' },
  { label: 'WTA (Women)', value: 'F' },
];
const LEVELS = ['', 'Grand Slam', 'Masters 1000', 'All Tour', 'ATP 250/500', 'WTA 500', 'WTA 250', 'Challenger', 'ITF'];
const METRICS = [
  { label: 'Longest (minutes)', metric: 'duration', order: 'desc' },
  { label: 'Shortest (minutes)', metric: 'duration', order: 'asc' },
  { label: 'Most aces (one player)', metric: 'aces_player', order: 'desc' },
  { label: 'Most aces (both)', metric: 'aces_match', order: 'desc' },
  { label: 'Most games', metric: 'games', order: 'desc' },
  { label: 'Biggest rank upset', metric: 'rank_upset', order: 'desc' },
];
const STAGES = [
  { label: 'Final', value: 'F' },
  { label: 'Semifinal+', value: 'SF' },
  { label: 'Quarterfinal+', value: 'QF' },
  { label: 'Round of 16+', value: 'R16' },
];
const THIS_YEAR = new Date().getFullYear();

const winnerStats = (r: MatchExtremeRow): SideStats => ({
  aces: r.w_aces, dfs: r.winner_dfs, pts: r.winner_pts, firsts: r.winner_firsts,
  fwon: r.winner_fwon, swon: r.winner_swon, saved: r.winner_saved, chances: r.winner_chances,
});
const loserStats = (r: MatchExtremeRow): SideStats => ({
  aces: r.l_aces, dfs: r.loser_dfs, pts: r.loser_pts, firsts: r.loser_firsts,
  fwon: r.loser_fwon, swon: r.loser_swon, saved: r.loser_saved, chances: r.loser_chances,
});

function Card({ title, kicker, children }: { title: React.ReactNode; kicker: string; children: React.ReactNode }) {
  return (
    <section className="ba-card space-y-4">
      <div className="border-b border-[var(--rule)] pb-2">
        <div className="ba-kicker text-[10px] mb-1">{kicker}</div>
        <h2 className="ba-h2">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function YearInputs({ yMin, yMax, setYMin, setYMax }: {
  yMin: string; yMax: string; setYMin: (v: string) => void; setYMax: (v: string) => void;
}) {
  return (
    <>
      <input value={yMin} onChange={e => setYMin(e.target.value)} placeholder="from yr" className="ba-input w-24" inputMode="numeric" />
      <input value={yMax} onChange={e => setYMax(e.target.value)} placeholder="to yr" className="ba-input w-24" inputMode="numeric" />
    </>
  );
}

function MatchRecords() {
  const [tour, setTour] = useState('M');
  const [level, setLevel] = useState('Masters 1000');
  const [metricIdx, setMetricIdx] = useState(0);
  const [yMin, setYMin] = useState(String(THIS_YEAR - 2));
  const [yMax, setYMax] = useState(String(THIS_YEAR));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const m = METRICS[metricIdx];

  const { data, isFetching, isError, refetch } = useMatchExtremes({
    metric: m.metric,
    order: m.order,
    tour,
    level: level || undefined,
    year_min: yMin ? Number(yMin) : undefined,
    year_max: yMax ? Number(yMax) : undefined,
    limit: 25,
  }, submitted);

  const unit = m.metric === 'duration' ? 'min' : m.metric === 'rank_upset' ? 'gap' : '';

  return (
    <Card kicker="Match · Records" title={<>Match <span className="text-[var(--clay)]">Superlatives</span></>}>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={tour} onChange={e => { setTour(e.target.value); setSubmitted(false); }} className="ba-input">
          {TOURS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={metricIdx} onChange={e => { setMetricIdx(Number(e.target.value)); setSubmitted(false); }} className="ba-input">
          {METRICS.map((mm, i) => <option key={mm.label} value={i}>{mm.label}</option>)}
        </select>
        <select value={level} onChange={e => { setLevel(e.target.value); setSubmitted(false); }} className="ba-input">
          {LEVELS.map(l => <option key={l} value={l}>{l || 'Any level'}</option>)}
        </select>
        <YearInputs
          yMin={yMin}
          yMax={yMax}
          setYMin={v => { setYMin(v); setSubmitted(false); }}
          setYMax={v => { setYMax(v); setSubmitted(false); }}
        />
        <button onClick={() => setSubmitted(true)} className="ba-btn ba-btn-primary">Go →</button>
      </div>
      {isFetching && <div className="py-6 flex justify-center"><Spinner /></div>}
      {!isFetching && isError && <QueryError message="Couldn't load match records." onRetry={() => refetch()} />}
      {!isFetching && data && data.results.length === 0 && <EmptyState message="No matches for these filters." />}
      {!isFetching && data && data.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)] text-left ba-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">
                <th className="py-1.5 pr-3">#</th>
                <th className="py-1.5 pr-3">{m.label.split(' (')[0]} {unit && `(${unit})`}</th>
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3">Tournament</th>
                <th className="py-1.5 pr-3">Rd</th>
                <th className="py-1.5 pr-3">Winner</th>
                <th className="py-1.5 pr-3">Loser</th>
                <th className="py-1.5 pr-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r, i) => {
                const isOpen = openIdx === i;
                return (
                  <Fragment key={i}>
                    <tr
                      className={`border-b border-[var(--rule)] cursor-pointer ${isOpen ? 'bg-[var(--bone-2)]' : 'hover:bg-[var(--bone-2)]'}`}
                      onClick={() => setOpenIdx(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      <td className="py-1.5 pr-3 ba-mono text-[11px] text-[var(--mute)]">
                        <span className="mr-1">{isOpen ? '▾' : '▸'}</span>{i + 1}
                      </td>
                      <td className="py-1.5 pr-3 ba-mono font-bold text-[var(--clay-deep)]">{r.metric_value}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap ba-mono text-[11px]">{r.date?.slice(0, 10)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <Link to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.year}&tour=${r.tour}`} className="ba-link font-medium">{r.tournament}</Link>
                      </td>
                      <td className="py-1.5 pr-3 ba-mono text-[11px]">{r.round}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <Link to={`/player?p=${encodeURIComponent(r.winner_name)}&tour=${r.tour}`} className="ba-link font-medium">{r.winner_name}</Link>
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-[var(--mute)]" onClick={e => e.stopPropagation()}>
                        <Link to={`/player?p=${encodeURIComponent(r.loser_name)}&tour=${r.tour}`} className="hover:underline">{r.loser_name}</Link>
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap ba-mono text-[11px]">{r.score}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-[var(--rule)]">
                        <td colSpan={8} className="p-0">
                          <MatchStatsPanel
                            a={winnerStats(r)} b={loserStats(r)}
                            aLabel={lastName(r.winner_name)}
                            bLabel={lastName(r.loser_name)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function NationalityMilestones() {
  const [country, setCountry] = useState('');
  const [tour, setTour] = useState('F');
  const [level, setLevel] = useState('Grand Slam');
  const [stage, setStage] = useState('F');
  const [order, setOrder] = useState('last');
  const [submitted, setSubmitted] = useState(false);

  const { data, isFetching, isError, refetch } = useNationalityStage({
    country, stage, tour, level: level || undefined, order, limit: 25,
  }, submitted && Boolean(country));

  return (
    <Card kicker="Nationality · Milestones" title={<>Who Reached <span className="text-[var(--clay)]">The Stage</span></>}>
      <p className="text-[13px] text-[var(--mute)] -mt-1">
        e.g. the last Russian woman to reach a Grand Slam final.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <input value={country} onChange={e => { setCountry(e.target.value); setSubmitted(false); }} placeholder="Country or ISO code" className="ba-input w-44" />
        <select value={tour} onChange={e => { setTour(e.target.value); setSubmitted(false); }} className="ba-input">
          {TOURS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={level} onChange={e => { setLevel(e.target.value); setSubmitted(false); }} className="ba-input">
          {LEVELS.map(l => <option key={l} value={l}>{l || 'Any level'}</option>)}
        </select>
        <select value={stage} onChange={e => { setStage(e.target.value); setSubmitted(false); }} className="ba-input">
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={order} onChange={e => { setOrder(e.target.value); setSubmitted(false); }} className="ba-input">
          <option value="last">Most recent first</option>
          <option value="first">Earliest first</option>
        </select>
        <button onClick={() => setSubmitted(true)} className="ba-btn ba-btn-primary">Go →</button>
      </div>
      {isFetching && <div className="py-6 flex justify-center"><Spinner /></div>}
      {!isFetching && isError && <QueryError message="Couldn't load stage milestones." onRetry={() => refetch()} />}
      {!isFetching && data && data.results.length === 0 && <EmptyState message="No players found for these filters." />}
      {!isFetching && data && data.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)] text-left ba-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3">Player</th>
                <th className="py-1.5 pr-3">Ctry</th>
                <th className="py-1.5 pr-3">Tournament</th>
                <th className="py-1.5 pr-3">Reached</th>
                <th className="py-1.5 pr-3">Title?</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r, i) => (
                <tr key={i} className="border-b border-[var(--rule)] hover:bg-[var(--bone-2)]">
                  <td className="py-1.5 pr-3 whitespace-nowrap ba-mono text-[11px]">{r.reached_date?.slice(0, 10)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap font-medium">
                    <Link to={`/player?p=${encodeURIComponent(r.player_name)}&tour=${r.tour}`} className="ba-link font-medium">{r.player_name}</Link>
                  </td>
                  <td className="py-1.5 pr-3 ba-mono text-[11px]">{r.country}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <Link to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.year}&tour=${r.tour}`} className="ba-link font-medium">{r.tournament}</Link> {r.year}
                  </td>
                  <td className="py-1.5 pr-3 ba-mono text-[11px]">{r.deepest_round}</td>
                  <td className="py-1.5 pr-3">{r.won_title ? <span className="text-[var(--clay-deep)] font-bold">★</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function RecordsPage() {
  return (
    <div className="space-y-10">
      <header className="border-b border-[var(--rule)] pb-4">
        <div className="ba-kicker text-[10px] mb-2">Records · &amp; · Milestones</div>
        <h1 className="ba-display">
          Records <span className="text-[var(--clay)]">Book</span>
        </h1>
      </header>
      <MatchRecords />
      <NationalityMilestones />
      <MetricScatterSection />
    </div>
  );
}
