/**
 * Matchup: /versus and /versus/:a/:b (brief 03-screens/versus.md;
 * prototype/Versus.dc.html). Filters apply to the head-to-head blocks; the
 * career comparison is always the whole career.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  fetchH2H, fetchPlayerReturnStats, fetchPlayerServeStats, fetchPlayerSummary, fetchTopNRecords,
} from '../../api/client';
import type { H2HResponse } from '../../types/tennis';
import { resolvePlayer, type DirectoryPlayer } from '../../api/directory';
import FilterBar from '../../components/FilterBar';
import { MatchRow } from '../../components/MatchRow';
import SearchBox from '../../components/SearchBox';
import Section from '../../components/Section';
import { BlockError, Skeleton, SkeletonRows } from '../../components/States';
import { SurfaceTag, TourTag } from '../../components/Tags';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters, type FilterKey } from '../../hooks/useFilters';
import { CARD_ROWS_MAX, useViewportWidth } from '../../hooks/useViewport';
import { countActive, describeFilters, toApiParams, type Filters, type Tour } from '../../lib/filters';
import { fmtDate, fmtPct, fmtRank } from '../../lib/format';
import { fromWinnerLoser } from '../../lib/matches';
import { playerPath, slugify, versusPath } from '../../lib/slug';
import { isSurface } from '../../lib/surface';
import { compareLine, meetingFacts, pivotWins, shortNames, type CareerLine, type SplitLine } from '../../lib/versus';
import './versus.css';

const FILTER_KEYS: readonly FilterKey[] = ['surface', 'level', 'from', 'to'];
const RIVALRIES: [string, Tour, string, string][] = [
  ['Sinner vs Alcaraz', 'M', 'Jannik Sinner', 'Carlos Alcaraz'],
  ['Sabalenka vs Swiatek', 'F', 'Aryna Sabalenka', 'Iga Swiatek'],
  ['Djokovic vs Nadal', 'M', 'Novak Djokovic', 'Rafael Nadal'],
  ['Federer vs Nadal', 'M', 'Roger Federer', 'Rafael Nadal'],
  ['Evert vs Navratilova', 'F', 'Chris Evert', 'Martina Navratilova'],
  ['Djokovic vs Federer', 'M', 'Novak Djokovic', 'Roger Federer'],
];
const SURFACE_ORDER = ['Hard', 'Clay', 'Grass', 'Carpet'];
const LEVEL_ORDER = ['Grand Slam', 'Tour Finals', 'Olympics', 'Masters 1000', 'ATP 250/500', 'WTA 500', 'WTA 250', 'WTA', 'Davis Cup', 'BJK Cup', 'Challenger', 'ITF'];

const asTour = (v: string | null): Tour | undefined => (v === 'M' || v === 'F' ? v : undefined);
const statusOf = (e: unknown) => (e as { response?: { status?: number } } | null)?.response?.status;

/** Resolve a slug to one player, preferring `tour`. undefined while loading; null if unknown. */
function useResolved(slug: string | undefined, tour?: Tour) {
  const q = useQuery({ queryKey: ['resolvePlayer', slug], queryFn: () => resolvePlayer(slug!), enabled: !!slug, retry: false });
  const player = q.data ? (tour && q.data.players.find(p => p.tour === tour)) || q.data.players[0] : undefined;
  return { q, player: q.isError && statusOf(q.error) === 404 ? null : player };
}

// ── Pair picker ──────────────────────────────────────────────────────────────

function Slot({
  label, player, other, onPick,
}: { label: string; player: DirectoryPlayer | null | undefined; other?: DirectoryPlayer | null; onPick: (p: DirectoryPlayer) => void }) {
  const [editing, setEditing] = useState(false);
  const tour = other?.tour;
  if (editing || !player) {
    return (
      <div style={{ minWidth: 0 }}>
        <div className="vs-slot-label">{label}</div>
        <div className="vs-slot-search">
          <SearchBox
            kind="players"
            tour={tour}
            exclude={other?.name}
            autoFocus={editing}
            placeholder={tour ? `Search ${tour === 'F' ? 'WTA' : 'ATP'} players` : 'Search players'}
            onPick={item => {
              setEditing(false);
              if (item.player) onPick(item.player);
            }}
            onEscape={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }
  return (
    <div style={{ minWidth: 0 }}>
      <div className="vs-slot-label">{label}</div>
      <button type="button" className="vs-slot" onClick={() => setEditing(true)} aria-label={`${label}: ${player.name}. Change`}>
        <span className="vs-slot-name">{player.name}</span>
        <span className="vs-slot-change">Change</span>
      </button>
    </div>
  );
}

function Picker({ a, b }: { a: DirectoryPlayer | null | undefined; b: DirectoryPlayer | null | undefined }) {
  const navigate = useNavigate();
  const go = (x?: DirectoryPlayer | null, y?: DirectoryPlayer | null) => {
    if (x && y) navigate(versusPath(x.name, y.name));
    else if (x) navigate(`/versus?a=${slugify(x.name)}`);
    else if (y) navigate(`/versus?a=${slugify(y.name)}`);
  };
  return (
    <section className="vs-picker" aria-label="Choose two players">
      <p className="cv-eyebrow" style={{ margin: '0 0 10px' }}>Matchup</p>
      <div className="vs-slots">
        <Slot label="Player A" player={a} other={b} onPick={p => go(p, b)} />
        <button type="button" className="vs-swap" aria-label="Swap players" disabled={!a || !b} onClick={() => go(b, a)}>⇄</button>
        <Slot label="Player B" player={b} other={a} onPick={p => go(a, p)} />
      </div>
    </section>
  );
}

function Rivalries() {
  return (
    <section style={{ padding: '12px 0 40px' }}>
      <h2 className="cv-h2" style={{ marginBottom: 12 }}>Popular rivalries</h2>
      <div className="vs-rivalries">
        {RIVALRIES.map(([label, tour, x, y]) => (
          <Link key={label} to={versusPath(x, y)} className="vs-rivalry">
            <span style={{ fontSize: 17, fontWeight: 600 }}>{label}</span>
            <TourTag tour={tour} />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Head-to-head blocks ───────────────────────────────────────────────────────

function Headline({ a, b, data, summary }: { a: DirectoryPlayer; b: DirectoryPlayer; data: H2HResponse; summary: string }) {
  const wa = data.summary.wins_a;
  const wb = data.summary.wins_b;
  const facts = meetingFacts(data.matches);
  const [sa, sb] = shortNames(a.name, b.name);
  const short = (n: string) => (n === a.name ? sa : n === b.name ? sb : n);
  const side = (p: DirectoryPlayer, w: number, other: number, align: 'left' | 'right') => (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <Link to={playerPath(p.name)} className="vs-name" style={{ fontWeight: w > other ? 700 : 500 }}>{p.name}</Link>
      {w > other && <span className="vs-leads">LEADS</span>}
    </div>
  );
  return (
    <section className="vs-head" aria-label="Head-to-head record">
      <div className="vs-score-row">
        {side(a, wa, wb, 'right')}
        <div className="vs-score" aria-label={`${a.name} ${wa}, ${b.name} ${wb}`}>
          <span style={{ color: wa >= wb ? 'var(--ink)' : 'var(--ink2)' }}>{wa}</span>
          <span className="vs-score-dash" aria-hidden="true">–</span>
          <span style={{ color: wb >= wa ? 'var(--acc)' : 'var(--ink2)' }}>{wb}</span>
        </div>
        {side(b, wb, wa, 'left')}
      </div>
      <p className="vs-sub">{summary} · walkovers excluded</p>
      {facts && (
        <div className="vs-facts">
          <div>
            <div className="cv-figure-label-sm">First meeting</div>
            <div className="vs-fact-v">{fmtDate(facts.first.date)}</div>
            <div className="cv-muted" style={{ fontSize: 14 }}>{facts.first.tournament} {facts.first.round} · {short(facts.first.winner_name)} won</div>
          </div>
          <div>
            <div className="cv-figure-label-sm">Last meeting</div>
            <div className="vs-fact-v">{fmtDate(facts.last.date)}</div>
            <div className="cv-muted" style={{ fontSize: 14 }}>{facts.last.tournament} {facts.last.round} · {short(facts.last.winner_name)} won {facts.last.score}</div>
          </div>
          <div>
            <div className="cv-figure-label-sm">Current run</div>
            <div className="vs-fact-v">
              {short(facts.last.winner_name)} has won the last {facts.run === 1 ? 'meeting' : facts.run}
            </div>
            <div className="cv-muted" style={{ fontSize: 14 }}>{facts.run > 1 ? `since ${fmtDate(facts.runSince.date)}` : ''}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function SplitTable({ title, lines, sa, sb, glyphs }: { title: string; lines: SplitLine[]; sa: string; sb: string; glyphs?: boolean }) {
  return (
    <div role="table" aria-label={`Head-to-head by ${title.toLowerCase()}`}>
      <div role="row" className="vs-split-row vs-split-row--head">
        <span role="columnheader" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{title}</span>
        <span role="columnheader" style={{ textAlign: 'right' }}>{sa}</span>
        <span aria-hidden="true" />
        <span role="columnheader">{sb}</span>
      </div>
      {lines.map(l => (
        <div role="row" key={l.label} className="vs-split-row">
          <span role="rowheader">{glyphs && isSurface(l.label) ? <SurfaceTag surface={l.label} /> : l.label}</span>
          <span role="cell" style={{ textAlign: 'right', fontWeight: l.a > l.b ? 700 : 400 }}>{l.a}</span>
          <span aria-hidden="true" className="vs-split-bar">
            <span style={{ flex: l.a, background: 'var(--ink)' }} />
            <span style={{ flex: l.b, background: 'var(--acc)' }} />
          </span>
          <span role="cell" style={{ fontWeight: l.b > l.a ? 700 : 400 }}>{l.b}</span>
        </div>
      ))}
    </div>
  );
}

function Momentum({ a, data, sa, sb }: { a: DirectoryPlayer; data: H2HResponse; sa: string; sb: string }) {
  const phone = useViewportWidth() < 760;
  const oldestFirst = [...data.matches].reverse();
  return (
    <Section id="mom" title="Momentum" question={`Every meeting in date order: ${sa} wins above the line, ${sb} wins below. Select one to open it.`}>
      <div className="vs-mom">
        <div aria-hidden="true" className="vs-mom-axis"><span>{sa}</span><span style={{ color: 'var(--acc)' }}>{sb}</span></div>
        <ol className="vs-mom-list" style={{ gridTemplateColumns: `repeat(${oldestFirst.length}, minmax(0, 1fr))` }}>
          {oldestFirst.map((m, i) => {
            const aWon = m.winner_name === a.name;
            const label = `${fmtDate(m.date)}, ${m.tournament} ${m.round}: ${aWon ? sa : sb} won ${m.score}`;
            const index = oldestFirst.length - 1 - i;
            return (
              <li key={`${m.date}${m.round}`} className="vs-mom-item">
                <a href={`#meeting-${index}`} className="vs-mom-cell" aria-label={label} title={label}>
                  <span style={{ background: aWon ? 'var(--ink)' : 'transparent', color: 'var(--bg)' }}>{aWon && !phone ? m.round : ''}</span>
                  <span className="vs-mom-line" />
                  <span style={{ background: aWon ? 'transparent' : 'var(--acc)', color: 'var(--onacc)' }}>{!aWon && !phone ? m.round : ''}</span>
                </a>
                <span className="vs-mom-year" aria-hidden="true">{phone ? `’${m.date.slice(2, 4)}` : m.date.slice(0, 4)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}

function Meetings({ a, data, sa }: { a: DirectoryPlayer; data: H2HResponse; sa: string }) {
  const card = useViewportWidth() <= CARD_ROWS_MAX;
  return (
    <Section id="meet" title="Every meeting" question={`Newest first. W / L is from ${sa}’s side. Open a row for both players’ statistics.`}>
      {!card && (
        <div className="cv-match-head" aria-hidden="true">
          <span /><span>Date</span><span>Event</span><span>Rd</span><span>Surface</span><span>Winner</span><span>Loser</span><span>Score</span><span style={{ textAlign: 'right' }}>Time</span><span />
        </div>
      )}
      {data.matches.map((m, i) => (
        <div key={`${m.date}${m.round}${i}`} id={`meeting-${i}`} className="vs-meeting">
          <MatchRow m={fromWinnerLoser(m, a.name)} card={card} />
        </div>
      ))}
    </Section>
  );
}

// ── The two careers ──────────────────────────────────────────────────────────

function useCareer(p: DirectoryPlayer) {
  const who = { player: p.name, tour: p.tour };
  const summary = useQuery({ queryKey: ['pl-summary', who], queryFn: () => fetchPlayerSummary(who) });
  const topn = useQuery({ queryKey: ['pl-topn', who], queryFn: () => fetchTopNRecords(who) });
  const serve = useQuery({ queryKey: ['pl-serve', who], queryFn: () => fetchPlayerServeStats(who) });
  const ret = useQuery({ queryKey: ['pl-return', who], queryFn: () => fetchPlayerReturnStats(who) });
  return { summary, topn, serve, ret, pending: summary.isPending || topn.isPending || serve.isPending || ret.isPending };
}

function Careers({ a, b }: { a: DirectoryPlayer; b: DirectoryPlayer }) {
  const A = useCareer(a);
  const B = useCareer(b);
  const failed = [A, B].some(c => c.summary.isError);
  let lines: CareerLine[] = [];
  if (A.summary.data && B.summary.data) {
    const sa = A.summary.data;
    const sb = B.summary.data;
    const pct = (w: number, t: number) => (t ? (w / t) * 100 : null);
    const top10 = (c: typeof A) => {
      const [w, l] = (c.topn.data?.top10?.['W-L'] ?? '').split('-').map(Number);
      return Number.isFinite(w) && Number.isFinite(l) ? { w, l, p: pct(w, w + l) } : null;
    };
    const ta = top10(A);
    const tb = top10(B);
    const p1 = (v: number) => fmtPct(v);
    lines = [
      compareLine('Career record', pct(sa.wins, sa.total), pct(sb.wins, sb.total), p1, false, [
        `${sa.wins}–${sa.losses} · ${fmtPct(pct(sa.wins, sa.total))}`, `${sb.wins}–${sb.losses} · ${fmtPct(pct(sb.wins, sb.total))}`,
      ]),
      compareLine('Career-high rank', sa.career_high_rank, sb.career_high_rank, fmtRank, true),
      compareLine('Grand Slam titles', sa.gs_titles, sb.gs_titles, String),
      compareLine('Tour titles', sa.tour_titles, sb.tour_titles, String),
      compareLine('vs top 10', ta?.p, tb?.p, p1, false, [
        ta ? `${ta.w}–${ta.l} · ${fmtPct(ta.p)}` : '—', tb ? `${tb.w}–${tb.l} · ${fmtPct(tb.p)}` : '—',
      ]),
      compareLine('Ace %', A.serve.data?.['ace%'], B.serve.data?.['ace%'], p1),
      compareLine('1st serve won', A.serve.data?.['1st_win%'], B.serve.data?.['1st_win%'], p1),
      compareLine('2nd serve won', A.serve.data?.['2nd_win%'], B.serve.data?.['2nd_win%'], p1),
      compareLine('Break points saved', A.serve.data?.['bp_saved%'], B.serve.data?.['bp_saved%'], p1),
      compareLine('1st-serve return won', A.ret.data?.['1st_return_win%'], B.ret.data?.['1st_return_win%'], p1),
      compareLine('2nd-serve return won', A.ret.data?.['2nd_return_win%'], B.ret.data?.['2nd_return_win%'], p1),
      compareLine('Break points converted', A.ret.data?.['bp_converted%'], B.ret.data?.['bp_converted%'], p1),
    ];
  }
  return (
    <Section id="car" title="The two careers" question="How do they compare overall? ● marks the better figure." note="Whole career · not filtered">
      {(A.pending || B.pending) && !failed && <SkeletonRows rows={8} height={42} />}
      {failed && <BlockError message="The career comparison didn’t load." onRetry={() => { void A.summary.refetch(); void B.summary.refetch(); }} />}
      {!A.pending && !B.pending && !failed && (
        <div role="table" aria-label="Career comparison">
          <div role="row" className="vs-careers-row vs-careers-row--head">
            <span role="columnheader">{a.name}</span><span role="columnheader" /><span role="columnheader">{b.name}</span>
          </div>
          {lines.map(l => (
            <div role="row" key={l.label} className="vs-careers-row">
              <span role="cell" className={l.better === 'a' ? 'vs-better' : undefined}>
                {l.better === 'a' && <span aria-label="better">● </span>}{l.a}
              </span>
              <span role="rowheader" className="vs-careers-label">{l.label}</span>
              <span role="cell" className={l.better === 'b' ? 'vs-better' : undefined}>
                {l.b}{l.better === 'b' && <span aria-label="better"> ●</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function PairBody({ a, b }: { a: DirectoryPlayer; b: DirectoryPlayer }) {
  const defaults = useMemo<Filters>(() => ({ tour: a.tour, surface: 'All', level: 'All', from: null, to: null }), [a.tour]);
  const { filters, setFilters, resetFilters } = useFilters(defaults, FILTER_KEYS);
  const api = toApiParams(filters);
  const h2h = useQuery({
    queryKey: ['h2h', a.name, b.name, api],
    queryFn: () => fetchH2H({
      player_a: a.name, player_b: b.name, tour: a.tour,
      surface: api.surface, level: api.level, year_min: api.year_min, year_max: api.year_max,
    }),
  });
  const active = countActive(filters, defaults);
  const span: [number, number] = [
    Math.min(a.first_year ?? 1968, b.first_year ?? 1968),
    Math.max(a.last_year ?? new Date().getFullYear(), b.last_year ?? new Date().getFullYear()),
  ];
  const summary = describeFilters(filters, 'All meetings', span);
  const [sa, sb] = shortNames(a.name, b.name);
  const data = h2h.data;
  const total = data ? data.summary.wins_a + data.summary.wins_b : 0;

  const neverText = active
    ? `${sa} and ${sb} never met${filters.surface !== 'All' ? ` on ${filters.surface.toLowerCase()}` : ''} under these filters.`
    : `${a.name} and ${b.name} have never met.`;

  return (
    <>
      <div className="cv-filterbar--bleed" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <FilterBar
          value={filters}
          onChange={setFilters}
          onReset={resetFilters}
          active={active}
          summary={summary}
          detail={data ? `${total} meeting${total === 1 ? '' : 's'}` : undefined}
          yearMin={span[0]}
          yearMax={span[1]}
        />
      </div>
      {h2h.isPending && <div style={{ padding: '40px 0' }}><Skeleton><div className="cv-block-skel" style={{ height: 150 }} /></Skeleton></div>}
      {h2h.isError && <div style={{ padding: '40px 0' }}><BlockError message="The head-to-head didn’t load." onRetry={() => h2h.refetch()} /></div>}
      {data && total === 0 && (
        <section className="cv-empty" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="cv-h2" style={{ textWrap: 'balance' }}>{neverText}</h2>
          <p>{active ? 'Clear the filters to see every meeting.' : 'The career comparison is below.'}</p>
          {active > 0 && <button type="button" className="cv-btn cv-btn--primary" onClick={resetFilters}>Clear filters</button>}
        </section>
      )}
      {data && total > 0 && (
        <>
          <Headline a={a} b={b} data={data} summary={summary} />
          <Section id="split" title="Where they’ve met" question="Who wins on each surface and at each level? Combinations where they’ve never met are left out.">
            <div className="vs-splits">
              <SplitTable title="Surface" sa={sa} sb={sb} glyphs lines={pivotWins(data.by_surface, r => r.surface, a.name, b.name, SURFACE_ORDER)} />
              <SplitTable title="Level" sa={sa} sb={sb} lines={pivotWins(data.by_level, r => r.level_name, a.name, b.name, LEVEL_ORDER)} />
            </div>
          </Section>
          <Momentum a={a} data={data} sa={sa} sb={sb} />
          <Meetings a={a} data={data} sa={sa} />
        </>
      )}
      <Careers a={a} b={b} />
    </>
  );
}

export default function VersusPage() {
  const { a: slugA, b: slugB } = useParams();
  const [search] = useSearchParams();
  const tour = asTour(search.get('tour'));
  const A = useResolved(slugA ?? search.get('a') ?? undefined, tour);
  const B = useResolved(slugB, A.player?.tour ?? tour);
  const pair = slugA && slugB;
  useDocumentTitle(A.player && B.player ? shortNames(A.player.name, B.player.name).join(' vs ') : 'Matchup');

  let problem: string | null = null;
  if (pair && (A.player === null || B.player === null)) {
    problem = `No player called ‘${A.player === null ? slugA : slugB}’.`;
  } else if (A.player && B.player && A.player.tour !== B.player.tour) {
    problem = `${A.player.name} and ${B.player.name} play on different tours, so they can’t have met.`;
  } else if (A.player && B.player && A.player.name === B.player.name) {
    problem = 'Pick two different players.';
  }

  return (
    <main className="cv-main">
      <Picker a={A.player} b={B.player} />
      {!pair && <Rivalries />}
      {pair && (A.q.isPending || B.q.isPending) && <SkeletonRows rows={4} />}
      {pair && (A.q.isError || B.q.isError) && !problem && (
        <BlockError message="These players didn’t load." onRetry={() => { void A.q.refetch(); void B.q.refetch(); }} />
      )}
      {problem && (
        <section className="cv-empty">
          <h2 className="cv-h2">{problem}</h2>
          <p>Choose players with the search above.</p>
        </section>
      )}
      {pair && A.player && B.player && !problem && (
        <PairBody key={`${A.player.name}|${B.player.name}`} a={A.player} b={B.player} />
      )}
    </main>
  );
}
