/**
 * Design-system specimen. Unlisted route (`/_specimen`) — not in the nav.
 *
 * Renders the real primitives against static data so the system can be
 * reviewed without waiting on the API, and so a change to a token or a
 * density step is visible in one place. Delete this file and its route if
 * you don't want it shipping.
 */
import SectionHeader from '../components/ui/SectionHeader';
import StatBoard, { type BoardRow } from '../components/ui/StatBoard';
import AdaptiveTable, { type Column } from '../components/tables/AdaptiveTable';
import KPIBlock from '../components/ui/KPIBlock';
import MetricCard from '../components/ui/MetricCard';
import SplitRecord from '../components/ui/SplitRecord';
import SurfaceTag from '../components/ui/SurfaceTag';
import EmptyState from '../components/ui/EmptyState';
import QueryError from '../components/ui/QueryError';
import Spinner from '../components/ui/Spinner';

const TOKENS = [
  ['--paper', 'page field'],
  ['--paper-raised', 'cards, boards, tables'],
  ['--paper-sunken', 'wells, table heads'],
  ['--ink', 'primary text, heavy rules'],
  ['--ink-2', 'secondary text'],
  ['--mute', 'labels, meta'],
  ['--rule', 'hairline between rows'],
  ['--rule-mid', 'hairline between blocks'],
  ['--clay', 'accent — figures, active state'],
  ['--clay-deep', 'links, hover'],
];

const LEADERS: BoardRow[] = [
  { name: 'Novak Djokovic', value: '1,142' },
  { name: 'Roger Federer', value: '1,110' },
  { name: 'Rafael Nadal', value: '1,080' },
  { name: 'Jimmy Connors', value: '1,058' },
  { name: 'Ivan Lendl', value: '1,022' },
  { name: 'Guillermo Vilas', value: '929' },
  { name: 'Andre Agassi', value: '870' },
  { name: 'John McEnroe', value: '869' },
  { name: 'Stefan Edberg', value: '806' },
  { name: 'Pete Sampras', value: '762' },
];

const SHORT: BoardRow[] = LEADERS.slice(0, 3);

interface MatchSample {
  date: string;
  tournament: string;
  surface: string;
  round: string;
  winner: string;
  loser: string;
  score: string;
  aces: number;
  upset: boolean;
}

const MATCHES: MatchSample[] = [
  { date: '2019-07-14', tournament: 'Wimbledon', surface: 'Grass', round: 'F', winner: 'Novak Djokovic', loser: 'Roger Federer', score: '7-6(5) 1-6 7-6(4) 4-6 13-12(3)', aces: 10, upset: false },
  { date: '2008-07-06', tournament: 'Wimbledon', surface: 'Grass', round: 'F', winner: 'Rafael Nadal', loser: 'Roger Federer', score: '6-4 6-4 6-7(5) 6-7(8) 9-7', aces: 6, upset: true },
  { date: '2012-01-29', tournament: 'Australian Open', surface: 'Hard', round: 'F', winner: 'Novak Djokovic', loser: 'Rafael Nadal', score: '5-7 6-4 6-2 6-7(5) 7-5', aces: 8, upset: false },
  { date: '2004-06-06', tournament: 'Roland Garros', surface: 'Clay', round: 'F', winner: 'Gaston Gaudio', loser: 'Guillermo Coria', score: '0-6 3-6 6-4 6-1 8-6', aces: 3, upset: true },
];

const COLUMNS: Column<MatchSample>[] = [
  { key: 'date', header: 'Date', cell: r => <span className="ba-mono text-[11px] text-[var(--mute)]">{r.date}</span>, hideOnCard: true },
  { key: 'tournament', header: 'Event', cell: r => r.tournament },
  { key: 'surface', header: 'Surf', cell: r => <SurfaceTag surface={r.surface} /> },
  { key: 'round', header: 'Rnd', cell: r => <span className="ba-mono text-[11px]">{r.round}</span> },
  { key: 'winner', header: 'Winner', cell: r => <span className="font-semibold">{r.winner}</span>, hideOnCard: true },
  { key: 'loser', header: 'Loser', cell: r => <span className="text-[var(--ink-2)]">{r.loser}</span>, hideOnCard: true },
  { key: 'score', header: 'Score', cell: r => <span className="ba-mono text-[11px]">{r.score}</span> },
  { key: 'aces', header: 'Aces', num: true, accentHeader: true, cell: r => r.aces },
];

function Swatch({ token, use }: { token: string; use: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-8 h-8 shrink-0 border border-[var(--rule-mid)]"
        style={{ background: `var(${token})` }}
      />
      <span className="min-w-0">
        <span className="ba-mono text-[11px] text-[var(--ink)] block">{token}</span>
        <span className="ba-label">{use}</span>
      </span>
    </div>
  );
}

function DensityDemo({ label, cls, spec }: { label: string; cls: string; spec: string }) {
  return (
    <div>
      <div className="ba-label mb-1">
        {label} <span className="text-[var(--rule-mid)]">·</span> {spec}
      </div>
      <div className="border border-[var(--rule)] border-t-2 border-t-[var(--ink)]">
        <table className={`ba-table ${cls}`}>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col" className="num">Won</th>
              <th scope="col" className="num">Win %</th>
            </tr>
          </thead>
          <tbody>
            {LEADERS.slice(0, 5).map(r => (
              <tr key={String(r.name)}>
                <td>{r.name}</td>
                <td className="num">{r.value}</td>
                <td className="num">83.1%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SpecimenPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        level="page"
        eyebrow="Internal"
        title="Design system specimen"
        kicker="Route /_specimen · not in nav"
      />

      <section>
        <SectionHeader level="sub" title="Colour" kicker="Ten tokens, no more" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {TOKENS.map(([token, use]) => (
            <Swatch key={token} token={token} use={use} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          level="sub"
          title="Type"
          kicker="EB Garamond · Fraunces · Inter · JetBrains Mono"
        />
        <div className="space-y-3">
          <div>
            <div className="ba-label mb-0.5">.ba-display — EB Garamond 500</div>
            <div className="ba-display">Every match on record</div>
          </div>
          <div>
            <div className="ba-label mb-0.5">.ba-h2 — EB Garamond 600</div>
            <div className="ba-h2">Titles and finals</div>
          </div>
          <div>
            <div className="ba-label mb-0.5">.ba-h3 — EB Garamond 600</div>
            <div className="ba-h3">Break points saved</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="ba-label mb-0.5">
                .ba-stat / .ba-stat-sm — Fraunces, display figures
              </div>
              <div className="ba-stat">1,071,691</div>
              <div className="ba-stat-sm mt-1">38,228</div>
            </div>
            <div>
              <div className="ba-label mb-0.5">.ba-body / .ba-body-sm — Inter</div>
              <p className="ba-body">
                The figure rule: a number that stands alone as a headline is set in
                Fraunces. A number that sits in a column beside other numbers — table
                cells, board rows, .ba-figure — is mono and tabular, so the column
                lines up.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 pt-1">
            <span className="ba-eyebrow">.ba-eyebrow</span>
            <span className="ba-label">.ba-label</span>
            <span className="ba-kicker">.ba-kicker</span>
            <span className="ba-figure">.ba-figure 12.5</span>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          level="sub"
          title="Density"
          kicker="One spec, three steps — pages pick a step, never a padding"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DensityDemo label="Default" cls="" spec="30px row · 13px" />
          <DensityDemo label=".ba-table-dense" cls="ba-table-dense" spec="26px row · 12.5px" />
          <DensityDemo label=".ba-table-agate" cls="ba-table-agate" spec="23px row · 12px" />
        </div>
      </section>

      <section>
        <SectionHeader
          level="sub"
          title="Stat board"
          kicker="Fixed height — the short board reserves all ten slots"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <StatBoard title="Most wins" rows={LEADERS} to="/records?board=wins" foot="Min. 50 matches" />
          <StatBoard title="Most wins · clay" rows={LEADERS.slice(0, 8)} to="/records?board=wins-clay" foot="Min. 50 matches" />
          <StatBoard title="Short result set" rows={SHORT} foot="Min. 200 matches" />
          <StatBoard title="No qualifiers" rows={[]} foot="Min. 500 matches" />
        </div>
      </section>

      <section>
        <SectionHeader
          level="sub"
          title="Adaptive table"
          kicker="Pinned first column on wide screens, stacked cards below sm"
        />
        <AdaptiveTable
          rows={MATCHES}
          columns={COLUMNS}
          rowKey={(r, i) => `${r.date}-${i}`}
          flag={r => r.upset}
          cardTitle={r => `${r.winner} def. ${r.loser}`}
          cardMeta={r => `${r.date} · ${r.tournament}`}
          unit="matches"
        />
        <p className="ba-kicker mt-2">Clay tick in the left margin marks an upset.</p>
      </section>

      <section>
        <SectionHeader level="sub" title="Figures and blocks" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <KPIBlock variant="hero" label="Matches indexed" value="1,071,691" sub="Data through 2026-06-08" />
          <div className="space-y-3">
            <KPIBlock variant="muted" label="Tournaments" value="17,381" />
            <KPIBlock variant="plain" label="Points played" value="49,791,635" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Titles" value={99} />
            <MetricCard label="Slams" value={24} tone="accent" />
            <div className="col-span-2 ba-card px-3 py-2.5">
              <div className="ba-label mb-1">Career record</div>
              <SplitRecord wins={1142} losses={225} size="lg" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader level="sub" title="Controls" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="ba-btn ba-btn-primary">Run query</button>
          <button type="button" className="ba-btn ba-btn-ghost">Download CSV</button>
          <button type="button" className="ba-btn ba-btn-ghost" disabled>Disabled</button>
          <button type="button" className="ba-chip ba-chip-active">Hard</button>
          <button type="button" className="ba-chip">Clay</button>
          <button type="button" className="ba-chip">Grass</button>
          <input className="ba-input" placeholder="Player name" />
          <select className="ba-select" defaultValue="">
            <option value="">All levels</option>
            <option>Grand Slam</option>
          </select>
        </div>
      </section>

      <section>
        <SectionHeader level="sub" title="States" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <EmptyState />
          <QueryError onRetry={() => {}} />
          <div className="ba-card-flat flex items-center justify-center">
            <Spinner />
          </div>
        </div>
      </section>
    </div>
  );
}
