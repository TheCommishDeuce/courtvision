export const DEFAULT_YEAR_RANGE: [number, number] = [1910, 2026];

/**
 * Keep a stored range inside the bounds a slider is actually offering.
 *
 * The bounds move when they are derived from data — a player's career rather
 * than the archive — so a range read from the URL can sit outside them.
 */
export function clampRange(
  value: [number, number],
  min: number,
  max: number,
): [number, number] {
  if (min > max) return [min, min];
  // A range with no overlap at all — a link to a decade this player never
  // played — is a stale request, not a selection: give them the whole career
  // rather than a one-year sliver at whichever end it collided with.
  if (value[1] < min || value[0] > max) return [min, max];
  const lo = Math.min(Math.max(value[0], min), max);
  const hi = Math.min(Math.max(value[1], min), max);
  return lo <= hi ? [lo, hi] : [min, max];
}

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
