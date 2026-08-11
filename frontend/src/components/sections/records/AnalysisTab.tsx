import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCountries, useNationalityStage } from '../../../hooks';
import AdaptiveTable, { type Column } from '../../tables/AdaptiveTable';
import SectionHeader from '../../ui/SectionHeader';
import Spinner from '../../ui/Spinner';
import QueryError from '../../ui/QueryError';
import EmptyState from '../../ui/EmptyState';
import MetricScatter from './MetricScatter';
import type { NationalityStageRow } from '../../../types/tennis';
import type { RecordsFilters } from './sources';

const STAGES = [
  { label: 'Won the title', value: 'W' },
  { label: 'Reached the final', value: 'F' },
  { label: 'Reached the semifinal or better', value: 'SF' },
  { label: 'Reached the quarterfinal or better', value: 'QF' },
  { label: 'Reached the round of 16 or better', value: 'R16' },
];

/**
 * "The last Russian woman to reach a Grand Slam final" — a question the rest of
 * the site can't answer, so it gets its own block.
 */
function NationalityStage({ filters }: { filters: RecordsFilters }) {
  const listId = useId();
  const [country, setCountry] = useState('');
  const [stage, setStage] = useState('F');
  const [order, setOrder] = useState('last');

  const { data: countries } = useCountries(filters.tour);

  const { data, isFetching, isError, refetch } = useNationalityStage(
    {
      country,
      stage,
      tour: filters.tour,
      surface: filters.surface === 'All' ? undefined : filters.surface,
      level: filters.level || undefined,
      year_min: filters.yearRange[0],
      year_max: filters.yearRange[1],
      order,
      limit: 50,
    },
    Boolean(country.trim()),
  );

  const rows = data?.results ?? [];

  const columns: Column<NationalityStageRow>[] = [
    {
      key: 'reached_date',
      header: 'Date',
      hideOnCard: true,
      cell: r => (
        <span className="ba-mono ba-meta text-[var(--mute)] whitespace-nowrap">
          {r.reached_date?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'player_name',
      header: 'Player',
      hideOnCard: true,
      cell: r => (
        <Link
          to={`/player?p=${encodeURIComponent(r.player_name)}&tour=${r.tour}`}
          className="font-semibold whitespace-nowrap text-[var(--ink)] hover:text-[var(--clay-deep)]"
        >
          {r.player_name}
        </Link>
      ),
    },
    {
      key: 'country',
      header: 'Ctry',
      cell: r => <span className="ba-mono ba-meta">{r.country}</span>,
    },
    {
      key: 'tournament',
      header: 'Event',
      hideOnCard: true,
      className: 'max-w-[190px] truncate',
      cell: r => (
        <Link
          to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.year}&tour=${r.tour}`}
          className="text-[var(--ink-2)] hover:text-[var(--clay-deep)]"
        >
          {r.tournament} {r.year}
        </Link>
      ),
    },
    {
      key: 'deepest_round',
      header: 'Reached',
      cell: r => <span className="ba-mono ba-meta">{r.deepest_round ?? '—'}</span>,
    },
    {
      key: 'won_title',
      header: 'Title',
      cell: r =>
        r.won_title ? (
          <span className="font-bold text-[var(--clay)]" title="Won the title">★</span>
        ) : (
          <span className="text-[var(--rule-mid)]">—</span>
        ),
    },
  ];

  return (
    <section>
      <SectionHeader
        title="By nationality"
        kicker="Who from a country has reached a given stage"
      />

      <div className="ba-well border-t-2 border-t-[var(--rule-ink)] px-3 py-2.5 mb-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-0.5 w-full sm:w-52">
            <span className="ba-label">Country</span>
            <input
              value={country}
              onChange={e => setCountry(e.target.value)}
              list={listId}
              placeholder="e.g. RUS"
              className="ba-input w-full"
            />
            <datalist id={listId}>
              {(countries ?? []).map(c => (
                <option key={c.country} value={c.country}>
                  {c.country} · {c.players} players
                </option>
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-0.5 w-full sm:w-72">
            <span className="ba-label">Stage</span>
            <select value={stage} onChange={e => setStage(e.target.value)} className="ba-select w-full">
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 w-full sm:w-44">
            <span className="ba-label">Order</span>
            <select value={order} onChange={e => setOrder(e.target.value)} className="ba-select w-full">
              <option value="last">Most recent first</option>
              <option value="first">Earliest first</option>
            </select>
          </label>
        </div>
      </div>

      {!country.trim() ? (
        <EmptyState
          eyebrow="Start here"
          title="Pick a country"
          message="Type a country code above — RUS, ESP, USA — to list its players who reached this stage."
        />
      ) : isError ? (
        <QueryError
          title="That lookup did not load"
          message="Retry, or check the country code."
          onRetry={() => refetch()}
        />
      ) : isFetching && rows.length === 0 ? (
        <Spinner />
      ) : (
        <AdaptiveTable
          rows={rows}
          columns={columns}
          rowKey={(r, i) => `${r.player_name}-${r.year}-${i}`}
          density="dense"
          cardTitle={r => r.player_name}
          cardMeta={r => `${r.reached_date?.slice(0, 10)} · ${r.tournament} ${r.year}`}
          unit="results"
          emptyNote="No players from that country reached this stage under these filters."
        />
      )}
    </section>
  );
}

export default function AnalysisTab({ filters }: { filters: RecordsFilters }) {
  return (
    <div className="space-y-8">
      <MetricScatter filters={filters} />
      <NationalityStage filters={filters} />
    </div>
  );
}
