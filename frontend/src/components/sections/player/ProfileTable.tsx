import type { ReactNode } from 'react';

export default function ProfileTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="ba-card p-0 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--bone-2)]">
        <h3 className="ba-h3">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="ba-table min-w-full">
          <thead>
            <tr>
              {headers.map(h => <th key={h} className="px-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 text-[var(--ink)]">{cell ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
