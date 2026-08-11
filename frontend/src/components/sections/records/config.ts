/**
 * The Records board registry.
 *
 * Every leaderboard on the Players tab is one entry here. A board is a top-ten
 * view of one column of one source table; clicking its header opens the source's
 * full table pre-sorted by that column (`?board=<id>`). That is how the old
 * Activity mega-table gets split into readable pieces without losing a column:
 * the boards are the entry points, the full table is still underneath.
 *
 * Adding a leaderboard means adding one entry here — no new component.
 */

export type SourceId = 'activity' | 'serve' | 'return' | 'streaks' | 'draw';

/** The three sub-headers the board grid is laid out under. */
export type Section = 'winning' | 'serve' | 'return';

/**
 * Eight boards per section, so every section fills whole rows of the four-column
 * grid instead of leaving one board stranded on a line of its own.
 */
export const SECTIONS: { id: Section; title: string; kicker: string }[] = [
  { id: 'winning', title: 'Winning', kicker: 'Matches, titles, upsets, comebacks, streaks' },
  { id: 'serve', title: 'On serve', kicker: 'Aces, service points, break points saved, tiebreaks' },
  { id: 'return', title: 'On return, and by how much', kicker: 'Return points, draws, scoreline margins' },
];

export type Fmt = 'count' | 'pct' | 'rank';

export interface BoardDef {
  id: string;
  section: Section;
  title: string;
  source: SourceId;
  /** Column the board ranks by. */
  key: string;
  fmt: Fmt;
  /** 'desc' = biggest first. Draw strength is 'asc' — a lower rank is tougher. */
  dir?: 'asc' | 'desc';
  /** Qualifier note in the board footer. */
  foot?: string;
}

/** Minimum matches asked of each source. */
export const MIN_MATCHES = { activity: 10, rate: 20 } as const;

const MIN_10 = 'Min. 10 matches';
const RATE_NOTE = `Min. ${MIN_MATCHES.rate} matches with point data`;

export const BOARDS: BoardDef[] = [
  // ── Winning ────────────────────────────────────────────────────────────
  { id: 'matches', section: 'winning', title: 'Most matches', source: 'activity', key: 'matches', fmt: 'count', foot: MIN_10 },
  { id: 'wins', section: 'winning', title: 'Most wins', source: 'activity', key: 'wins', fmt: 'count', foot: MIN_10 },
  { id: 'win_pct', section: 'winning', title: 'Best win %', source: 'activity', key: 'win_pct', fmt: 'pct', foot: MIN_10 },
  { id: 'titles', section: 'winning', title: 'Most titles', source: 'activity', key: 'titles', fmt: 'count', foot: MIN_10 },
  { id: 'finals', section: 'winning', title: 'Most finals', source: 'activity', key: 'finals', fmt: 'count', foot: MIN_10 },
  { id: 'upset_wins', section: 'winning', title: 'Upset wins', source: 'activity', key: 'upset_wins', fmt: 'count', foot: 'Beat a higher-ranked player' },
  { id: 'comebacks', section: 'winning', title: 'Comebacks from a set down', source: 'activity', key: 'comebacks', fmt: 'count', foot: MIN_10 },
  { id: 'streak', section: 'winning', title: 'Longest win streak', source: 'streaks', key: 'streak_length', fmt: 'count', foot: 'Consecutive wins' },

  // ── On serve ───────────────────────────────────────────────────────────
  { id: 'total_aces', section: 'serve', title: 'Most aces', source: 'serve', key: 'total_aces', fmt: 'count', foot: RATE_NOTE },
  { id: 'ace_pct', section: 'serve', title: 'Ace %', source: 'serve', key: 'ace_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'first_in_pct', section: 'serve', title: '1st serve in %', source: 'serve', key: 'first_in_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'first_win_pct', section: 'serve', title: '1st serve won %', source: 'serve', key: 'first_win_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'second_win_pct', section: 'serve', title: '2nd serve won %', source: 'serve', key: 'second_win_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'bp_saved_pct', section: 'serve', title: 'Break points saved %', source: 'serve', key: 'bp_saved_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'tb_won', section: 'serve', title: 'Tiebreaks won', source: 'activity', key: 'tb_won', fmt: 'count', foot: MIN_10 },
  { id: 'tb_played', section: 'serve', title: 'Tiebreaks played', source: 'activity', key: 'tb_played', fmt: 'count', foot: MIN_10 },

  // ── On return, and by how much ─────────────────────────────────────────
  { id: 'first_return_win_pct', section: 'return', title: '1st return won %', source: 'return', key: 'first_return_win_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'second_return_win_pct', section: 'return', title: '2nd return won %', source: 'return', key: 'second_return_win_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'bp_converted_pct', section: 'return', title: 'Break points converted %', source: 'return', key: 'bp_converted_pct', fmt: 'pct', foot: RATE_NOTE },
  { id: 'draw_strength', section: 'return', title: 'Toughest draw won', source: 'draw', key: 'avg_opp_rank', fmt: 'rank', dir: 'asc', foot: 'Average opponent rank · title runs only' },
  { id: 'bagels_given', section: 'return', title: 'Bagels given', source: 'activity', key: 'bagels_given', fmt: 'count', foot: '6-0 sets won' },
  { id: 'bagels_received', section: 'return', title: 'Bagels received', source: 'activity', key: 'bagels_received', fmt: 'count', foot: '6-0 sets lost' },
  { id: 'breadsticks_given', section: 'return', title: 'Breadsticks given', source: 'activity', key: 'breadsticks_given', fmt: 'count', foot: '6-1 sets won' },
  { id: 'breadsticks_received', section: 'return', title: 'Breadsticks received', source: 'activity', key: 'breadsticks_received', fmt: 'count', foot: '6-1 sets lost' },
];

export const boardById = (id: string | null): BoardDef | undefined =>
  id ? BOARDS.find(b => b.id === id) : undefined;

export function formatFigure(value: unknown, fmt: Fmt): string {
  if (value == null || value === '' || (typeof value === 'number' && !Number.isFinite(value))) {
    return '—';
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (fmt === 'pct') return `${n}%`;
  if (fmt === 'rank') return `#${Math.round(n)}`;
  return n.toLocaleString();
}

export const SOURCE_LABEL: Record<SourceId, string> = {
  activity: 'Activity',
  serve: 'Serve',
  return: 'Return',
  streaks: 'Win streaks',
  draw: 'Draw strength',
};

/**
 * Detail appended after a board's figure. Streak and draw rows are per-run and
 * per-tournament, so the same player can legitimately appear twice — the suffix
 * says which run, instead of leaving it looking like a duplicate.
 */
export const BOARD_SUB: Partial<Record<SourceId, (row: Record<string, unknown>) => string>> = {
  streaks: r => ` ${String(r.surface ?? '').slice(0, 5).toLowerCase()}`,
  draw: r => ` '${String(r.year ?? '').slice(2)}`,
};
