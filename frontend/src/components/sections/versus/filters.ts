/** The one filter object both halves of the Versus page read from. */
export interface VersusFilters {
  tour: string;
  playerA: string;
  playerB: string;
  surface: string;
  level: string;
  yearRange: [number, number];
  /** False until both players are chosen and the pair is submitted. */
  enabled: boolean;
}

/**
 * Filters the player-profile endpoints accept. They take surface and years but
 * not level, so the career half follows surface and years while `level` narrows
 * the head-to-head only — the page says so where it matters.
 */
export function playerParams(f: VersusFilters, player: string) {
  return {
    player,
    tour: f.tour,
    surface: f.surface === 'All' ? undefined : f.surface,
    year_min: f.yearRange[0],
    year_max: f.yearRange[1],
  };
}
