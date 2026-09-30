/**
 * The Records board registry (brief 03-screens/records.md). Every board is a
 * top ten of one column of one source; its "Full table" is the whole source
 * sorted by that column. Adding a board is one entry in BOARDS.
 */
import { MIN_COUNT_MATCHES, MIN_RATE_MATCHES } from './constants';
import { fmtDate, fmtInt, fmtPct } from './format';

export type SourceId = 'activity' | 'serve' | 'return' | 'streaks' | 'draw';
export type Fmt = 'count' | 'pct' | 'rank' | 'year' | 'text' | 'date';
export type Row = Record<string, unknown> & { player_name: string; tour?: string };

export interface GroupDef {
  id: 'winning' | 'serve' | 'return';
  title: string;
}

export const GROUPS: GroupDef[] = [
  { id: 'winning', title: 'Winning' },
  { id: 'serve', title: 'On serve' },
  { id: 'return', title: 'On return and margins' },
];

export interface BoardDef {
  id: string;
  group: GroupDef['id'];
  title: string;
  source: SourceId;
  key: string;
  fmt: Fmt;
  /** 'asc' when lower is better (draw strength: a lower average rank is tougher). */
  dir?: 'asc' | 'desc';
  foot: string;
}

const MIN_COUNT = `Min. ${MIN_COUNT_MATCHES} matches`;
const MIN_RATE = `Min. ${MIN_RATE_MATCHES} matches with point data`;

export const BOARDS: BoardDef[] = [
  { id: 'matches', group: 'winning', title: 'Most matches', source: 'activity', key: 'matches', fmt: 'count', foot: MIN_COUNT },
  { id: 'wins', group: 'winning', title: 'Most wins', source: 'activity', key: 'wins', fmt: 'count', foot: MIN_COUNT },
  { id: 'win_pct', group: 'winning', title: 'Best win %', source: 'activity', key: 'win_pct', fmt: 'pct', foot: MIN_COUNT },
  { id: 'titles', group: 'winning', title: 'Most titles', source: 'activity', key: 'titles', fmt: 'count', foot: MIN_COUNT },
  { id: 'finals', group: 'winning', title: 'Most finals', source: 'activity', key: 'finals', fmt: 'count', foot: MIN_COUNT },
  { id: 'upset_wins', group: 'winning', title: 'Upset wins', source: 'activity', key: 'upset_wins', fmt: 'count', foot: 'Beat a higher-ranked player' },
  { id: 'comebacks', group: 'winning', title: 'Comebacks from a set down', source: 'activity', key: 'comebacks', fmt: 'count', foot: MIN_COUNT },
  { id: 'streak', group: 'winning', title: 'Longest win streak', source: 'streaks', key: 'streak_length', fmt: 'count', foot: 'Consecutive wins' },

  { id: 'total_aces', group: 'serve', title: 'Most aces', source: 'serve', key: 'total_aces', fmt: 'count', foot: MIN_RATE },
  { id: 'ace_pct', group: 'serve', title: 'Ace %', source: 'serve', key: 'ace_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'first_in_pct', group: 'serve', title: '1st serve in %', source: 'serve', key: 'first_in_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'first_win_pct', group: 'serve', title: '1st serve won %', source: 'serve', key: 'first_win_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'second_win_pct', group: 'serve', title: '2nd serve won %', source: 'serve', key: 'second_win_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'bp_saved_pct', group: 'serve', title: 'Break points saved %', source: 'serve', key: 'bp_saved_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'tb_won', group: 'serve', title: 'Tiebreaks won', source: 'activity', key: 'tb_won', fmt: 'count', foot: MIN_COUNT },
  { id: 'tb_played', group: 'serve', title: 'Tiebreaks played', source: 'activity', key: 'tb_played', fmt: 'count', foot: MIN_COUNT },

  { id: 'first_return_win_pct', group: 'return', title: '1st return won %', source: 'return', key: 'first_return_win_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'second_return_win_pct', group: 'return', title: '2nd return won %', source: 'return', key: 'second_return_win_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'bp_converted_pct', group: 'return', title: 'Break points converted %', source: 'return', key: 'bp_converted_pct', fmt: 'pct', foot: MIN_RATE },
  { id: 'draw_strength', group: 'return', title: 'Toughest draw won', source: 'draw', key: 'avg_opp_rank', fmt: 'rank', dir: 'asc', foot: 'Average rank of opponents beaten' },
  { id: 'bagels_given', group: 'return', title: 'Bagels given', source: 'activity', key: 'bagels_given', fmt: 'count', foot: '6–0 sets won' },
  { id: 'bagels_received', group: 'return', title: 'Bagels received', source: 'activity', key: 'bagels_received', fmt: 'count', foot: '6–0 sets lost' },
  { id: 'breadsticks_given', group: 'return', title: 'Breadsticks given', source: 'activity', key: 'breadsticks_given', fmt: 'count', foot: '6–1 sets won' },
  { id: 'breadsticks_received', group: 'return', title: 'Breadsticks received', source: 'activity', key: 'breadsticks_received', fmt: 'count', foot: '6–1 sets lost' },
];

export const boardById = (id: string | null | undefined): BoardDef | undefined =>
  id ? BOARDS.find(b => b.id === id) : undefined;

export interface ColumnDef {
  key: string;
  label: string;
  fmt: Fmt;
  /** Lower is better, so the natural sort is ascending. */
  asc?: boolean;
}

/** Full-table columns per source, after rank and player. */
export const COLUMNS: Record<SourceId, ColumnDef[]> = {
  activity: [
    { key: 'matches', label: 'Matches', fmt: 'count' },
    { key: 'wins', label: 'Wins', fmt: 'count' },
    { key: 'win_pct', label: 'Win %', fmt: 'pct' },
    { key: 'titles', label: 'Titles', fmt: 'count' },
    { key: 'finals', label: 'Finals', fmt: 'count' },
    { key: 'tb_won', label: 'TB won', fmt: 'count' },
    { key: 'tb_played', label: 'TB played', fmt: 'count' },
    { key: 'upset_wins', label: 'Upsets', fmt: 'count' },
    { key: 'comebacks', label: 'Comebacks', fmt: 'count' },
    { key: 'bagels_given', label: 'Bagels given', fmt: 'count' },
    { key: 'bagels_received', label: 'Bagels received', fmt: 'count' },
    { key: 'breadsticks_given', label: 'Breadsticks given', fmt: 'count' },
    { key: 'breadsticks_received', label: 'Breadsticks received', fmt: 'count' },
  ],
  serve: [
    { key: 'n_matches', label: 'Matches', fmt: 'count' },
    { key: 'total_aces', label: 'Aces', fmt: 'count' },
    { key: 'ace_pct', label: 'Ace %', fmt: 'pct' },
    { key: 'first_in_pct', label: '1st in %', fmt: 'pct' },
    { key: 'first_win_pct', label: '1st won %', fmt: 'pct' },
    { key: 'second_win_pct', label: '2nd won %', fmt: 'pct' },
    { key: 'bp_saved_pct', label: 'BP saved %', fmt: 'pct' },
  ],
  return: [
    { key: 'n_matches', label: 'Matches', fmt: 'count' },
    { key: 'first_return_win_pct', label: '1st return won %', fmt: 'pct' },
    { key: 'second_return_win_pct', label: '2nd return won %', fmt: 'pct' },
    { key: 'bp_converted_pct', label: 'BP converted %', fmt: 'pct' },
  ],
  streaks: [
    { key: 'streak_length', label: 'Streak', fmt: 'count' },
    { key: 'surface', label: 'Surface', fmt: 'text' },
    { key: 'start_date', label: 'Start', fmt: 'date' },
    { key: 'end_date', label: 'End', fmt: 'date' },
  ],
  draw: [
    { key: 'tournament', label: 'Tournament', fmt: 'text' },
    { key: 'year', label: 'Year', fmt: 'year' },
    { key: 'surface', label: 'Surface', fmt: 'text' },
    { key: 'avg_opp_rank', label: 'Avg opponent', fmt: 'rank', asc: true },
    { key: 'matches_won', label: 'Wins', fmt: 'count' },
    { key: 'best_opp_beaten', label: 'Best beaten', fmt: 'rank', asc: true },
  ],
};

export function formatValue(v: unknown, fmt: Fmt): string {
  if (v == null || v === '') return '—';
  if (fmt === 'text') return String(v);
  if (fmt === 'date') return typeof v === 'string' ? fmtDate(v) : '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (fmt === 'pct') return fmtPct(n);
  if (fmt === 'rank') return `#${n % 1 ? n.toFixed(1) : n}`;
  if (fmt === 'year') return String(Math.round(n));
  return fmtInt(n);
}

/** Streak and draw rows are per run / per event; the detail says which. */
export function rowDetail(source: SourceId, r: Row): string {
  if (source === 'streaks') {
    const s = String(r.surface ?? '');
    const span = `${fmtDate(String(r.start_date ?? ''))}${r.end_date ? ` – ${fmtDate(String(r.end_date))}` : ' – ongoing'}`;
    return `${s && s !== 'All' ? `${s} · ` : ''}${span}`;
  }
  if (source === 'draw') return `${r.tournament ?? ''} ${r.year ?? ''}`.trim();
  return '';
}

/** Sort rows by a column; blanks always last. Stable for ties (by player name). */
export function sortRows(rows: Row[], key: string, dir: 'asc' | 'desc'): Row[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    const na = va == null || va === '';
    const nb = vb == null || vb === '';
    if (na || nb) return na === nb ? 0 : na ? 1 : -1;
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign || a.player_name.localeCompare(b.player_name);
  });
}

export const naturalDir = (source: SourceId, key: string): 'asc' | 'desc' =>
  COLUMNS[source].find(c => c.key === key)?.asc ? 'asc' : BOARDS.find(b => b.source === source && b.key === key)?.dir ?? 'desc';
