import type { ReactNode } from 'react';

/** One label/figure line in the tournament meta column. */
export default function StatRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 px-1 py-2 flex-1 ${
        last ? '' : 'border-b border-[var(--rule)]'
      }`}
    >
      <span className="ba-label">{label}</span>
      <span className="ba-figure text-[14px] text-right">{value}</span>
    </div>
  );
}
