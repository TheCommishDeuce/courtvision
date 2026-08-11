import { Link } from 'react-router-dom';
import { useH2H } from '../../../hooks';
import AdaptiveTable, { type Column } from '../../tables/AdaptiveTable';
import SectionHeader from '../../ui/SectionHeader';
import Spinner from '../../ui/Spinner';
import EmptyState from '../../ui/EmptyState';
import QueryError from '../../ui/QueryError';
import SurfaceTag from '../../ui/SurfaceTag';
import MatchStatsPanel, { type SideStats } from '../../ui/MatchStatsPanel';
import MomentumTimeline from '../../charts/MomentumTimeline';
import { CHART } from '../../charts/theme';
import { fmtTime, lastName, surfaceClass } from '../../../utils';
import type { BySurface, H2HRow } from '../../../types/tennis';
import type { VersusFilters } from './filters';

function computeSurfaceSplits(bySurface: BySurface[], playerA: string, playerB: string) {
  const out: Record<string, { a: number; b: number }> = {};
  for (const row of bySurface) {
    if (!out[row.surface]) out[row.surface] = { a: 0, b: 0 };
    if (row.winner_name === playerA) out[row.surface].a += row.wins;
    else if (row.winner_name === playerB) out[row.surface].b += row.wins;
  }
  return out;
}

function sideStats(m: H2HRow, isWinner: boolean): SideStats {
  return isWinner
    ? {
        aces: m.winner_aces, dfs: m.winner_dfs, pts: m.winner_pts, firsts: m.winner_firsts,
        fwon: m.winner_fwon, swon: m.winner_swon, saved: m.winner_saved, chances: m.winner_chances,
      }
    : {
        aces: m.loser_aces, dfs: m.loser_dfs, pts: m.loser_pts, firsts: m.loser_firsts,
        fwon: m.loser_fwon, swon: m.loser_swon, saved: m.loser_saved, chances: m.loser_chances,
      };
}

/** One surface, two counts, and a bar showing who owns it. */
function SurfaceRow({ surface, a, b }: { surface: string; a: number; b: number }) {
  const total = a + b;
  const pctA = total > 0 ? (a / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-[var(--rule)] last:border-b-0">
      <span
        className={`ba-mono ba-agate font-bold tracking-[0.11em] uppercase w-[52px] text-center px-1 py-[1px] ${surfaceClass(surface, 'ba-surface-hard')}`}
      >
        {surface}
      </span>
      <span className="ba-figure text-[var(--clay)] w-[3ch] text-right">{a}</span>
      <div className="flex-1 h-[3px] bg-[var(--rule)] flex overflow-hidden">
        <div className="h-full bg-[var(--clay)]" style={{ width: `${pctA}%` }} />
        <div className="h-full bg-[var(--ink)]" style={{ width: `${100 - pctA}%` }} />
      </div>
      <span className="ba-figure text-[var(--ink)] w-[3ch]">{b}</span>
    </div>
  );
}

export default function H2HSection({ f }: { f: VersusFilters }) {
  const { data: h2h, isFetching, isError, refetch } = useH2H(
    {
      player_a: f.playerA,
      player_b: f.playerB,
      tour: f.tour,
      surface: f.surface === 'All' ? undefined : f.surface,
      level: f.level || undefined,
      year_min: f.yearRange[0],
      year_max: f.yearRange[1],
    },
    f.enabled,
  );

  if (!f.enabled) return null;
  if (isError) {
    return (
      <QueryError
        title="The head-to-head did not load"
        message="Retry, or check both player names."
        onRetry={() => refetch()}
      />
    );
  }
  if (isFetching && !h2h) return <Spinner />;
  if (!h2h) return null;

  if (h2h.matches.length === 0) {
    return (
      <section id="h2h">
        <SectionHeader title="Head to head" kicker="No meetings on record" />
        <EmptyState
          title="These two never met under these filters"
          message="Widen the surface, level or year range — or they genuinely never played."
        />
      </section>
    );
  }

  const splits = computeSurfaceSplits(h2h.by_surface, f.playerA, f.playerB);
  const orderedSurfaces = ['Hard', 'Clay', 'Grass', 'Carpet'].filter(s => splits[s]);
  const showSplit = f.surface === 'All' && orderedSurfaces.length > 0;

  const { wins_a: winsA, wins_b: winsB } = h2h.summary;
  const leader = winsA > winsB ? f.playerA : winsB > winsA ? f.playerB : null;

  const columns: Column<H2HRow>[] = [
    {
      key: 'date',
      header: 'Date',
      hideOnCard: true,
      cell: m => (
        <span className="ba-mono ba-meta text-[var(--mute)] whitespace-nowrap">
          {m.date?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'tournament',
      header: 'Event',
      hideOnCard: true,
      className: 'max-w-[190px] truncate',
      cell: m => (
        <Link
          to={`/tournament?t=${encodeURIComponent(m.tournament)}&year=${m.date?.slice(0, 4)}&tour=${f.tour}`}
          className="text-[var(--ink-2)] hover:text-[var(--clay-deep)]"
        >
          {m.tournament}
        </Link>
      ),
    },
    { key: 'surface', header: 'Surf', cell: m => <SurfaceTag surface={m.surface} /> },
    {
      key: 'level_name',
      header: 'Level',
      hideOnCard: true,
      cell: m => <span className="ba-meta text-[var(--ink-2)]">{m.level_name}</span>,
    },
    {
      key: 'round',
      header: 'Rnd',
      cell: m => <span className="ba-mono ba-meta text-[var(--ink-2)]">{m.round}</span>,
    },
    {
      key: 'winner_name',
      header: 'Won by',
      cell: m => (
        <span
          className={`font-semibold whitespace-nowrap ${
            m.winner_name === f.playerA ? 'text-[var(--clay)]' : 'text-[var(--ink)]'
          }`}
        >
          {lastName(m.winner_name)}
          {m.is_retirement && <span className="ba-mono ba-agate text-[var(--mute)] ml-1">ret.</span>}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      cell: m => <span className="ba-mono ba-meta whitespace-nowrap">{m.score}</span>,
    },
    {
      key: 'time',
      header: 'Time',
      num: true,
      hideOnCard: true,
      cell: m => <span className="text-[var(--mute)]">{fmtTime(m.time)}</span>,
    },
  ];

  return (
    <section id="h2h" className="space-y-4">
      <SectionHeader
        title="Head to head"
        kicker={`${h2h.matches.length} ${h2h.matches.length === 1 ? 'meeting' : 'meetings'}`}
      />

      <div className={showSplit ? 'ba-spread' : ''}>
        {/* The rivalry score. One clay block, the page's single loudest
            element — and the reason anyone opened this page, so it is set at
            the hero figure size rather than merely larger than the table. */}
        <div className="ba-kpi ba-kpi-hero">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 mb-[var(--space-sm)]">
            <span className="ba-label text-[var(--on-clay-soft)]">Rivalry score</span>
            {leader && (
              <span className="ba-label text-[var(--on-clay-soft)]">
                {lastName(leader)} leads
              </span>
            )}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-[var(--space-xs)]">
            <div className="text-right min-w-0">
              <div className="ba-mono ba-meta text-[var(--on-clay-soft)] mb-0.5 truncate">
                {h2h.summary.player_a}
              </div>
              <div className="ba-stat-hero text-[var(--on-clay)]">{winsA}</div>
            </div>
            {/* Full strength, not 60%: at the hero size the two figures sit far
                enough apart that a faint dash stopped reading as "16–24" and
                started reading as two separate numbers. */}
            <div className="ba-stat text-[var(--on-clay-soft)]">–</div>
            <div className="text-left min-w-0">
              <div className="ba-mono ba-meta text-[var(--on-clay-soft)] mb-0.5 truncate">
                {h2h.summary.player_b}
              </div>
              <div className="ba-stat-hero text-[var(--on-clay)]">{winsB}</div>
            </div>
          </div>
        </div>

        {showSplit && (
          <div className="ba-card">
            <div className="ba-board-title border-b border-[var(--rule-ink)] pb-1.5 mb-1">
              Wins by surface
            </div>
            {orderedSurfaces.map(s => (
              <SurfaceRow key={s} surface={s} a={splits[s].a} b={splits[s].b} />
            ))}
          </div>
        )}
      </div>

      <div className="ba-card">
        <MomentumTimeline
          matches={h2h.matches}
          playerA={f.playerA}
          playerB={f.playerB}
          colorA={CHART.clay}
          colorB={CHART.ink}
        />
      </div>

      <div>
        <SectionHeader
          level="sub"
          title="Every meeting"
          kicker="Click a row for point stats"
        />
        <AdaptiveTable
          rows={h2h.matches}
          columns={columns}
          rowKey={(m, i) => `${m.date}-${i}`}
          density="dense"
          cardTitle={m => `${lastName(m.winner_name)} beat ${lastName(m.winner_name === f.playerA ? f.playerB : f.playerA)}`}
          cardMeta={m => `${m.date?.slice(0, 10)} · ${m.tournament} · ${m.round}`}
          unit="meetings"
          expand={m =>
            m.winner_pts == null ? (
              <div className="bg-[var(--paper-sunken)] px-3 py-3 text-center ba-kicker">
                No point-level stats recorded for this match.
              </div>
            ) : (
              <MatchStatsPanel
                a={sideStats(m, m.winner_name === f.playerA)}
                b={sideStats(m, m.winner_name !== f.playerA)}
                aLabel={lastName(f.playerA)}
                bLabel={lastName(f.playerB)}
              />
            )
          }
        />
      </div>
    </section>
  );
}
