import type { ReactNode } from 'react';
import { lastName } from '../../../utils';

/** A three-column ledger: A's figures, the metric, B's figures. */
export default function ComparisonCard({
  title,
  playerA,
  playerB,
  children,
}: {
  title?: string;
  playerA: string;
  playerB: string;
  children: ReactNode;
}) {
  return (
    <div className="ba-card p-0 overflow-hidden">
      {title && (
        <div className="px-2.5 py-1.5 bg-[var(--paper-sunken)] border-b border-[var(--rule-ink)]">
          <h3 className="ba-board-title">{title}</h3>
        </div>
      )}
      <table className="ba-table ba-table-dense w-full">
        <thead>
          <tr>
            <th scope="col" className="text-right text-[var(--clay)]" title={playerA}>
              {lastName(playerA)}
            </th>
            <th scope="col" className="text-center">Metric</th>
            <th scope="col" className="text-left" title={playerB}>
              {lastName(playerB)}
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
