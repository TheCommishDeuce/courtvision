import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMetaStats, useRecentUpsets, useRecentChampions, useStorylines } from '../hooks';
import Spinner from '../components/ui/Spinner';
import KPIBlock from '../components/ui/KPIBlock';
import type { RecentUpset, RecentChampion } from '../types/tennis';
import { surfaceClass } from '../utils';
import QueryError from '../components/ui/QueryError';
import SectionHeader from '../components/ui/SectionHeader';

const NAV_CARDS = [
  { to: '/h2h',        num: '01', title: 'Head-to-Head',      desc: 'Two players, every match, every surface. Filter by level and era.' },
  { to: '/player',     num: '02', title: 'Player Profile',    desc: 'Career arcs, ranking history, serve & return fingerprints.' },
  { to: '/compare',    num: '03', title: 'Comparison',        desc: 'Side-by-side metrics with radar profiles and title splits.' },
  { to: '/tournament', num: '04', title: 'Tournament Recap',  desc: 'Draw results, upsets, and stat leaders for any event.' },
  { to: '/leaders',    num: '05', title: 'Stat Leaders',      desc: 'Editorial leaderboards across wins, serve, return, streaks.' },
  { to: '/search',     num: '06', title: 'Match Search',      desc: 'Filter any match by anything. Export to CSV.' },
];

function StatRow({ label, value, last = false }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 px-1 py-3 flex-1 ${last ? '' : 'border-b border-[var(--rule)]'}`}>
      <span className="ba-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--mute)]">{label}</span>
      <span className="ba-stat-sm text-[var(--ink)]">{value}</span>
    </div>
  );
}

function ChampionsFeed({ tour, label }: { tour: string; label: string }) {
  const { data: champions, isLoading, isError, refetch } = useRecentChampions(tour);
  const navigate = useNavigate();

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-[var(--rule)] pb-2 mb-3">
        <h3 className="ba-h2">
          {label} <span className="text-[var(--clay)]">Champions</span>
        </h3>
        <Link to={`/tournament?tour=${tour}`} className="ba-kicker hover:text-[var(--clay)] transition-colors">
          Browse →
        </Link>
      </header>
      {isLoading ? (
        <div className="py-6"><Spinner /></div>
      ) : isError ? (
        <QueryError message="Couldn't load recent champions." onRetry={() => refetch()} />
      ) : (
        <ul className="divide-y divide-[var(--rule)]">
          {(champions ?? []).slice(0, 6).map((c: RecentChampion, i) => (
            <li
              key={i}
              className="py-2.5 cursor-pointer group"
              onClick={() => navigate(`/tournament?t=${encodeURIComponent(c.tournament)}&year=${c.year}&tour=${tour}`)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/tournament?t=${encodeURIComponent(c.tournament)}&year=${c.year}&tour=${tour}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px]">
                    <Link
                      to={`/player?p=${encodeURIComponent(c.winner_name)}&tour=${tour}`}
                      className="font-semibold text-[var(--ink)] group-hover:text-[var(--clay-deep)]"
                      onClick={e => e.stopPropagation()}
                    >
                      {c.winner_name}
                    </Link>
                    <span className="mx-2 text-[var(--mute)] text-xs ba-mono">def</span>
                    <Link
                      to={`/player?p=${encodeURIComponent(c.loser_name)}&tour=${tour}`}
                      className="text-[var(--ink-2)] text-sm hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {c.loser_name}
                    </Link>
                  </div>
                  <div className="text-xs text-[var(--mute)] mt-1 flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 ba-mono uppercase tracking-wider ${surfaceClass(c.surface, 'ba-surface-hard')}`}>
                      {c.surface}
                    </span>
                    <span className="truncate">{c.tournament}</span>
                    <span className="ba-mono text-[10px] text-[var(--ink-2)]">{c.score}</span>
                  </div>
                </div>
                <div className="ba-mono text-[11px] text-[var(--mute)] whitespace-nowrap pt-1">{c.date?.slice(0, 10)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpsetsFeed({ tour, label }: { tour: string; label: string }) {
  const { data: upsets, isLoading, isError, refetch } = useRecentUpsets(tour);

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-[var(--rule)] pb-2 mb-3">
        <h3 className="ba-h2">
          {label} <span className="text-[var(--clay)]">Upsets</span>
        </h3>
        <Link to="/search?upsets_only=true" className="ba-kicker hover:text-[var(--clay)] transition-colors">
          All →
        </Link>
      </header>
      {isLoading ? (
        <div className="py-6"><Spinner /></div>
      ) : isError ? (
        <QueryError message="Couldn't load recent upsets." onRetry={() => refetch()} />
      ) : (
        <ul className="divide-y divide-[var(--rule)]">
          {(upsets ?? []).slice(0, 6).map((u: RecentUpset, i) => (
            <li key={i} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px]">
                    <Link to={`/player?p=${encodeURIComponent(u.winner_name)}&tour=${tour}`} className="font-semibold text-[var(--ink)] hover:text-[var(--clay-deep)]">
                      {u.winner_name}
                    </Link>
                    {u.winner_rank && <span className="text-[var(--mute)] text-[11px] ml-1 ba-mono">#{u.winner_rank}</span>}
                    <span className="mx-2 text-[var(--mute)] text-xs ba-mono">def</span>
                    <Link to={`/player?p=${encodeURIComponent(u.loser_name)}&tour=${tour}`} className="text-[var(--ink-2)] text-sm hover:underline">
                      {u.loser_name}
                    </Link>
                    {u.loser_rank && <span className="text-[var(--mute)] text-[11px] ml-1 ba-mono">#{u.loser_rank}</span>}
                    {u.rank_diff && (
                      <span className="ml-2 inline-flex items-center gap-1 ba-mono text-[10px] text-[var(--clay)] font-bold">
                        Δ{Math.round(u.rank_diff)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--mute)] mt-1 truncate">
                    <Link
                      to={`/tournament?t=${encodeURIComponent(u.tournament)}&year=${u.date?.slice(0, 4)}&tour=${tour}`}
                      className="hover:text-[var(--clay-deep)]"
                    >
                      {u.tournament}
                    </Link>
                    <span className="mx-1.5 text-[var(--rule)]">·</span>
                    {u.round}
                    <span className="mx-1.5 text-[var(--rule)]">·</span>
                    <span className="ba-mono text-[var(--ink-2)]">{u.score}</span>
                  </div>
                </div>
                <div className="ba-mono text-[11px] text-[var(--mute)] whitespace-nowrap pt-1">{u.date?.slice(0, 10)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HomePage() {
  const { data: stats } = useMetaStats();
  const { data: storylines } = useStorylines();
  const fmt = (n?: number) => (n != null ? n.toLocaleString() : '—');

  return (
    <div className="space-y-10">
      {/* ============ MASTHEAD ============ */}
      <section className="border-b border-[var(--rule)] pb-10">
        <div className="ba-kicker mb-4">Vol. 01 · ATP + WTA · Est. 2026</div>
        <h1 className="ba-display text-[clamp(52px,10vw,112px)] tracking-[-0.02em] ba-reveal">
          courtvision
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] text-[var(--ink-2)] leading-relaxed">
          A reading room for tennis data. Rivalries, careers, upsets, and every serve held or broken — indexed across both tours, searchable, and printable.
        </p>
      </section>

      {/* ============ HERO STATS ============ */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        <div className="md:col-span-7">
          <KPIBlock
            variant="hero"
            label="Matches Indexed · All-Time"
            value={fmt(stats?.total_matches)}
            sub={stats?.data_through ? <span>Data through {stats.data_through.slice(0, 10)}</span> : undefined}
            reveal
          />
        </div>
        <div className="md:col-span-5 flex flex-col justify-between border-t-2 border-[var(--ink)]">
          <StatRow label="Players"        value={fmt(stats?.total_players)} />
          <StatRow label="Tournaments"    value={fmt(stats?.total_tournaments)} />
          <StatRow label="Points Played"  value={fmt(stats?.total_points_played)} last />
        </div>
      </section>

      {/* ============ STORYLINES ============ */}
      {storylines && storylines.length > 0 && (
        <section>
          <SectionHeader title="Data Stories" kicker="Fresh from the feed" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {storylines.map((s, i) => (
              <Link
                key={`${s.type}-${i}`}
                to={s.link}
                className="block bg-[var(--bone-2)] border border-[var(--rule)] border-t-2 border-t-[var(--ink)] p-4 hover:border-t-[var(--clay)] hover:bg-[var(--bone-3)] transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="ba-mono text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--clay)]">{s.label ?? s.type.replace('_', ' ')}</span>
                  <span className="ba-stat-sm text-[var(--ink)]">{s.value}</span>
                </div>
                <div className="ba-h3">{s.headline}</div>
                <p className="text-[13px] text-[var(--ink-2)] leading-snug">{s.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ EXPLORE GRID ============ */}
      <section>
        <SectionHeader title="Explore" kicker="Six ways in" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {NAV_CARDS.map(card => (
            <Link
              key={card.to}
              to={card.to}
              className="group block bg-[var(--bone-2)] border border-[var(--rule)] border-t-2 border-t-[var(--ink)] p-5 hover:border-t-[var(--clay)] hover:bg-[var(--bone-3)] transition-colors"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="ba-mono text-[11px] font-bold tracking-[0.15em] text-[var(--clay)]">{card.num}</span>
                <span className="ba-mono text-[11px] text-[var(--mute)] group-hover:text-[var(--clay)] transition-colors">→</span>
              </div>
              <div className="ba-h3">{card.title}</div>
              <p className="text-[13.5px] text-[var(--ink-2)] leading-snug">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ FEEDS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ChampionsFeed tour="M" label="ATP" />
        <ChampionsFeed tour="F" label="WTA" />
        <UpsetsFeed tour="M" label="ATP" />
        <UpsetsFeed tour="F" label="WTA" />
      </div>
    </div>
  );
}
