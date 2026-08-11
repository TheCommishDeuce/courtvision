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
import type { RecentChampion, RecentUpset } from '../types/tennis';

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
                   border-t-2 border-[var(--ink)] border-b border-[var(--rule)]">
      {cells.map(c => (
        <div key={c.label} className="bg-[var(--paper)] px-3 py-2.5">
          <dt className="ba-label mb-1">{c.label}</dt>
          <dd className={`ba-stat-sm ${c.lead ? 'text-[var(--clay)]' : 'text-[var(--ink)]'}`}>
            {c.value}
          </dd>
        </div>
      ))}
    </dl>
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

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-1 mb-1.5">
        <h3 className="ba-board-title">{label}</h3>
        <Link to={`/records?tab=matches&tour=${tour}`} className="ba-board-more ba-link">
          All {label} upsets →
        </Link>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <QueryError
          title="Upsets did not load"
          message="The recent-upsets request failed."
          onRetry={() => refetch()}
        />
      ) : (
        <table className="ba-table ba-table-dense">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Winner</th>
              <th scope="col">Beat</th>
              <th scope="col" className="num" title="Ranking places between the two players">
                Gap
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u: RecentUpset, i) => (
              <tr key={`${u.date}-${u.winner_name}-${i}`}>
                <td className="ba-mono text-[11px] text-[var(--mute)] whitespace-nowrap">
                  {u.date?.slice(0, 10)}
                </td>
                <td className="whitespace-nowrap">
                  <Link
                    to={`/player?p=${encodeURIComponent(u.winner_name)}&tour=${tour}`}
                    className="font-semibold text-[var(--ink)] hover:text-[var(--clay-deep)]"
                  >
                    {u.winner_name}
                  </Link>
                  {u.winner_rank && (
                    <span className="ba-mono text-[10px] text-[var(--mute)] ml-1">#{u.winner_rank}</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <Link
                    to={`/player?p=${encodeURIComponent(u.loser_name)}&tour=${tour}`}
                    className="text-[var(--ink-2)] hover:text-[var(--clay-deep)]"
                  >
                    {u.loser_name}
                  </Link>
                  {u.loser_rank && (
                    <span className="ba-mono text-[10px] text-[var(--mute)] ml-1">#{u.loser_rank}</span>
                  )}
                </td>
                <td className="num font-bold text-[var(--clay)]">
                  {u.rank_diff != null ? Math.round(u.rank_diff) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {storylines.slice(0, 4).map((s, i) => (
          <Link
            key={`${s.type}-${i}`}
            to={s.link}
            className="block bg-[var(--paper-raised)] border border-[var(--rule)] border-t-2 border-t-[var(--ink)]
                       px-3 py-2.5 transition-colors hover:border-t-[var(--clay)] hover:bg-[var(--clay-wash)]"
          >
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className="ba-eyebrow">{s.label ?? s.type.replace(/_/g, ' ')}</span>
              <span className="ba-stat-sm text-[var(--ink)]">{s.value}</span>
            </div>
            <div className="ba-h3">{s.headline}</div>
            <p className="text-[12.5px] leading-snug text-[var(--ink-2)] mt-0.5">{s.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ChampionsColumn({ tour, label }: { tour: string; label: string }) {
  const { data: champions, isLoading, isError, refetch } = useRecentChampions(tour);

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-1 mb-1.5">
        <h3 className="ba-board-title">{label}</h3>
        <Link to={`/tournament?tour=${tour}`} className="ba-board-more ba-link">
          Browse {label} events →
        </Link>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <QueryError
          title="Champions did not load"
          message="The recent-champions request failed."
          onRetry={() => refetch()}
        />
      ) : (
        <table className="ba-table ba-table-dense">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Event</th>
              <th scope="col">Surf</th>
              <th scope="col">Champion</th>
            </tr>
          </thead>
          <tbody>
            {(champions ?? []).slice(0, 6).map((c: RecentChampion, i) => (
              <tr key={i}>
                <td className="ba-mono text-[11px] text-[var(--mute)] whitespace-nowrap">
                  {c.date?.slice(0, 10)}
                </td>
                <td className="max-w-[160px] truncate">
                  <Link
                    to={`/tournament?t=${encodeURIComponent(c.tournament)}&year=${c.year}&tour=${tour}`}
                    className="text-[var(--ink-2)] hover:text-[var(--clay-deep)]"
                  >
                    {c.tournament}
                  </Link>
                </td>
                <td>
                  <SurfaceTag surface={c.surface} />
                </td>
                <td className="font-semibold whitespace-nowrap">
                  <Link
                    to={`/player?p=${encodeURIComponent(c.winner_name)}&tour=${tour}`}
                    className="text-[var(--ink)] hover:text-[var(--clay-deep)]"
                  >
                    {c.winner_name}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function HomePage() {
  const { data: stats } = useMetaStats();
  const era = stats ? `${stats.year_min} to ${stats.year_max}` : 'the open era to today';

  return (
    <div className="space-y-8">
      {/* Lede — what this is, in one sentence, over the counts that prove it. */}
      <section>
        <div className="ba-eyebrow mb-2">ATP + WTA match archive</div>
        <h1 className="ba-display max-w-3xl ba-reveal">
          Every match on record, both tours.
        </h1>
        <p className="ba-body mt-3 max-w-2xl">
          Rivalries, careers, upsets, and every serve held or broken — indexed from {era},
          filterable down to a single match, and exportable.
        </p>
      </section>

      <Ledger />

      <StorylinesRow />

      <section>
        <SectionHeader title="Latest champions" kicker="Most recent finals on record" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <ChampionsColumn tour="M" label="ATP" />
          <ChampionsColumn tour="F" label="WTA" />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Biggest recent upsets"
          kicker="Ranking places jumped, in the latest results"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <UpsetsColumn tour="M" label="ATP" />
          <UpsetsColumn tour="F" label="WTA" />
        </div>
      </section>
    </div>
  );
}
