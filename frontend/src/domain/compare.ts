export function pct(wins: number, total: number): string {
  return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
}

/**
 * Loose numeric coercion for comparison cells: strips everything except
 * digits, dots, and minus signs, then parseFloat. A 'W-L' string like
 * '12-3' therefore yields 12 (the wins component) — intentional, as such
 * rows compare on the leading number or opt out via better='none'.
 */
export function toNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
