/**
 * Home (brief 03-screens/home.md; prototype/Home.dc.html). Every block loads
 * and fails on its own; a failed block never takes the page down.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { get } from '../api/http';
import { useMetaStats, useRecentUpsets, useStorylines } from '../hooks';
import type { RecentChampion, RecentUpset, Storyline } from '../types/tennis';
import SearchBox from '../components/SearchBox';
import { BlockError, SkelBar, Skeleton } from '../components/States';
import { SurfaceTag, TourTag } from '../components/Tags';
import { LAB_EXAMPLES } from '../lab/examples';
import type { Tour } from '../lib/filters';
import { fmtDate, fmtDayMonth, fmtInt, fmtRankParen } from '../lib/format';
import { legacyRedirect } from '../lib/legacy';
import { fillSearch } from '../lib/searchBus';
import { playerPath, tournamentPath } from '../lib/slug';
import './home.css';

const CHIPS = ['Sinner vs Alcaraz', 'Iga Swiatek', 'Wimbledon 2025', 'Roland Garros'];
const TOURS: { tour: Tour; label: string }[] = [{ tour: 'M', label: 'ATP' }, { tour: 'F', label: 'WTA' }];

function Hero() {
  const { data } = useMetaStats();
  return (
    <section className="home-hero" aria-labelledby="hero-h">
      <h1 id="hero-h">Find the story in a century of tennis results</h1>
      <div className="home-hero-search">
        <SearchBox channel="hero" slashFocus placeholder="A player, a tournament, or two names" />
      </div>
      <div className="home-chips">
        <span className="home-sub" style={{ marginRight: 4 }}>Try</span>
        {CHIPS.map(q => (
          <button key={q} type="button" className="home-chip" onClick={() => fillSearch('hero', q)}>{q}</button>
        ))}
      </div>
      {data && (
        <p className="home-fresh">
          {fmtInt(data.total_matches)} matches · {data.year_min}–{data.year_max}
          {data.data_through && ` · data through ${fmtDate(data.data_through)}`}
        </p>
      )}
    </section>
  );
}

/** Storyline links predate v1 (`?tab=…&y0=…`); send them to the current address. */
const storyHref = (link: string): string => {
  const [path, search = ''] = link.split('?');
  return legacyRedirect(path, search ? `?${search}` : '') ?? link;
};

function LeadingCard({ s }: { s: Storyline }) {
  return (
    <Link to={storyHref(s.link)} className="home-card">
      <div className="home-card-top">
        <TourTag tour={s.tour} />
        <span className="home-card-label">{s.label}</span>
      </div>
      <div className="home-card-headline">{s.headline}</div>
      <div className="home-card-value">{s.value}</div>
      <div className="home-card-detail">{s.detail}</div>
      <div className="home-card-more">See the leaderboard →</div>
    </Link>
  );
}

function Leading() {
  const q = useStorylines();
  return (
    <section className="cv-section" aria-labelledby="lead-h">
      <div className="cv-section-head">
        <h2 id="lead-h" className="cv-h2">Leading this season</h2>
        <span className="home-sub">Tour level · {new Date().getFullYear()} · today’s four</span>
      </div>
      {q.isError ? (
        <BlockError message="This season’s leaders didn’t load. The rest of the page is unaffected." onRetry={() => q.refetch()} />
      ) : (
        <div className="home-cards">
          {q.isPending
            ? [0, 1, 2, 3].map(i => (
              <Skeleton key={i} label="Loading this season’s leaders">
                <div className="home-card home-card--skel" style={{ gap: 12 }}>
                  <SkelBar width="40%" />
                  <SkelBar width="90%" height={22} />
                  <SkelBar width="45%" height={40} />
                  <SkelBar width="75%" style={{ marginTop: 'auto' }} />
                </div>
              </Skeleton>
            ))
            : q.data.map(s => <LeadingCard key={`${s.type}-${s.tour}`} s={s} />)}
        </div>
      )}
    </section>
  );
}

function TryAsking() {
  return (
    <section className="cv-section" aria-labelledby="ask-h">
      <div className="cv-section-head" style={{ marginBottom: 10 }}>
        <h2 id="ask-h" className="cv-h2">Try asking</h2>
        <span className="home-sub">Each question opens the Lab with the query already run</span>
      </div>
      <div className="home-questions">
        {LAB_EXAMPLES.map(e => (
          <Link key={e.id} to={`/lab?example=${e.id}`} className="home-question">
            <span className="home-question-text">
              <span className="home-question-q">{e.question}</span>
              <span className="home-question-teaser">{e.teaser}</span>
            </span>
            <span aria-hidden="true" className="home-arrow">→</span>
          </Link>
        ))}
      </div>
      <Link to="/lab" className="home-more">Write your own →</Link>
    </section>
  );
}

function RowsSkeleton({ gap = false }: { gap?: boolean }) {
  return (
    <Skeleton>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--line2)', display: 'flex', gap: 16 }}>
          {gap && <SkelBar width={56} height={26} />}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkelBar width="55%" />
            <SkelBar width="85%" height={16} />
          </div>
        </div>
      ))}
    </Skeleton>
  );
}

function ChampionRow({ c, tour }: { c: RecentChampion; tour: Tour }) {
  return (
    <div className="home-row">
      <div className="home-row-meta">
        <Link to={tournamentPath(c.tournament, c.year, tour)} className="home-row-event">{c.tournament}</Link>
        <span>{c.level_name}</span>
        <SurfaceTag surface={c.surface} />
        <span style={{ marginLeft: 'auto' }}>{fmtDayMonth(c.date)}</span>
      </div>
      <div className="home-row-main">
        <span>
          <Link to={playerPath(c.winner_name)} className="home-winner">{c.winner_name}</Link>{' '}
          <span className="cv-muted">d.</span>{' '}
          <Link to={playerPath(c.loser_name)}>{c.loser_name}</Link>
        </span>
        <span className="home-row-score">{c.score}</span>
      </div>
    </div>
  );
}

/** The latest tour-level finals across weeks, so a quiet week still fills the column. */
const useLatestChampions = (tour: Tour) => useQuery({
  queryKey: ['champions', 'recent', tour],
  queryFn: () => get<RecentChampion[]>('/tournament/recent-champions', { tour, limit: 8, span: 'recent' }),
});

function ChampionColumn({ tour, label }: { tour: Tour; label: string }) {
  const q = useLatestChampions(tour);
  return (
    <div>
      <div className="home-col-head">{label}</div>
      {q.isPending && <RowsSkeleton />}
      {q.isError && <div style={{ marginTop: 12 }}><BlockError message={`${label} champions didn’t load.`} onRetry={() => q.refetch()} /></div>}
      {q.data?.map(c => <ChampionRow key={`${c.tournament}-${c.year}`} c={c} tour={tour} />)}
    </div>
  );
}

function Champions() {
  return (
    <section className="cv-section" aria-labelledby="champ-h">
      <h2 id="champ-h" className="cv-h2" style={{ marginBottom: 18 }}>Latest champions</h2>
      <div className="home-cols">
        {TOURS.map(t => <ChampionColumn key={t.tour} {...t} />)}
      </div>
      <Link to="/tournament" className="home-more">All tournaments →</Link>
    </section>
  );
}

function UpsetRow({ u }: { u: RecentUpset }) {
  const year = Number(u.date.slice(0, 4));
  return (
    <div className="home-upset">
      <span className="home-gap" aria-label={u.rank_diff != null ? `Ranking gap ${u.rank_diff}` : undefined}>
        {u.rank_diff != null ? `+${Math.round(u.rank_diff)}` : '—'}
      </span>
      <div className="home-upset-body">
        <div style={{ fontSize: 15 }}>
          <Link to={playerPath(u.winner_name)} className="home-winner">{u.winner_name}</Link>{' '}
          <span className="cv-muted">{fmtRankParen(u.winner_rank)} d.</span>{' '}
          <Link to={playerPath(u.loser_name)}>{u.loser_name}</Link>{' '}
          <span className="cv-muted">{fmtRankParen(u.loser_rank)}</span>
        </div>
        <div className="home-upset-meta">
          <Link to={tournamentPath(u.tournament, year, u.tour)}>{u.tournament}</Link>
          <span className="cv-mono">{u.round}</span>
          <span className="cv-mono">{u.score}</span>
          <span>{fmtDayMonth(u.date)}</span>
        </div>
      </div>
    </div>
  );
}

function UpsetColumn({ tour, label }: { tour: Tour; label: string }) {
  const q = useRecentUpsets(tour);
  const rows = [...(q.data ?? [])].sort((a, b) => (b.rank_diff ?? 0) - (a.rank_diff ?? 0)).slice(0, 6);
  return (
    <div>
      <div className="home-col-head">{label}</div>
      {q.isPending && <RowsSkeleton gap />}
      {q.isError && <div style={{ marginTop: 12 }}><BlockError message={`${label} upsets didn’t load.`} onRetry={() => q.refetch()} /></div>}
      {q.data && !rows.length && <p className="cv-muted">No upsets in recent weeks.</p>}
      {rows.map(u => <UpsetRow key={`${u.date}-${u.winner_name}-${u.loser_name}`} u={u} />)}
    </div>
  );
}

function Upsets() {
  return (
    <section className="cv-section" aria-labelledby="ups-h">
      <div className="cv-section-head" style={{ marginBottom: 18 }}>
        <h2 id="ups-h" className="cv-h2">Recent upsets</h2>
        <span className="home-sub">Biggest ranking gaps, last few weeks · gap = winner’s rank minus loser’s</span>
      </div>
      <div className="home-cols">
        {TOURS.map(t => <UpsetColumn key={t.tour} {...t} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="cv-main">
      <Hero />
      <Leading />
      <TryAsking />
      <Champions />
      <Upsets />
    </main>
  );
}
