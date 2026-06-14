import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

/** Client-side table sorting: nulls always sort last, toggling a column flips direction. */
export function useTableSort<T>(rows: T[], initialKey: keyof T, initialDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<keyof T>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggle = (key: keyof T) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return { sorted, sortKey, sortDir, toggle };
}
