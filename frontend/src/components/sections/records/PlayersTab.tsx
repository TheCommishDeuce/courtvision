import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatBoard, { type BoardRow } from '../../ui/StatBoard';
import AdaptiveTable from '../../tables/AdaptiveTable';
import SectionHeader from '../../ui/SectionHeader';
import Spinner from '../../ui/Spinner';
import QueryError from '../../ui/QueryError';
import {
  BOARDS,
  BOARD_SUB,
  SECTIONS,
  SOURCE_LABEL,
  boardById,
  formatFigure,
  type BoardDef,
} from './config';
import {
  columnsFor,
  labelForKey,
  useRecordSources,
  type RecordRow,
  type RecordsFilters,
  type SourceState,
} from './sources';

/** Sorts a source's rows by a board's column and takes the top ten. */
function boardRows(board: BoardDef, source: SourceState): BoardRow[] {
  const dir = board.dir ?? 'desc';
  const withValue = source.rows.filter(r => {
    const v = r[board.key];
    return typeof v === 'number' && Number.isFinite(v);
  });

  withValue.sort((a, b) => {
    const av = a[board.key] as number;
    const bv = b[board.key] as number;
    return dir === 'desc' ? bv - av : av - bv;
  });

  const sub = BOARD_SUB[board.source];

  return withValue.slice(0, 10).map(r => ({
    name: r.player_name,
    value: formatFigure(r[board.key], board.fmt),
    sub: sub?.(r),
    to: `/player?p=${encodeURIComponent(r.player_name)}&tour=${r.tour}`,
  }));
}

function BoardSection({
  title,
  kicker,
  boards,
  sources,
  boardHref,
}: {
  title: string;
  kicker: string;
  boards: BoardDef[];
  sources: Record<string, SourceState>;
  boardHref: (id: string) => string;
}) {
  return (
    <section>
      <SectionHeader level="sub" title={title} kicker={kicker} />
      {/* Fixed-height boards in a fixed-column grid: changing a filter swaps the
          names inside the boxes and never moves the boxes. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {boards.map(b => {
          const src = sources[b.source];
          return (
            <StatBoard
              key={b.id}
              title={b.title}
              rows={src.isError ? [] : boardRows(b, src)}
              to={boardHref(b.id)}
              foot={b.foot ?? SOURCE_LABEL[b.source]}
              emptyNote={src.isError ? 'Did not load' : src.isFetching ? 'Loading' : 'No qualifiers'}
            />
          );
        })}
      </div>
    </section>
  );
}

/** The full source table behind one board, pre-sorted by that board's column. */
function FocusedBoard({
  board,
  source,
  backHref,
}: {
  board: BoardDef;
  source: SourceState;
  backHref: string;
}) {
  const [sortKey, setSortKey] = useState<string>(board.key);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(board.dir ?? 'desc');

  const sorted = useMemo(() => {
    const copy = [...source.rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
    return copy;
  }, [source.rows, sortKey, sortDir]);

  const toggle = (key: string) => {
    if (key === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const columns = columnsFor(board.source, { sortKey, sortDir, toggle }, board.key);

  return (
    <section>
      <SectionHeader
        eyebrow={`${SOURCE_LABEL[board.source]} · full table`}
        title={board.title}
        action={
          <Link to={backHref} className="ba-kicker ba-link">
            ← All boards
          </Link>
        }
      />
      <p className="ba-kicker mb-2">
        Sorted by {labelForKey(board.source, sortKey)} · click any column to re-sort
        {board.foot ? ` · ${board.foot}` : ''}
      </p>

      {source.isError ? (
        <QueryError
          title="This leaderboard did not load"
          message="The request failed. Retry, or widen the filters."
          onRetry={source.refetch}
        />
      ) : source.isFetching && source.rows.length === 0 ? (
        <Spinner />
      ) : (
        <AdaptiveTable
          rows={sorted}
          columns={columns}
          rowKey={(r: RecordRow, i) => `${r.player_name}|${r.tour}|${i}`}
          density="dense"
          cardTitle={r => r.player_name}
          cardMeta={r => (r.tour === 'M' ? 'ATP' : 'WTA')}
          pageSize={50}
          unit="players"
          emptyNote="No players qualify under these filters. Widen the year range or level."
        />
      )}
    </section>
  );
}

export default function PlayersTab({
  filters,
  board,
  boardHref,
  backHref,
}: {
  filters: RecordsFilters;
  board: string | null;
  boardHref: (id: string) => string;
  backHref: string;
}) {
  const sources = useRecordSources(filters);
  const focused = boardById(board);

  if (focused) {
    return (
      <FocusedBoard board={focused} source={sources[focused.source]} backHref={backHref} />
    );
  }

  const anyLoading = Object.values(sources).some(s => s.isFetching && s.rows.length === 0);

  return (
    <div className="space-y-6">
      {anyLoading && <Spinner />}
      {SECTIONS.map(s => (
        <BoardSection
          key={s.id}
          title={s.title}
          kicker={s.kicker}
          boards={BOARDS.filter(b => b.section === s.id)}
          sources={sources}
          boardHref={boardHref}
        />
      ))}
    </div>
  );
}
