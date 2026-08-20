import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import type { ZodSchema, z } from 'zod';

/**
 * useUrlFilters reads from useSearchParams on mount, validates against
 * a zod schema, uses defaults for invalid/missing keys, and provides a
 * setter that patches and replaces the URL state.
 */
export function useUrlFilters<S extends ZodSchema>(
  schema: S,
  defaults: z.infer<S>
): [z.infer<S>, (patch: Partial<z.infer<S>>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilters = useMemo(() => {
    const raw: Record<string, unknown> = {};
    for (const [key, value] of searchParams.entries()) {
      raw[key] = value;
    }
    const result = schema.safeParse(raw);
    if (result.success) {
      // Use Object.assign to avoid TS spread issues with inferred object types
      return Object.assign({}, defaults, result.data);
    }
    
    // When partial success or full failure, build by falling back per key
    const merged = Object.assign({}, defaults);
    if (result.error && raw) {
      const mergedRaw = Object.assign({}, defaults, raw);
      const mergedResult = schema.safeParse(mergedRaw);
      if (mergedResult.success) return mergedResult.data;
    }
    return merged;
  }, [searchParams, schema, defaults]);

  const setFilters = useCallback((patch: Partial<z.infer<S>>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      
      const raw: Record<string, unknown> = {};
      for (const [key, val] of prev.entries()) {
        raw[key] = val;
      }
      let base = Object.assign({}, defaults);
      const baseResult = schema.safeParse(raw);
      if (baseResult.success) {
        base = Object.assign({}, base, baseResult.data);
      } else {
         const mergedResult = schema.safeParse(Object.assign({}, defaults, raw));
         if (mergedResult.success) base = Object.assign({}, mergedResult.data);
      }
      
      const newFilters = Object.assign({}, base, patch);
      
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      return next;
    }, { replace: true });
  }, [defaults, schema, setSearchParams]);

  return [currentFilters, setFilters];
}
