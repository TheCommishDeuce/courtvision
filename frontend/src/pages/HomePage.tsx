import { Link } from 'react-router-dom';
import {
  useMetaStats,
  useRecentChampions,
  useRecentUpsets,
  useStorylines,
} from '../hooks';
import Spinner from '../components/ui/Spinner';
import QueryError from '../components/ui/QueryError';
import SectionHeader from '../components/ui/SectionHeader';
import SurfaceTag from '../components/ui/SurfaceTag';
import AdaptiveTable, { type Column } from '../components/tables/AdaptiveTable';
import type { RecentChampion, RecentUpset } from '../types/tennis';

/**
 * The counts that prove the claim in the lede, set as a hairline strip
 * directly under it — a broadsheet dateline carrying figures.
 */
function Ledger() {
  const { data: stats } = useMetaStats();
  const fmt = (n?: number) => (n != null ? n.toLocaleString() : '—');

  const cells = [
    { label: 'Matches', value: fmt(stats?.total_matches), lead: true },
    { label: 'Players', value: fmt(stats?.total_players) },
    { label: 'Tournaments', value: fmt(stats?.total_tournaments) },
    { label: 'Points played', value: fmt(stats?.total_points_played) },
  ];

  return (
    // gap-px over a rule-coloured ground: the gaps *are* the hairlines, so the
    // grid rules itself correctly at every wrap point.
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--rule)]
                   border-t-2 border-[var(--rule-ink)] border-b border-[var(--rule)]">
      {cells.map(c => (
        <div key={c.label} className="bg-[var(--paper)] px-[var(--space-sm)] py-[var(--space-xs)]">
          <dt className="ba-label mb-1">{c.label}</dt>
          <dd className={`ba-stat-sm ${c.lead ? 'text-[var(--clay)]' : 'text-[var(--ink)]'}`}>
            {c.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PlayerLink({ name, tour, strong }: { name: string; tour: string; strong?: boolean }) {
  return (
    <Link
      to={`/player?p=${encodeURIComponent(name)}&tour=${tour}`}
      className={
        strong
          ? 'font-semibold text-[var(--ink)] hover:text-[var(--clay-deep)]'
          : 'text-[var(--ink-2)] hover:text-[var(--clay-deep)]'
      }
    >
      {name}
    </Link>
  );
}

/** Shared head for a tour block inside a column. */
function BlockHead({ label, to, more }: { label: string; to: string; more: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--rule)] pb-1 mb-1.5">
      <h3 className="ba-board-title">{label}</h3>
      <Link to={to} className="ba-board-more ba-link ba-touch">{more} →</Link>
    </div>
  );
}

/**
 * One tour's biggest recent upsets.
 *
 * Sorted by ranking gap rather than date: the endpoint returns the most recent
 * upsets, and on any given week most of those are a #693 beating a #419 in a
 * Challenger qualifier. Ranking them by gap surfaces the ones worth reading.
 */
function UpsetsColumn({ tour, label }: { tour: string; label: string }) {
  const { data, isLoading, isError, refetch } = useRecentUpsets(tour);

  const rows = [...(data ?? [])]
    .sort((a, b) => (b.rank_diff ?? 0) - (a.rank_diff ?? 0))
    .slice(0, 6);

  // Four columns, matching the champions table beside it. The date is dropped
  // to the card meta line — these are all from the same week, so it never
  // distinguishes two rows — and the event takes its place, which also answers
  // the obvious next question: where did this happen?
  const columns: Column<RecentUpset>[] = [
    {
      key: 'winner',
      header: 'Winner',
      // The stacked card already names both players in its headline, so the
      // card carries only what that headline does not contain.
      hideOnCard: true,
      cell: u => (
        <>
          <PlayerLink name={u.winner_name} tour={tour} strong />
          {u.winner_rank && <span className="ba-mono ba-agate text-[var(--mute)] ml-1">#{u.winner_rank}</span>}
        </>
      ),
    },
    {
      key: 'loser',
      header: 'Beat',
      hideOnCard: true,
      cell: u => (
        <>
          <PlayerLink name={u.loser_name} tour={tour} />
          {u.loser_rank && <span className="ba-mono ba-agate text-[var(--mute)] ml-1">#{u.loser_rank}</span>}
        </>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      cell: u => (
        <Link
          to={`/tournament?t=${encodeURIComponent(u.tournament)}&year=${u.date?.slice(0, 4)}&tour=${tour}`}
          className="ba-link-quiet"
        >
          {u.tournament}
        </Link>
      ),
    },
    {
      key: 'gap',
      header: 'Gap',
      num: true,
      accentHeader: true,
      cardLabel: 'Ranking places',
      cell: u => (
        <span className="font-bold text-[var(--clay)]">
          {u.rank_diff != null ? Math.round(u.rank_diff) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <BlockHead label={label} to={`/records?tab=matches&tour=${tour}`} more={`All ${label} upsets`} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <QueryError
          title="Upsets did not load"
          message="The recent-upsets request failed."
          onRetry={() => refetch()}
        />
      ) : (
        <AdaptiveTable
          rows={rows}
          columns={columns}
          density="agate"
          pinFirst={false}
          rowKey={(u, i) => `${u.date}-${u.winner_name}-${i}`}
          cardTitle={u => `${u.winner_name} beat ${u.loser_name}`}
          cardMeta={u =>
            [u.date?.slice(0, 10), u.winner_rank && u.loser_rank ? `#${u.winner_rank} over #${u.loser_rank}` : null]
              .filter(Boolean)
              .join(' · ')
          }
          unit="upsets"
          emptyNote="No recent upsets on record."
        />
      )}
    </div>
  );
}

function StorylinesRow() {
  const { data: storylines } = useStorylines();
  if (!storylines?.length) return null;

  return (
    <section>
      <SectionHeader title="Data stories" kicker="Found in this week's data" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-xs)]">
        {storylines.slice(0, 4).map((s, i) => (
          <Link
            key={`${s.type}-${i}`}
            to={s.link}
            className="block bg-[var(--paper-raised)] border border-[var(--rule)] border-t-2 border-t-[var(--rule-ink)]
                       px-[var(--space-sm)] py-[var(--space-xs)] transition-colors
                       hover:border-t-[var(--clay)] hover:bg-[var(--clay-wash)]"
          >
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className="ba-eyebrow">{s.label ?? s.type.replace(/_/g, ' ')}</span>
              <span className="ba-stat-sm text-[var(--ink)]">{s.value}</span>
            </div>
            <div className="ba-h3">{s.headline}</div>
            <p className="ba-cell leading-snug text-[var(--ink-2)] mt-0.5">{s.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ChampionsColumn({ tour, label }: { tour: string; label: string }) {
  const { data: champions, isLoading, isError, refetch } = useRecentChampions(tour);
  const rows = (champions ?? []).slice(0, 6);

  const columns: Column<RecentChampion>[] = [
    {
      key: 'date',
      header: 'Date',
      hideOnCard: true,
      cell: c => (
        <span className="ba-mono ba-agate text-[var(--mute)] whitespace-nowrap">
          {c.date?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      cell: c => (
        <Link
          to={`/tournament?t=${encodeURIComponent(c.tournament)}&year=${c.year}&tour=${tour}`}
          className="ba-link-quiet"
        >
          {c.tournament}
        </Link>
      ),
    },
    { key: 'surface', header: 'Surf', cell: c => <SurfaceTag surface={c.surface} /> },
    {
      key: 'champion',
      header: 'Champion',
      // Already the card headline.
      hideOnCard: true,
      cell: c => (
        <span className="whitespace-nowrap">
          <PlayerLink name={c.winner_name} tour={tour} strong />
        </span>
      ),
    },
  ];

  return (
    <div>
      <BlockHead label={label} to={`/tournament?tour=${tour}`} more={`Browse ${label} events`} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <QueryError
          title="Champions did not load"
          message="The recent-champions request failed."
          onRetry={() => refetch()}
        />
      ) : (
        <AdaptiveTable
          rows={rows}
          columns={columns}
          density="dense"
          pinFirst={false}
          rowKey={(c, i) => `${c.tournament}-${c.year}-${i}`}
          cardTitle={c => c.winner_name}
          cardMeta={c => `${c.tournament} · ${c.date?.slice(0, 10)}`}
          unit="finals"
          emptyNote="No recent finals on record."
        />
      )}
    </div>
  );
}

export default function HomePage() {
  const { data: stats } = useMetaStats();
  const era = stats ? `${stats.year_min} to ${stats.year_max}` : 'the open era to today';

  return (
    <div className="ba-flow ba-flow-loose ba-rise">
      {/* Lede — what this is, in one sentence, over the counts that prove it. */}
      <section>
        <div className="ba-eyebrow mb-2">ATP + WTA match archive</div>
        <h1 className="ba-display max-w-4xl">Every match on record, both tours.</h1>
        <p className="ba-body mt-[var(--space-sm)] max-w-2xl">
          Rivalries, careers, upsets, and every serve held or broken — indexed from {era},
          filterable down to a single match, and exportable.
        </p>
      </section>

      <Ledger />

      <StorylinesRow />

      {/* Champions and upsets are peers, not a lede and a rail — and now that
          the upsets table carries an event column too, both hold four columns,
          so equal widths let the two read as one spread rather than as a main
          table with an afterthought beside it. */}
      <div className="ba-spread ba-spread-even">
        <section>
          <SectionHeader title="Latest champions" kicker="Most recent finals on record" />
          <div className="ba-flow">
            <ChampionsColumn tour="M" label="ATP" />
            <ChampionsColumn tour="F" label="WTA" />
          </div>
        </section>

        <section>
          <SectionHeader title="Biggest recent upsets" kicker="Ranking places jumped" />
          <div className="ba-flow">
            <UpsetsColumn tour="M" label="ATP" />
            <UpsetsColumn tour="F" label="WTA" />
          </div>
        </section>
      </div>
    </div>
  );
}
