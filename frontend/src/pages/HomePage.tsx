import { Link } from 'react-router-dom';
import {
  useMetaStats,
  useRecentChampions,
  useRecentUpsets,
  useStorylines,
} from '../hooks';
import Spinner from '../components/primitives/Spinner';
import QueryError from '../components/primitives/QueryError';
import SectionHeader from '../components/primitives/SectionHeader';
import SurfaceTag from '../components/primitives/SurfaceTag';
import AdaptiveTable, { type Column } from '../components/primitives/AdaptiveTable';
import type { RecentChampion, RecentUpset } from '../types/tennis';

/**
 * The counts that prove the claim in the lede, set as one scoreboard panel
 * directly under it. Four cells on a wide screen, two on a phone; the lead
 * figure takes the spark colour so the eye lands on the headline number.
 */
function Ledger({ className = '' }: { className?: string }) {
  const { data: stats } = useMetaStats();
  const fmt = (n?: number) => (n != null ? n.toLocaleString() : '—');

  const cells = [
    { label: 'Matches', value: fmt(stats?.total_matches), lead: true },
    { label: 'Players', value: fmt(stats?.total_players) },
    { label: 'Tournaments', value: fmt(stats?.total_tournaments) },
    { label: 'Points played', value: fmt(stats?.total_points_played) },
  ];

  return (
    // gap-px over a lighter ground: the gaps *are* the hairlines, so the panel
    // rules itself correctly at whichever column count the width picks.
    <dl
      className={`grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden
                  rounded-[var(--r-lg)] bg-white/10 shadow-[var(--shadow-2)] ${className}`}
    >
      {cells.map(c => (
        <div key={c.label} className="bg-score px-[var(--space-md)] py-[var(--space-sm)]">
          <dt className="ba-label text-on-clay-soft mb-1">{c.label}</dt>
          <dd className={`ba-stat-sm ${c.lead ? 'text-spark' : 'text-on-clay'}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PlayerLink({
  name,
  tour,
  strong,
  className = '',
}: {
  name: string;
  tour: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={`/player?p=${encodeURIComponent(name)}&tour=${tour}`}
      title={name}
      className={`${
        strong
          ? 'font-semibold text-ink hover:text-clay-deep'
          : 'text-ink-2 hover:text-clay-deep'
      } ${className}`}
    >
      {name}
    </Link>
  );
}

/**
 * One row per match, always — a name long enough to wrap turns a six-row table
 * into a nine-row one and the column stops scanning. `max-w-[1px]` with a
 * percentage width is the table-cell truncation idiom: the browser allocates
 * the percentage and the cell can no longer grow past it, so the inner span
 * ellipsises. The full name stays in the `title`.
 */
const CLIP = 'max-w-[1px] overflow-hidden';

/** Shared head for a tour block inside a column. */
function BlockHead({ label, to, more }: { label: string; to: string; more: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-rule pb-1 mb-1.5">
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
      className: `${CLIP} w-[31%]`,
      cell: u => (
        <span className="flex items-baseline gap-1 min-w-0">
          <PlayerLink name={u.winner_name} tour={tour} strong className="truncate min-w-0" />
          {u.winner_rank && (
            <span className="ba-mono ba-agate text-mute shrink-0">#{u.winner_rank}</span>
          )}
        </span>
      ),
    },
    {
      key: 'loser',
      header: 'Beat',
      hideOnCard: true,
      className: `${CLIP} w-[29%]`,
      cell: u => (
        <span className="flex items-baseline gap-1 min-w-0">
          <PlayerLink name={u.loser_name} tour={tour} className="truncate min-w-0" />
          {u.loser_rank && (
            <span className="ba-mono ba-agate text-mute shrink-0">#{u.loser_rank}</span>
          )}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      className: `${CLIP} w-[26%]`,
      cell: u => (
        <Link
          to={`/tournament?t=${encodeURIComponent(u.tournament)}&year=${u.date?.slice(0, 4)}&tour=${tour}`}
          title={u.tournament}
          className="ba-link-quiet block truncate"
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
        <span className="font-bold text-clay">
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
          message="Retry, or open the full upsets table."
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
      {/* These are this season's tour-level leaders, drawn at random from the
          Records boards — not, as the old header claimed, stories found in the
          week's data. The qualifier is stated once here so the four cards
          below don't each have to repeat it. */}
      <SectionHeader title="Leading this season" kicker="Tour-level events · a different four each visit" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-xs)]">
        {storylines.slice(0, 4).map((s, i) => (
          <Link
            key={`${s.type}-${i}`}
            to={s.link}
            className="ba-card-flat block px-[var(--space-md)] py-[var(--space-sm)]
                       transition-colors hover:border-clay hover:bg-clay-wash hover:no-underline"
          >
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className="ba-eyebrow">{s.label ?? s.type.replace(/_/g, ' ')}</span>
              <span className="ba-stat-sm text-ink">{s.value}</span>
            </div>
            {/* `detail` is deliberately not rendered: every one of them restates
                the headline and re-appends "this season", which the section
                kicker now says once. */}
            <div className="ba-h3">{s.headline}</div>
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
        <span className="ba-mono ba-agate text-mute whitespace-nowrap">
          {c.date?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      className: `${CLIP} w-[38%]`,
      cell: c => (
        <Link
          to={`/tournament?t=${encodeURIComponent(c.tournament)}&year=${c.year}&tour=${tour}`}
          title={c.tournament}
          className="ba-link-quiet block truncate"
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
      className: `${CLIP} w-[34%]`,
      cell: c => (
        <PlayerLink name={c.winner_name} tour={tour} strong className="block truncate" />
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
          message="Retry, or browse events by name."
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
  // Default flow, not `ba-flow-loose`. At `--space-xl` this was the only page
  // in the app spacing its blocks at ~60px while every other page ran at 20,
  // which read as emptiness rather than as air.
  return (
    <div className="ba-flow">
      {/* Lede — the claim, and directly beneath it the counts that prove it.
          The two are one block: separated by a full flow step, the ledger
          stopped reading as evidence for the headline above it. */}
      <section>
        <h1 className="ba-display max-w-4xl">Every match on record.</h1>
        <p className="ba-body mt-[var(--space-xs)] max-w-3xl">
          Rivalries, careers, and upsets — filter down to a single match, or
          query the tables yourself.
        </p>
        <Ledger className="mt-[var(--space-sm)]" />
      </section>

      <StorylinesRow />

      {/* Champions and upsets are peers, not a lede and a rail — and now that
          the upsets table carries an event column too, both hold four columns,
          so equal widths let the two read as one spread rather than as a main
          table with an afterthought beside it. */}
      {/* Two-up only from xl. Both blocks are four-column tables of full
          player names; side by side on a 1024px laptop each one gets ~470px
          and every name ellipsises to nothing. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[var(--space-lg)]">
        <section>
          <SectionHeader title="Latest champions" kicker="Most recent finals" />
          {/* The two tours are a pair under one header, not two sections. */}
          <div className="ba-flow ba-flow-tight">
            <ChampionsColumn tour="M" label="ATP" />
            <ChampionsColumn tour="F" label="WTA" />
          </div>
        </section>

        <section>
          <SectionHeader title="Biggest upsets" kicker="By ranking" />
          <div className="ba-flow ba-flow-tight">
            <UpsetsColumn tour="M" label="ATP" />
            <UpsetsColumn tour="F" label="WTA" />
          </div>
        </section>
      </div>
    </div>
  );
}
