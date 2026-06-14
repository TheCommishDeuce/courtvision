import type { ReactNode } from 'react';

export default function StatRow({ label, value, last = false }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 px-1 py-3 flex-1 ${last ? '' : 'border-b border-[var(--rule)]'}`}>
      <span className="ba-mono text-[10px] font-medium tracking-[0.12em] uppercase text-[var(--mute)]">{label}</span>
      <span className="ba-stat-sm text-[var(--ink)] text-right">{value}</span>
    </div>
  );
}
