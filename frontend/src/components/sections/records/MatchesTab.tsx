import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMatchExtremes } from '../../../hooks';
import AdaptiveTable, { type Column } from '../../primitives/AdaptiveTable';
import SectionHeader from '../../primitives/SectionHeader';
import Spinner from '../../primitives/Spinner';
import QueryError from '../../primitives/QueryError';
import EmptyState from '../../primitives/EmptyState';
import SurfaceTag from '../../primitives/SurfaceTag';
import MatchStatsPanel, { type SideStats } from '../../primitives/MatchStatsPanel';
import { fmtTime, lastName } from '../../../utils';
import type { MatchExtremeRow } from '../../../types/tennis';
import type { RecordsFilters } from './sources';

/** What "extreme" means. Everything else comes from the page's global filters. */
const METRICS = [
  { id: 'longest', label: 'Longest matches', metric: 'duration', order: 'desc', unit: 'min', fmt: (v: number) => fmtTime(v) },
  { id: 'shortest', label: 'Shortest matches', metric: 'duration', order: 'asc', unit: 'min', fmt: (v: number) => fmtTime(v) },
  { id: 'aces_player', label: 'Most aces, one player', metric: 'aces_player', order: 'desc', unit: 'aces' },
  { id: 'aces_match', label: 'Most aces, both players', metric: 'aces_match', order: 'desc', unit: 'aces' },
  { id: 'games', label: 'Most games', metric: 'games', order: 'desc', unit: 'games' },
  { id: 'rank_upset', label: 'Biggest ranking upsets', metric: 'rank_upset', order: 'desc', unit: 'places' },
];

const winnerStats = (r: MatchExtremeRow): SideStats => ({
  aces: r.w_aces, dfs: r.winner_dfs, pts: r.winner_pts, firsts: r.winner_firsts,
  fwon: r.winner_fwon, swon: r.winner_swon, saved: r.winner_saved, chances: r.winner_chances,
});
const loserStats = (r: MatchExtremeRow): SideStats => ({
  aces: r.l_aces, dfs: r.loser_dfs, pts: r.loser_pts, firsts: r.loser_firsts,
  fwon: r.loser_fwon, swon: r.loser_swon, saved: r.loser_saved, chances: r.loser_chances,
});

export default function MatchesTab({ filters }: { filters: RecordsFilters }) {
  const [metricId, setMetricId] = useState(METRICS[0].id);
  const m = METRICS.find(x => x.id === metricId)!;

  // Nothing runs until asked. Ranking a million matches by duration is not a
  // query to fire because someone opened a tab, and the useful question is
  // usually a narrow one the reader has to choose first.
  const [submitted, setSubmitted] = useState(false);

  // Any change to what would be asked invalidates the current answer.
  const filterKey = [
    m.metric, m.order, filters.tour, filters.surface, filters.level,
    filters.yearRange[0], filters.yearRange[1],
  ].join('|');
  const [ranKey, setRanKey] = useState('');
  const stale = submitted && ranKey !== filterKey;

  const { data, isFetching, isError, refetch } = useMatchExtremes(
    {
      metric: m.metric,
      order: m.order,
      tour: filters.tour,
      surface: filters.surface === 'All' ? undefined : filters.surface,
      level: filters.level || undefined,
      year_min: filters.yearRange[0],
      year_max: filters.yearRange[1],
      limit: 50,
    },
    submitted && !stale,
  );

  const run = () => {
    setRanKey(filterKey);
    setSubmitted(true);
  };

  const rows = data?.results ?? [];

  const columns: Column<MatchExtremeRow>[] = [
    {
      key: '__rank',
      header: '#',
      hideOnCard: true,
      cell: (_r, i) => <span className="ba-mono ba-meta text-mute">{i + 1}</span>,
    },
    {
      key: 'metric_value',
      header: m.unit,
      cardLabel: m.label,
      num: true,
      accentHeader: true,
      cell: r => (
        <span className="font-bold text-clay">
          {r.metric_value == null ? '—' : m.fmt ? m.fmt(r.metric_value) : r.metric_value.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideOnCard: true,
      cell: r => (
        <span className="ba-mono ba-meta text-mute whitespace-nowrap">
          {r.date?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'tournament',
      header: 'Event',
      hideOnCard: true,
      className: 'max-w-[170px] truncate',
      cell: r => (
        <Link
          to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.year}&tour=${r.tour}`}
          className="text-ink-2 hover:text-clay-deep"
        >
          {r.tournament}
        </Link>
      ),
    },
    { key: 'surface', header: 'Surf', hideOnCard: true, cell: r => <SurfaceTag surface={r.surface} /> },
    {
      key: 'round',
      header: 'Rnd',
      hideOnCard: true,
      cell: r => <span className="ba-mono ba-meta text-ink-2">{r.round}</span>,
    },
    {
      key: 'winner_name',
      header: 'Winner',
      hideOnCard: true,
      cell: r => (
        <Link
          to={`/player?p=${encodeURIComponent(r.winner_name)}&tour=${r.tour}`}
          className="font-semibold whitespace-nowrap text-ink hover:text-clay-deep"
        >
          {r.winner_name}
        </Link>
      ),
    },
    {
      key: 'loser_name',
      header: 'Loser',
      hideOnCard: true,
      cell: r => (
        <Link
          to={`/player?p=${encodeURIComponent(r.loser_name)}&tour=${r.tour}`}
          className="whitespace-nowrap text-ink-2 hover:text-clay-deep"
        >
          {r.loser_name}
        </Link>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      cell: r => <span className="ba-mono ba-meta whitespace-nowrap">{r.score}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Match extremes" kicker="Top 50 · click a row for point stats" />

      <div className="ba-well px-3 py-2.5">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="flex flex-col gap-0.5">
            <span className="ba-label">Rank by</span>
            <select
              value={metricId}
              onChange={e => setMetricId(e.target.value)}
              className="ba-select"
            >
              {METRICS.map(x => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
          </label>
          <p className="ba-kicker self-center">
            Tour, surface, level and years come from the filter bar above.
          </p>
          <button type="button" onClick={run} className="ba-btn ba-btn-primary ml-auto">
            {submitted && !stale ? 'Run again' : 'Show matches'}
          </button>
        </div>
      </div>

      {/* Durations come straight from Tennis Abstract's `time` field, which holds
          some plainly wrong values (multi-hour readings on two-set matches). Say
          so rather than quietly dropping rows and implying the list is clean. */}
      {m.metric === 'duration' && submitted && (
        <p className="ba-kicker">
          Durations are as recorded by the source. A handful are implausible — treat
          anything over about six hours as a data error, not a marathon.
        </p>
      )}

      {!submitted ? (
        <EmptyState
          eyebrow="Start here"
          title="Choose what to rank"
          message="Pick a measure and set the filters above, then select Show matches."
        />
      ) : stale ? (
        <EmptyState
          eyebrow="Out of date"
          title="Filters changed"
          message="Select Show matches to rank again with the new selection."
        />
      ) : isError ? (
        <QueryError
          title="Match extremes did not load"
          message="Retry, or widen the filters."
          onRetry={() => refetch()}
        />
      ) : isFetching && rows.length === 0 ? (
        <Spinner />
      ) : (
        <AdaptiveTable
          rows={rows}
          columns={columns}
          rowKey={(r, i) => `${r.date}-${r.winner_name}-${i}`}
          density="dense"
          flag={r => r.is_upset}
          cardTitle={r => `${r.winner_name} beat ${r.loser_name}`}
          cardMeta={r => `${r.date?.slice(0, 10)} · ${r.tournament} · ${r.round} · ${r.surface}`}
          unit="matches"
          emptyNote="No matches match these filters. Widen the year range or level."
          expand={r => (
            <MatchStatsPanel
              a={winnerStats(r)}
              b={loserStats(r)}
              aLabel={lastName(r.winner_name)}
              bLabel={lastName(r.loser_name)}
            />
          )}
        />
      )}
    </div>
  );
}
