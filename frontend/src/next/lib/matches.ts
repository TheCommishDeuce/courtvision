/**
 * One match shape for MatchRow, whatever endpoint it came from: winner/loser
 * rows (h2h, tournament recap, Lab) and player-perspective rows
 * (player_match_view: player_* / o_*).
 */
import type { PlayerMatchRow, RelationalMatchRow } from '../../types/tennis';
import { fmtPct } from './format';

export interface MatchSide {
  name: string;
  rank: number | null;
  aces: number | null;
  dfs: number | null;
  pts: number | null;
  firsts: number | null;
  fwon: number | null;
  swon: number | null;
  saved: number | null;
  faced: number | null;
}

export interface MatchRowData {
  key: string;
  /** From the focal player's side, when the list has one. */
  result?: 'W' | 'L';
  date: string;
  tournament: string;
  tour?: string | null;
  year?: number | null;
  round: string;
  surface?: string | null;
  winner: MatchSide;
  loser: MatchSide;
  score: string;
  time?: number | null;
  upset?: boolean;
}

type Num = number | null | undefined;
const n = (v: Num): number | null => (v == null || !Number.isFinite(v) ? null : v);

/** Any row with winner_* / loser_* columns (h2h, tournament recap, matches_main). */
export interface WinnerLoserRow {
  date?: string | null;
  tournament?: string | null;
  tour?: string | null;
  year?: number | null;
  round: string;
  surface?: string | null;
  score: string;
  time?: Num;
  is_upset?: boolean | null;
  winner_name: string;
  loser_name: string;
  winner_rank?: Num; loser_rank?: Num;
  winner_aces?: Num; loser_aces?: Num;
  winner_dfs?: Num; loser_dfs?: Num;
  winner_pts?: Num; loser_pts?: Num;
  winner_firsts?: Num; loser_firsts?: Num;
  winner_fwon?: Num; loser_fwon?: Num;
  winner_swon?: Num; loser_swon?: Num;
  winner_saved?: Num; loser_saved?: Num;
  winner_chances?: Num; loser_chances?: Num;
}

function side(r: WinnerLoserRow, p: 'winner' | 'loser'): MatchSide {
  return {
    name: r[`${p}_name`],
    rank: n(r[`${p}_rank`]),
    aces: n(r[`${p}_aces`]),
    dfs: n(r[`${p}_dfs`]),
    pts: n(r[`${p}_pts`]),
    firsts: n(r[`${p}_firsts`]),
    fwon: n(r[`${p}_fwon`]),
    swon: n(r[`${p}_swon`]),
    saved: n(r[`${p}_saved`]),
    faced: n(r[`${p}_chances`]),
  };
}

/** `focal`: whose W/L the result chip shows, if any. */
export function fromWinnerLoser(r: WinnerLoserRow, focal?: string, extra?: Partial<MatchRowData>): MatchRowData {
  const date = r.date ?? '';
  return {
    key: `${date}|${r.round}|${r.winner_name}|${r.loser_name}`,
    result: focal ? (r.winner_name === focal ? 'W' : 'L') : undefined,
    date,
    tournament: r.tournament ?? '',
    tour: r.tour,
    year: r.year ?? (date ? Number(date.slice(0, 4)) : null),
    round: r.round,
    surface: r.surface,
    winner: side(r, 'winner'),
    loser: side(r, 'loser'),
    score: r.score,
    time: n(r.time),
    upset: !!r.is_upset,
    ...extra,
  };
}

/** A player_match_view row: player_* is the focal player, o_* the opponent. */
export function fromPlayerRow(r: PlayerMatchRow): MatchRowData {
  const me: MatchSide = {
    name: r.player_name, rank: n(r.player_rank), aces: n(r.aces), dfs: n(r.dfs), pts: n(r.pts),
    firsts: n(r.firsts), fwon: n(r.fwon), swon: n(r.swon), saved: n(r.bp_saved), faced: n(r.bp_chances),
  };
  const them: MatchSide = {
    name: r.opponent_name, rank: n(r.opponent_rank), aces: n(r.o_aces), dfs: n(r.o_dfs), pts: n(r.o_pts),
    firsts: n(r.o_firsts), fwon: n(r.o_fwon), swon: n(r.o_swon), saved: n(r.o_saved), faced: n(r.o_chances),
  };
  const won = r.result === 'W';
  return {
    key: `${r.date}|${r.round}|${r.player_name}|${r.opponent_name}`,
    result: r.result,
    date: r.date,
    tournament: r.tournament,
    tour: r.tour,
    year: r.year,
    round: r.round,
    surface: r.surface,
    winner: won ? me : them,
    loser: won ? them : me,
    score: r.score,
    time: n(r.time),
    upset: r.is_upset,
  };
}

/** A /api/search/relational row: p_* is the focal player, o_* the opponent. */
export function fromRelationalRow(r: RelationalMatchRow): MatchRowData {
  const me: MatchSide = {
    name: r.player_name, rank: n(r.player_rank), aces: n(r.p_aces), dfs: n(r.p_dfs), pts: n(r.p_pts),
    firsts: n(r.p_firsts), fwon: n(r.p_fwon), swon: n(r.p_swon), saved: n(r.p_saved), faced: n(r.p_chances),
  };
  const them: MatchSide = {
    name: r.opponent_name, rank: n(r.opponent_rank), aces: n(r.o_aces), dfs: n(r.o_dfs), pts: n(r.o_pts),
    firsts: n(r.o_firsts), fwon: n(r.o_fwon), swon: n(r.o_swon), saved: n(r.o_saved), faced: n(r.o_chances),
  };
  const won = r.result === 'W';
  return {
    key: `${r.date}|${r.round}|${r.player_name}|${r.opponent_name}`,
    result: r.result, date: r.date, tournament: r.tournament, tour: r.tour, year: r.year, round: r.round,
    surface: r.surface, winner: won ? me : them, loser: won ? them : me, score: r.score, time: n(r.time),
    upset: r.is_upset,
  };
}

/** Both players have a serve line; otherwise the panel says there are no statistics. */
export const hasPointStats = (m: MatchRowData): boolean =>
  !!m.winner.pts && !!m.loser.pts && m.winner.firsts != null && m.loser.firsts != null;

const ratio = (a: number | null, b: number | null): string => (a != null && b ? fmtPct((a / b) * 100) : '—');
const count = (v: number | null): string => (v == null ? '—' : String(v));

export interface StatLine {
  label: string;
  winner: string;
  loser: string;
}

/** The six lines of the match statistics panel (DESIGN.md › Match row). */
export function statLines(m: MatchRowData): StatLine[] {
  const line = (label: string, f: (s: MatchSide) => string): StatLine => ({ label, winner: f(m.winner), loser: f(m.loser) });
  return [
    line('Aces', s => count(s.aces)),
    line('Double faults', s => count(s.dfs)),
    line('1st serve in', s => `${ratio(s.firsts, s.pts)} · ${count(s.firsts)}/${count(s.pts)}`),
    line('1st serve won', s => ratio(s.fwon, s.firsts)),
    line('2nd serve won', s => ratio(s.swon, s.pts != null && s.firsts != null ? s.pts - s.firsts : null)),
    line('Break points saved', s => `${count(s.saved)}/${count(s.faced)}`),
  ];
}
