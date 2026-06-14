export const DEFAULT_YEAR_RANGE: [number, number] = [1910, 2026];

/** Parse the y0/y1 query params used by year-range filters. */
export function parseYearRange(params: URLSearchParams): [number, number] | null {
  const y0 = params.get('y0');
  const y1 = params.get('y1');
  if (!y0 || !y1) return null;
  const a = Number(y0);
  const b = Number(y1);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}
