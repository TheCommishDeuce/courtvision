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

const KEYS = ['tour', 'surface', 'level', 'from', 'to'] as const;

export function parseFilters(params: URLSearchParams, defaults: Filters): Filters {
  const out: Filters = { ...defaults };
  for (const key of KEYS) {
    const raw = params.get(key);
    if (raw == null || raw === '') continue;
    const parsed = filterSchema.shape[key].safeParse(raw);
    if (parsed.success) (out as unknown as Record<string, unknown>)[key] = parsed.data;
  }
  return out;
}

export function writeFilters(prev: URLSearchParams, next: Filters, defaults: Filters): URLSearchParams {
  const params = new URLSearchParams(prev);
  for (const key of KEYS) {
    const value = next[key];
    if (value == null || value === defaults[key]) params.delete(key);
    else params.set(key, String(value));
  }
  return params;
}

export function useFilters(defaults: Filters): {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams, defaults), [searchParams, defaults]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setSearchParams(prev => {
      const current = parseFilters(prev, defaults);
      const next = { ...current, ...patch };
      // Switching tour keeps a level only if the new tour has it.
      if (!LEVELS[next.tour].some(l => l.value === next.level)) next.level = defaults.level;
      return writeFilters(prev, next, defaults);
    }, { replace: true });
  }, [defaults, setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams(prev => writeFilters(prev, defaults, defaults), { replace: true });
  }, [defaults, setSearchParams]);

  return { filters, setFilters, resetFilters };
}
