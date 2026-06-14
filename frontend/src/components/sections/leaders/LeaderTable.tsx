import Spinner from '../../ui/Spinner';
import { useTableSort } from '../../../hooks/useTableSort';
import { PlayerLink, TourTag, SortHeader, TableShell, ROW_CLASS } from './shared';

export interface LeaderColumn<T> {
  key: keyof T;
  label: string;
  fmt?: (v: number | null) => string;
  accent?: boolean;
}

/**
 * Sortable leaderboard with #/Player/Tour leading columns.
 * zeroAsDash: render 0 as '—' for non-accent columns (Activity-tab rule);
 * when false only null renders as '—' (Serve/Return rule).
 */
export default function LeaderTable<T extends { player_name: string; tour: string }>({
  rows,
  columns,
  initialSortKey,
  isFetching = false,
  zeroAsDash = false,
}: {
  rows: T[];
  columns: LeaderColumn<T>[];
  initialSortKey: keyof T;
  isFetching?: boolean;
  zeroAsDash?: boolean;
}) {
  const { sorted, sortKey, sortDir, toggle } = useTableSort<T>(rows, initialSortKey, 'desc');

  if (isFetching && rows.length === 0) return <div className="py-10 flex justify-center"><Spinner /></div>;

  const sortState = { sortKey, sortDir };

  const display = (c: LeaderColumn<T>, raw: T[keyof T]): string => {
    if (c.fmt) return c.fmt(raw as number | null);
    if (zeroAsDash) return raw == null || raw === 0 ? (c.accent ? String(raw) : '—') : String(raw);
    return raw == null ? '—' : String(raw);
  };

  return (
    <TableShell>
      <thead>
        <tr className="border-b border-[var(--rule)] bg-[var(--bone-2)]">
          <SortHeader<T> label="#" className="w-10" />
          <SortHeader<T> label="Player" sortKey={'player_name' as keyof T} sortState={sortState} onToggle={toggle} />
          <SortHeader<T> label="Tour" sortKey={'tour' as keyof T} sortState={sortState} onToggle={toggle} />
          {columns.map(c => (
            <SortHeader<T>
              key={String(c.key)}
              label={c.label}
              sortKey={c.key}
              sortState={sortState}
              onToggle={toggle}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.slice(0, 50).map((r, i) => (
          <tr key={`${r.player_name}|${r.tour}`} className={ROW_CLASS}>
            <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--mute)]">{i + 1}</td>
            <td className="px-3 py-1.5 text-[12.5px] whitespace-nowrap"><PlayerLink name={r.player_name} tour={r.tour} /></td>
            <td className="px-3 py-1.5"><TourTag tour={r.tour} /></td>
            {columns.map(c => {
              const isSorted = sortKey === c.key;
              return (
                <td
                  key={String(c.key)}
                  className={`px-3 py-1.5 ba-mono text-[12px] ${isSorted ? 'text-[var(--clay)] font-bold' : c.accent ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'}`}
                >
                  {display(c, r[c.key])}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
