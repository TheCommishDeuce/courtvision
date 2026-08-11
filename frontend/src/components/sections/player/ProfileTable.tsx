import type { ReactNode } from 'react';

/**
 * A small labelled table built from pre-rendered cells. Below `sm` the same
 * cells stack as label/value pairs, so these never turn into a sideways scroll.
 */
export default function ProfileTable({
  title,
  headers,
  rows,
  /** Column that titles each stacked card. Defaults to the second. */
  cardTitleIndex = 1,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  cardTitleIndex?: number;
}) {
  return (
    <div className="ba-card p-0 overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-[var(--ink)] bg-[var(--paper-sunken)]">
        <h3 className="ba-board-title">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="ba-kicker py-5 text-center">Nothing on record</p>
      ) : (
        <>
          {/* Stacked pairs — narrow viewports */}
          <div className="sm:hidden divide-y divide-[var(--rule)]">
            {rows.map((row, i) => (
              <div key={i} className="px-2.5 py-2">
                <div className="text-[13px] font-semibold text-[var(--ink)] mb-1">
                  {row[cardTitleIndex] ?? row[0]}
                </div>
                {row.map((cell, j) =>
                  j === cardTitleIndex ? null : (
                    <div key={j} className="ba-record-field">
                      <span className="ba-label">{headers[j]}</span>
                      <span className="ba-figure">{cell ?? '—'}</span>
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>

          {/* Table — wide viewports */}
          <div className="hidden sm:block ba-scroller">
            <table className="ba-table ba-table-dense min-w-full">
              <thead>
                <tr>
                  {headers.map(h => (
                    <th key={h} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="text-[12.5px] text-[var(--ink-2)]">{cell ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
