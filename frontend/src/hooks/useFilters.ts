/**
 * Page filters in the query string (brief 02-shell.md › URL scheme): each
 * field is validated on its own and falls back to its default; values equal
 * to the page's defaults are left out, so a shared link reads
 * `?surface=Clay&from=2023` rather than spelling out every default; updates
 * replace history instead of pushing.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filterSchema, LEVELS, type Filters } from '../lib/filters';

const ALL_KEYS = ['tour', 'surface', 'level', 'from', 'to'] as const;
export type FilterKey = (typeof ALL_KEYS)[number];

export function parseFilters(params: URLSearchParams, defaults: Filters, keys: readonly FilterKey[] = ALL_KEYS): Filters {
  const out: Filters = { ...defaults };
  for (const key of keys) {
    const raw = params.get(key);
    if (raw == null || raw === '') continue;
    const parsed = filterSchema.shape[key].safeParse(raw);
    if (parsed.success) (out as unknown as Record<string, unknown>)[key] = parsed.data;
  }
  return out;
}

export function writeFilters(
  prev: URLSearchParams, next: Filters, defaults: Filters, keys: readonly FilterKey[] = ALL_KEYS,
): URLSearchParams {
  const params = new URLSearchParams(prev);
  for (const key of keys) {
    const value = next[key];
    if (value == null || value === defaults[key]) params.delete(key);
    else params.set(key, String(value));
  }
  return params;
}

/**
 * `keys`: which params this page's filters own. Player and Matchup leave out
 * 'tour' — there `?tour=` picks between players who share a slug and must
 * survive filter changes.
 */
export function useFilters(defaults: Filters, keys: readonly FilterKey[] = ALL_KEYS): {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams, defaults, keys), [searchParams, defaults, keys]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setSearchParams(prev => {
      const current = parseFilters(prev, defaults, keys);
      const next = { ...current, ...patch };
      // Switching tour keeps a level only if the new tour has it.
      if (!LEVELS[next.tour].some(l => l.value === next.level)) next.level = defaults.level;
      return writeFilters(prev, next, defaults, keys);
    }, { replace: true });
  }, [defaults, keys, setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams(prev => writeFilters(prev, defaults, defaults, keys), { replace: true });
  }, [defaults, keys, setSearchParams]);

  return { filters, setFilters, resetFilters };
}
