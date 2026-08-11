import type { SortDir } from '../../hooks/useTableSort';

export interface SortState {
  sortKey: string;
  sortDir: SortDir;
  toggle: (key: string) => void;
}

interface Props {
  label: string;
  colKey: string;
  sort: SortState;
}

/**
 * A sortable column header. The active column is the only one in clay, and it
 * carries the direction — so a glance at the head says how the table is ordered.
 */
export default function SortHeader({ label, colKey, sort }: Props) {
  const active = sort.sortKey === colKey;
  return (
    <button
      type="button"
      onClick={() => sort.toggle(colKey)}
      aria-label={`Sort by ${label}`}
      className={`inline-flex items-center gap-0.5 cursor-pointer uppercase tracking-[0.11em] ${
        active ? 'text-[var(--clay)]' : 'hover:text-[var(--clay)]'
      }`}
    >
      {label}
      {active && <span className="text-[8px]">{sort.sortDir === 'desc' ? '▼' : '▲'}</span>}
    </button>
  );
}
