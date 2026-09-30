/**
 * Records: /records (brief 03-screens/records.md; prototype/Records.dc.html).
 * The grid of top-ten boards, or with ?board=<id> the whole source table,
 * sortable (?sort=<column>&dir=asc|desc). Filters default to ATP · tour
 * level · current season.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchLeadersActivityCombined, fetchLeadersDrawStrength, fetchLeadersReturn, fetchLeadersServe, fetchLeadersStreaks,
} from '../../api/client';
import CopyButton from '../../components/CopyButton';
import FilterBar from '../../components/FilterBar';
import { BlockError, EmptyState, SkelBar, Skeleton } from '../../components/States';
import { useFilters } from '../../hooks/useFilters';
import { useIsPhone } from '../../hooks/useViewport';
import { MIN_COUNT_MATCHES, MIN_RATE_MATCHES } from '../../lib/constants';
import { countActive, describeFilters, toApiParams, type Filters } from '../../lib/filters';
import {
  BOARDS, COLUMNS, GROUPS, boardById, formatValue, naturalDir, rowDetail, sortRows,
  type BoardDef, type Row, type SourceId,
} from '../../lib/records';
import { playerPath } from '../../lib/slug';
import './records.css';

const SEASON = new Date().getFullYear();
const PAGE = 50;

interface Source {
  rows: Row[];
  pending: boolean;
  error: boolean;
  retry: () => void;
}

function useSources(f: Filters): Record<SourceId, Source> {
  const api = toApiParams(f);
  const shared = { tour: api.tour, surface: api.surface, level: api.level, year_min: api.year_min, year_max: api.year_max };
  const key = (id: SourceId) => ['records', id, shared];
  const queries = {
    activity: useQuery({ queryKey: key('activity'), queryFn: () => fetchLeadersActivityCombined({ ...shared, min_matches: MIN_COUNT_MATCHES }) }),
    serve: useQuery({ queryKey: key('serve'), queryFn: () => fetchLeadersServe({ ...shared, min_matches: MIN_RATE_MATCHES }) }),
    return: useQuery({ queryKey: key('return'), queryFn: () => fetchLeadersReturn({ ...shared, min_matches: MIN_RATE_MATCHES }) }),
    streaks: useQuery({ queryKey: key('streaks'), queryFn: () => fetchLeadersStreaks(shared) }),
    draw: useQuery({ queryKey: key('draw'), queryFn: () => fetchLeadersDrawStrength(shared) }),
  };
  return Object.fromEntries(Object.entries(queries).map(([k, q]) => [k, {
    rows: (q.data ?? []) as unknown as Row[], pending: q.isPending, error: q.isError, retry: () => void q.refetch(),
  }])) as Record<SourceId, Source>;
}

function Board({ board, source, onOpen }: { board: BoardDef; source: Source; onOpen: () => void }) {
  const rows = sortRows(source.rows, board.key, board.dir ?? 'desc').filter(r => r[board.key] != null).slice(0, 10);
  return (
    <article className="rc-board">
      <button type="button" className="rc-board-head" onClick={onOpen} aria-label={`${board.title}: open the full table`}>
        <h3>{board.title}</h3><span>Full table →</span>
      </button>
      {source.pending && (
        <Skeleton label={`Loading ${board.title}`}>
          <div className="rc-list">{Array.from({ length: 10 }, (_, i) => <div key={i} className="rc-row"><SkelBar width="70%" /></div>)}</div>
        </Skeleton>
      )}
      {source.error && <div className="rc-list" style={{ paddingTop: 12 }}><BlockError message="Didn’t load." onRetry={source.retry} /></div>}
      {!source.pending && !source.error && (
        <ol className="rc-list">
          {rows.map((r, i) => {
            const detail = rowDetail(board.source, r);
            return (
              <li key={`${r.player_name}${detail}`} className="rc-row">
                <span className="rc-rank">{i + 1}</span>
                <span className="rc-name">
                  <Link to={playerPath(r.player_name)}>{r.player_name}</Link>
                  {detail && <span className="rc-detail">{detail}</span>}
                </span>
                <span className="rc-val">{formatValue(r[board.key], board.fmt)}</span>
              </li>
            );
          })}
          {!rows.length && <li className="rc-row cv-muted">No qualifying players.</li>}
        </ol>
      )}
      <p className="rc-foot">{board.foot}</p>
    </article>
  );
}

function FullTable({ board, source }: { board: BoardDef; source: Source }) {
  const [params, setParams] = useSearchParams();
  const phone = useIsPhone();
  const [page, setPage] = useState(0);
  const cols = COLUMNS[board.source];
  const sortKey = cols.some(c => c.key === params.get('sort')) ? params.get('sort')! : board.key;
  const dirParam = params.get('dir');
  const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : naturalDir(board.source, sortKey);
  const sorted = useMemo(() => sortRows(source.rows, sortKey, dir), [source.rows, sortKey, dir]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const shown = sorted.slice(page * PAGE, page * PAGE + PAGE);

  const setSort = (key: string, nextDir?: 'asc' | 'desc') => {
    const d = nextDir ?? (key === sortKey ? (dir === 'asc' ? 'desc' : 'asc') : naturalDir(board.source, key));
    setPage(0);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (key === board.key) next.delete('sort'); else next.set('sort', key);
      if (d === naturalDir(board.source, key)) next.delete('dir'); else next.set('dir', d);
      return next;
    }, { replace: true });
  };

  if (source.pending) return <Skeleton><div className="cv-block-skel" style={{ height: 480 }} /></Skeleton>;
  if (source.error) return <BlockError message="This table didn’t load." onRetry={source.retry} />;
  if (!sorted.length) return <p className="cv-muted">No qualifying players for these filters.</p>;
  const sortedCol = cols.find(c => c.key === sortKey)!;

  const pager = pages > 1 && (
    <div className="rc-pager">
      <button type="button" className="cv-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</button>
      <span className="cv-muted">{page * PAGE + 1}–{Math.min(sorted.length, (page + 1) * PAGE)} of {sorted.length}</span>
      <button type="button" className="cv-btn" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
    </div>
  );

  if (phone) {
    const others = cols.filter(c => c.key !== sortKey).slice(0, 6);
    return (
      <>
        <label className="cv-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 10, color: 'var(--ink)' }}>
          Sort by
          <select className="cv-select" style={{ flex: 1 }} value={sortKey} onChange={e => setSort(e.target.value, naturalDir(board.source, e.target.value))}>
            {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <ol className="rc-cards" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map((r, i) => (
            <li key={`${r.player_name}${rowDetail(board.source, r)}${i}`} className="rc-card">
              <div className="rc-card-top">
                <span className="rc-rank">{page * PAGE + i + 1}</span>
                <Link to={playerPath(r.player_name)}>{r.player_name}</Link>
                <span className="rc-card-fig">{formatValue(r[sortKey], sortedCol.fmt)}</span>
              </div>
              <dl className="rc-card-grid">
                {others.map(c => (
                  <div key={c.key}><dt>{c.label}</dt><dd>{formatValue(r[c.key], c.fmt)}</dd></div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
        {pager}
      </>
    );
  }

  return (
    <>
      <div className="rc-table-wrap">
        <table className="rc-table">
          <caption className="cv-visually-hidden">{board.title}, sorted by {sortedCol.label} {dir === 'asc' ? 'ascending' : 'descending'}</caption>
          <thead>
            <tr>
              <th scope="col" className="rc-sticky" style={{ minWidth: 44, textAlign: 'left', padding: '10px 12px' }}>#</th>
              <th scope="col" className="rc-sticky-2" style={{ textAlign: 'left', padding: '10px 12px' }}>Player</th>
              {cols.map(c => {
                const on = c.key === sortKey;
                return (
                  <th key={c.key} scope="col" aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={c.fmt === 'text' || c.fmt === 'date' ? undefined : 'rc-num'}>
                    <button type="button" onClick={() => setSort(c.key)}>{c.label}{on ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}</button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${r.player_name}${rowDetail(board.source, r)}${i}`}>
                <td className="rc-sticky cv-muted">{page * PAGE + i + 1}</td>
                <td className="rc-sticky-2"><Link to={playerPath(r.player_name)}>{r.player_name}</Link></td>
                {cols.map(c => (
                  <td key={c.key} className={[c.fmt === 'text' || c.fmt === 'date' ? '' : 'rc-num', c.key === sortKey ? 'rc-sorted' : ''].join(' ').trim() || undefined}>
                    {formatValue(r[c.key], c.fmt)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pager}
    </>
  );
}

export default function RecordsPage() {
  const defaults = useMemo<Filters>(() => ({ tour: 'M', surface: 'All', level: 'All Tour', from: SEASON, to: SEASON }), []);
  const { filters, setFilters, resetFilters } = useFilters(defaults);
  const [params, setParams] = useSearchParams();
  const board = boardById(params.get('board'));
  const sources = useSources(filters);
  const active = countActive(filters, defaults);
  const summary = [filters.tour === 'F' ? 'WTA' : 'ATP', describeFilters(filters, 'All matches', [1968, SEASON])].join(' · ');
  const settled = Object.values(sources).every(s => !s.pending);
  const empty = settled && Object.values(sources).every(s => !s.error && !s.rows.length);

  const open = (id: string | null) => setParams(prev => {
    const next = new URLSearchParams(prev);
    next.delete('sort');
    next.delete('dir');
    if (id) next.set('board', id); else next.delete('board');
    return next;
  });

  return (
    <main className="cv-main">
      <section className="rc-top">
        {board && <button type="button" className="rc-back" onClick={() => open(null)}>← All records</button>}
        <h1 className="cv-h1">{board ? board.title : 'Records'}</h1>
        <p className="cv-lede" style={{ margin: '6px 0 0', fontSize: 17 }}>
          {board ? `The full ${board.source === 'activity' ? 'results' : board.source} table behind the board. Sort by any column.` : 'Who leads the tour at everything, for any season, surface or level.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}><CopyButton /></div>
      </section>
      <div className="cv-filterbar--bleed" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <FilterBar
          value={filters}
          onChange={setFilters}
          onReset={resetFilters}
          active={active}
          showTour
          summary={summary}
          detail={board ? board.foot : `${BOARDS.length} leaderboards`}
          yearMin={1968}
          yearMax={SEASON}
        />
      </div>
      {empty && (
        <EmptyState title={`No leaderboards for ${summary}`} action={<button type="button" className="cv-btn cv-btn--primary" onClick={resetFilters}>Reset filters</button>}>
          Nobody meets the minimum number of matches under these filters. Widen the years or the level.
        </EmptyState>
      )}
      {!empty && board && (
        <section style={{ padding: '28px 0' }}>
          <FullTable key={board.id} board={board} source={sources[board.source]} />
        </section>
      )}
      {!empty && !board && GROUPS.map(g => (
        <section key={g.id} style={{ padding: '36px 0 8px' }} aria-labelledby={`rc-${g.id}`}>
          <h2 id={`rc-${g.id}`} className="cv-h2" style={{ marginBottom: 16 }}>{g.title}</h2>
          <div className="rc-grid">
            {BOARDS.filter(b => b.group === g.id).map(b => (
              <Board key={b.id} board={b} source={sources[b.source]} onOpen={() => open(b.id)} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
