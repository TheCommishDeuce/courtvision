import type { ReactNode } from 'react';
import { CHART } from '../../charts/theme';

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
        <div className="px-4 py-2 bg-[var(--bone-2)] border-b border-[var(--rule)]">
          <h3 className="ba-h3">{title}</h3>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--rule)]">
            <th className="px-4 py-2 text-right text-[11.5px] font-semibold" style={{ color: CHART.clay }}>{playerA}</th>
            <th className="px-4 py-2 text-center ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--mute)] bg-[var(--bone-3)]">Metric</th>
            <th className="px-4 py-2 text-left text-[11.5px] font-semibold" style={{ color: CHART.ink }}>{playerB}</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
