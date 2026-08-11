import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface BoardRow {
  /** Primary label — usually a player name. */
  name: ReactNode;
  /** The figure this board ranks by. */
  value: ReactNode;
  /** Optional trailing detail, e.g. a match count. */
  sub?: ReactNode;
  /** Makes the row a link. */
  to?: string;
  /** Overrides the ordinal (defaults to position). */
  rank?: number;
}

interface Props {
  title: string;
  rows: BoardRow[];
  /**
   * Fixed number of row slots. The board reserves this height whether or
   * not the data fills it, so a grid of boards never reflows when a filter
   * changes the result count.
   */
  rowCount?: number;
  /** Route for the focused full-table view. Turns the header into a button. */
  to?: string;
  /** Right-hand header text. Defaults to "All →" when `to` is set. */
  headerNote?: ReactNode;
  /**
   * Footnote strip below the rows, e.g. a minimum-matches qualifier.
   * Give every board in a grid group a foot, or none of them — a grid row
   * stretches to its tallest board, so a lone foot pads all its neighbours.
   */
  foot?: ReactNode;
  /** Shown in place of rows when the board has no data at all. */
  emptyNote?: string;
  className?: string;
}

function Row({ row, rank }: { row: BoardRow; rank: number }) {
  const inner = (
    <>
      <span className="ba-board-rank">{rank}</span>
      <span className="ba-board-name">
        <span>{row.name}</span>
      </span>
      <span className="ba-board-figure">
        {row.value}
        {row.sub != null && <span className="ba-board-sub">{row.sub}</span>}
      </span>
    </>
  );

  if (row.to) {
    return (
      <Link to={row.to} className="ba-board-row">
        {inner}
      </Link>
    );
  }
  return <div className="ba-board-row">{inner}</div>;
}

/**
 * A fixed-height results column: ranked rows, hanging ordinal, dot leader
 * out to the figure. Reserving the height is the point — boards are meant
 * to be tiled in a grid that holds still while filters change underneath.
 */
export default function StatBoard({
  title,
  rows,
  rowCount = 10,
  to,
  headerNote,
  foot,
  emptyNote = 'No qualifiers',
  className = '',
}: Props) {
  const shown = rows.slice(0, rowCount);
  const blanks = Math.max(0, rowCount - shown.length);
  const note = headerNote ?? (to ? 'All →' : null);

  const header = (
    <>
      <span className="ba-board-title">{title}</span>
      {note != null && <span className="ba-board-more">{note}</span>}
    </>
  );

  return (
    <section
      className={`ba-board ${className}`}
      style={{ ['--board-rows' as string]: rowCount }}
    >
      {to ? (
        <Link to={to} className="ba-board-head" aria-label={`${title} — open full table`}>
          {header}
        </Link>
      ) : (
        <div className="ba-board-head">{header}</div>
      )}

      <div className="ba-board-body">
        {shown.map((row, i) => (
          <Row key={i} row={row} rank={row.rank ?? i + 1} />
        ))}

        {blanks > 0 &&
          Array.from({ length: blanks }, (_, i) => (
            <div key={`blank-${i}`} className="ba-board-row is-empty" aria-hidden="true">
              <span className="ba-board-rank">{shown.length + i + 1}</span>
              <span className="ba-board-name">
                <span className="text-[var(--rule-mid)]">
                  {shown.length === 0 && i === 0 ? emptyNote : ' '}
                </span>
              </span>
              <span className="ba-board-figure text-[var(--rule-mid)]">—</span>
            </div>
          ))}
      </div>

      {foot && <div className="ba-board-foot">{foot}</div>}
    </section>
  );
}
