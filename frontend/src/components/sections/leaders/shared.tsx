import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SortDir } from '../../../hooks/useTableSort';

export const ROW_CLASS = 'border-b border-[var(--rule)] last:border-b-0 hover:bg-[var(--bone-3)]';

export function PlayerLink({ name, tour }: { name: string; tour: string }) {
  return (
    <Link
      to={`/player?p=${encodeURIComponent(name)}&tour=${tour}`}
      className="ba-link font-medium text-[var(--ink)] hover:text-[var(--clay-deep)]"
    >
      {name}
    </Link>
  );
}

export function TourTag({ tour }: { tour: string }) {
  return (
    <span className="ba-mono text-[10px] tracking-[0.12em] uppercase text-[var(--mute)]">
      {tour === 'M' ? 'ATP' : 'WTA'}
    </span>
  );
}

export function SortHeader<T>({
  label,
  sortKey: key,
  sortState,
  onToggle,
  className = '',
}: {
  label: string;
  sortKey?: keyof T;
  sortState?: { sortKey: keyof T; sortDir: SortDir };
  onToggle?: (key: keyof T) => void;
  className?: string;
}) {
  const active = sortState && key && sortState.sortKey === key;
  const arrow = active ? (sortState.sortDir === 'desc' ? ' ▼' : ' ▲') : '';
  const clickable = key && onToggle;
  return (
    <th
      className={`px-3 py-2 ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-left select-none ${
        clickable ? 'hover:text-[var(--clay)]' : ''
      } ${active ? 'text-[var(--clay)]' : 'text-[var(--ink)]'} ${className}`}
    >
      {clickable ? (
        <button
          type="button"
          onClick={() => onToggle(key)}
          className="inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{label}</span>
          {arrow && <span className="ba-mono text-[9px]">{arrow}</span>}
        </button>
      ) : (
        <span>{label}</span>
      )}
    </th>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="ba-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}
