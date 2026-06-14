import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const STALE = 5 * 60 * 1000; // 5 minutes — DB is read-only

/**
 * Build a standard params-object query hook: key = [keyPrefix, params],
 * 5-minute staleTime, optional enabled flag. Types are inferred from the
 * fetcher so call sites need no annotations.
 */
export function createQueryHook<TParams, TData>(
  keyPrefix: string,
  fetcher: (params: TParams) => Promise<TData>,
) {
  return function useApiQuery(params: TParams, enabled: boolean = true): UseQueryResult<TData> {
    return useQuery({
      queryKey: [keyPrefix, params],
      queryFn: () => fetcher(params),
      enabled,
      staleTime: STALE,
    });
  };
}
