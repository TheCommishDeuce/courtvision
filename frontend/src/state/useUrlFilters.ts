import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

/** Parse independent URL fields without letting one invalid value reset its peers. */
function parseFilters<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
  defaults: z.infer<S>,
  params: URLSearchParams,
): z.infer<S> {
  const filters: Record<string, unknown> = { ...defaults };
  const values = Object.fromEntries(params);
  for (const [key, field] of Object.entries(schema.shape)) {
    if (!Object.hasOwn(values, key)) continue;
    const raw = values[key];
    const result = z.safeParse(field, raw);
    filters[key] = result.success ? result.data : defaults[key];
  }
  return filters as z.infer<S>;
}

/** Flat filter schemas use per-field defaults; patches replace browser history. */
export function useUrlFilters<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
  defaults: z.infer<S>,
): [z.infer<S>, (patch: Partial<z.infer<S>>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilters = useMemo(
    () => parseFilters(schema, defaults, searchParams),
    [searchParams, schema, defaults],
  );

  const setFilters = useCallback((patch: Partial<z.infer<S>>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const filters = { ...parseFilters(schema, defaults, prev), ...patch };
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [defaults, schema, setSearchParams]);

  return [currentFilters, setFilters];
}
