import { Fragment, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** `index` is the row's absolute position across pages, so rank columns work. */
  cell: (row: T, index: number) => ReactNode;
  /** Right-align and set in the mono data face. */
  num?: boolean;
  /** Keep this column off the stacked card (desktop detail only). */
  hideOnCard?: boolean;
  /** Label for this field on the stacked card. Defaults to `header`. */
  cardLabel?: ReactNode;
  /** Accent the value in clay — used for derived stat columns. */
  accentHeader?: boolean;
  className?: string;
}

type Density = 'default' | 'dense' | 'agate';
type Breakpoint = 'sm' | 'md' | 'lg';

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  density?: Density;
  /** Keep the first column visible while the rest scrolls sideways. */
  pinFirst?: boolean;
  /** Flags a notable row with a clay tick in the left margin. */
  flag?: (row: T) => boolean;
  /** Headline of the stacked card. Falls back to the first column's cell. */
  cardTitle?: (row: T) => ReactNode;
  /** Secondary line under the card headline. */
  cardMeta?: (row: T) => ReactNode;
  /** Width at which stacked cards give way to the table. Default `sm`. */
  cardBreakpoint?: Breakpoint;
  pageSize?: number;
  /** Noun used in the pager, e.g. "matches". */
  unit?: string;
  emptyNote?: string;
  /**
   * Detail panel for a row. When given, rows become expandable: the panel opens
   * full-width beneath the row on desktop and inside the card on mobile. One row
   * open at a time.
   */
  expand?: (row: T) => ReactNode;
}

const DENSITY_CLASS: Record<Density, string> = {
  default: '',
  dense: 'ba-table-dense',
  agate: 'ba-table-agate',
};

/** Static pairs so Tailwind can see every class it needs to emit. */
const BREAKPOINT: Record<Breakpoint, { cards: string; table: string }> = {
  sm: { cards: 'sm:hidden', table: 'hidden sm:block' },
  md: { cards: 'md:hidden', table: 'hidden md:block' },
  lg: { cards: 'lg:hidden', table: 'hidden lg:block' },
};

/**
 * One table, two layouts. Wide viewports get a dense table that scrolls
 * sideways with its first column pinned; narrow viewports get the same rows
 * stacked as cards, because a horizontally scrolling 14-column table is not
 * a mobile layout.
 */
export default function AdaptiveTable<T>({
  rows,
  columns,
  rowKey,
  density = 'dense',
  pinFirst = true,
  flag,
  cardTitle,
  cardMeta,
  cardBreakpoint = 'sm',
  pageSize,
  unit = 'rows',
  emptyNote = 'No rows match these filters.',
  expand,
}: Props<T>) {
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const pages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;

  // A filter change can leave the stored page past the end of a shorter result
  // set. Clamp while rendering rather than correcting it in an effect.
  const safePage = Math.min(page, pages - 1);

  const offset = pageSize ? safePage * pageSize : 0;
  const slice = pageSize ? rows.slice(offset, offset + pageSize) : rows;
  const bp = BREAKPOINT[cardBreakpoint];

  if (rows.length === 0) {
    return (
      <p className="ba-kicker py-6 text-center">{emptyNote}</p>
    );
  }

  const cardFields = columns.filter(c => !c.hideOnCard);

  return (
    <div>
      {/* Stacked cards — narrow viewports */}
      <div className={`${bp.cards} space-y-1.5`}>
        {slice.map((row, i) => {
          const key = rowKey(row, i);
          const isOpen = openKey === key;
          return (
            <article key={key} className={`ba-record-card ${flag?.(row) ? 'flag' : ''}`}>
              <div className="ba-cell font-semibold text-ink leading-snug">
                {cardTitle ? cardTitle(row) : columns[0].cell(row, offset + i)}
              </div>
              {cardMeta && (
                <div className="ba-mono ba-meta text-mute mt-0.5 mb-1.5">
                  {cardMeta(row)}
                </div>
              )}
              <div className="mt-1.5 pt-1.5 border-t border-rule">
                {cardFields.map(c => (
                  <div key={c.key} className="ba-record-field">
                    <span className="ba-label">{c.cardLabel ?? c.header}</span>
                    <span className="ba-figure">{c.cell(row, offset + i)}</span>
                  </div>
                ))}
              </div>
              {expand && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="ba-label ba-touch mt-1.5 hover:text-clay"
                  >
                    {isOpen ? 'Hide match stats' : 'Show match stats'}
                  </button>
                  {isOpen && <div className="mt-1.5 -mx-3 -mb-2.5">{expand(row)}</div>}
                </>
              )}
            </article>
          );
        })}
      </div>

      {/* Table — wide viewports */}
      <div className={bp.table}>
        <div className="ba-scroller border border-rule">
          <table
            className={`ba-table ${DENSITY_CLASS[density]} ${pinFirst ? 'ba-table-pinned' : ''}`}
          >
            <thead>
              <tr>
                {columns.map(c => (
                  <th
                    key={c.key}
                    scope="col"
                    className={`${c.num ? 'num' : ''} ${c.accentHeader ? 'text-clay' : ''}`}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((row, i) => {
                const key = rowKey(row, i);
                const isOpen = openKey === key;
                return (
                  <Fragment key={key}>
                    <tr
                      className={`${flag?.(row) ? 'flag' : ''} ${expand ? 'cursor-pointer' : ''} ${
                        isOpen ? 'bg-clay-wash' : ''
                      }`}
                      {...(expand
                        ? {
                            onClick: () => setOpenKey(isOpen ? null : key),
                            onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setOpenKey(isOpen ? null : key);
                              }
                            },
                            role: 'button',
                            tabIndex: 0,
                            'aria-expanded': isOpen,
                          }
                        : {})}
                    >
                      {columns.map((c, ci) => (
                        <td key={c.key} className={`${c.num ? 'num' : ''} ${c.className ?? ''}`}>
                          {expand && ci === 0 && (
                            <span className="ba-mono ba-agate text-mute mr-1">
                              {isOpen ? '▾' : '▸'}
                            </span>
                          )}
                          {c.cell(row, offset + i)}
                        </td>
                      ))}
                    </tr>
                    {isOpen && expand && (
                      <tr>
                        <td colSpan={columns.length} className="p-0">
                          {expand(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pageSize && pages > 1 && (
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="ba-btn ba-btn-ghost"
          >
            ← Prev
          </button>
          <span className="ba-mono ba-meta text-mute">
            Page {safePage + 1} / {pages} · {rows.length.toLocaleString()} {unit}
          </span>
          <button
            type="button"
            disabled={safePage === pages - 1}
            onClick={() => setPage(safePage + 1)}
            className="ba-btn ba-btn-ghost"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
