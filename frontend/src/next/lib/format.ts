/** Number, date and record formatting (docs/design-brief/05-constraints.md). */
import { ROUND_LABEL } from '../../domain/rounds';

const INT = new Intl.NumberFormat('en-US');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Counts get thousands separators; years never do (pass them through String). */
export const fmtInt = (n: number | null | undefined): string => (n == null ? '—' : INT.format(n));

export const fmtPct = (x: number | null | undefined, digits = 1): string =>
  x == null || !Number.isFinite(x) ? '—' : `${x.toFixed(digits)}%`;

/** "2026-08-10" or "2026-08-10T00:00:00" → "10 Aug 2026". Read as a calendar date: no time zone shift. */
export function fmtDate(iso: string | null | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return '—';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-08-10" → "10 Aug": for lists that are all recent. */
export function fmtDayMonth(iso: string | null | undefined): string {
  const m = iso ? /^\d{4}-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${Number(m[2])} ${MONTHS[Number(m[1]) - 1]}` : '—';
}

/** Minutes → "h:mm". */
export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '—';
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Rank shown beside a name: "(3)"; unknown is empty, never 0. */
export const fmtRankParen = (rank: number | null | undefined): string =>
  rank == null || !Number.isFinite(rank) || rank <= 0 ? '' : `(${Math.round(rank)})`;

/** Rank as a figure: "#3"; unknown is "—". */
export const fmtRank = (rank: number | null | undefined): string =>
  rank == null || !Number.isFinite(rank) || rank <= 0 ? '—' : `#${Math.round(rank)}`;

/** Fewer matches than this and a record is marked "low sample". */
export const LOW_SAMPLE = 10;

export interface RecordFigures {
  pct: string;
  wl: string;
  total: number;
  low: boolean;
}

export function record(wins: number, losses: number): RecordFigures {
  const total = wins + losses;
  return {
    pct: total ? fmtPct((wins / total) * 100) : '—',
    wl: `${wins}–${losses}`,
    total,
    low: total < LOW_SAMPLE,
  };
}

export const roundName = (round: string): string => ROUND_LABEL[round] ?? {
  RR: 'Round robin', BR: 'Bronze medal match', ER: 'Early round', Q1: 'Qualifying round 1',
  Q2: 'Qualifying round 2', Q3: 'Qualifying round 3',
}[round] ?? round;

export const tourLabel = (tour: string | null | undefined): string => (tour === 'F' ? 'WTA' : tour === 'M' ? 'ATP' : '');

/** "courtvision, data through 10 Aug 2026, <url>" — for Copy citation. */
export const citation = (url: string, dataThrough?: string | null): string =>
  `courtvision, data through ${dataThrough ? fmtDate(dataThrough) : 'latest update'}, ${url}`;
