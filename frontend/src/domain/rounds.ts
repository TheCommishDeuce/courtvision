/** Round codes and ordering shared across pages. */

export const ROUND_RANK: Record<string, number> = {
  F: 100,
  SF: 90,
  QF: 80,
  R16: 70,
  R32: 60,
  R64: 50,
  R128: 40,
  RR: 35,
  BR: 30,
  Q3: 20,
  Q2: 15,
  Q1: 10,
};

export function normalizeRound(round?: string | null): string {
  return (round ?? '').trim().toUpperCase();
}

export function roundRank(round?: string | null): number {
  return ROUND_RANK[normalizeRound(round)] ?? 0;
}

/** Main-draw rounds from earliest to latest. */
export const MAIN_DRAW_ROUND_ORDER = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];

export const ROUND_LABEL: Record<string, string> = {
  F: 'Final',
  SF: 'Semifinal',
  QF: 'Quarterfinal',
  R16: 'Round of 16',
  R32: 'Round of 32',
  R64: 'Round of 64',
  R128: 'Round of 128',
};

/** Options for the round filter dropdown. */
export const ROUNDS = ['All', 'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128', 'RR', 'BR'];
