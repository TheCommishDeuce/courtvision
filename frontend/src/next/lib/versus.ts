/** Pure helpers for the Matchup page (prototype/Versus.dc.html). */
import type { ByLevel, BySurface, H2HRow } from '../../types/tennis';

/** Short names for headers: surnames, unless the two share one (the Williams sisters). */
export function shortNames(a: string, b: string): [string, string] {
  const last = (n: string) => n.split(' ').slice(-1)[0];
  if (last(a) !== last(b)) return [last(a), last(b)];
  const initial = (n: string) => `${n[0]}. ${last(n)}`;
  return initial(a) !== initial(b) ? [initial(a), initial(b)] : [a, b];
}

export interface SplitLine {
  label: string;
  a: number;
  b: number;
}

/** Pivot the API's (key, winner, wins) rows into one line per surface / level; unmet combinations are absent. */
export function pivotWins<T extends BySurface | ByLevel>(
  rows: T[], key: (r: T) => string, a: string, b: string, order: string[] = [],
): SplitLine[] {
  const by = new Map<string, SplitLine>();
  for (const r of rows) {
    const label = key(r);
    if (!label) continue;
    const line = by.get(label) ?? { label, a: 0, b: 0 };
    if (r.winner_name === a) line.a += r.wins;
    else if (r.winner_name === b) line.b += r.wins;
    by.set(label, line);
  }
  const rank = (l: string) => (order.indexOf(l) < 0 ? 99 : order.indexOf(l));
  return [...by.values()]
    .filter(l => l.a + l.b > 0)
    .sort((x, y) => rank(x.label) - rank(y.label) || (y.a + y.b) - (x.a + x.b));
}

export interface MeetingFacts {
  first: H2HRow;
  last: H2HRow;
  /** Consecutive wins by the winner of the latest meeting. */
  run: number;
  runSince: H2HRow;
}

/** `matches` newest first, as /api/h2h returns them. */
export function meetingFacts(matches: H2HRow[]): MeetingFacts | null {
  if (!matches.length) return null;
  const last = matches[0];
  let run = 0;
  while (run < matches.length && matches[run].winner_name === last.winner_name) run += 1;
  return { first: matches[matches.length - 1], last, run, runSince: matches[run - 1] };
}

export interface CareerLine {
  label: string;
  a: string;
  b: string;
  /** Which side has the better figure, if both are known. */
  better: 'a' | 'b' | null;
}

export function compareLine(
  label: string, va: number | null | undefined, vb: number | null | undefined,
  fmt: (v: number) => string, lowerIsBetter = false, display?: [string, string],
): CareerLine {
  const has = va != null && vb != null && Number.isFinite(va) && Number.isFinite(vb);
  let better: CareerLine['better'] = null;
  if (has && va !== vb) better = (lowerIsBetter ? va < vb : va > vb) ? 'a' : 'b';
  return {
    label,
    a: display?.[0] ?? (va == null ? '—' : fmt(va)),
    b: display?.[1] ?? (vb == null ? '—' : fmt(vb)),
    better,
  };
}
