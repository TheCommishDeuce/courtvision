/** Pure helpers for the Tournament page (prototype/Tournament.dc.html). */
import type { TournamentRoundGroup } from '../types/tennis';

/** Final first; qualifying last, latest qualifying round first. */
const ORDER = ['F', 'BR', 'SF', 'QF', 'RR', 'R16', 'R32', 'ER', 'R64', 'R128', 'Q3', 'Q2', 'Q1'];
export const QUALIFYING = new Set(['Q1', 'Q2', 'Q3', 'ER']);

export const isQualifying = (round: string): boolean => QUALIFYING.has(round);

export function roundTabs(groups: TournamentRoundGroup[], showQualifying: boolean): string[] {
  const rank = (r: string) => (ORDER.indexOf(r) < 0 ? 50 : ORDER.indexOf(r));
  return groups
    .map(g => g.round)
    .filter(r => showQualifying || !isQualifying(r))
    .sort((a, b) => rank(a) - rank(b));
}

export interface PathStep {
  round: string;
  opponent: string;
}

/** The champion's wins, first round to final. */
export function championPath(groups: TournamentRoundGroup[], champion: string): PathStep[] {
  const rank = (r: string) => (ORDER.indexOf(r) < 0 ? 50 : ORDER.indexOf(r));
  return groups
    .filter(g => !isQualifying(g.round))
    .sort((a, b) => rank(b.round) - rank(a.round))
    .flatMap(g => g.matches.filter(m => m.winner_name === champion).map(m => ({ round: g.round, opponent: m.loser_name })));
}

/** The editions either side of a missing year. */
export function nearestYears(years: number[], year: number): number[] {
  const before = years.filter(y => y < year).at(-1);
  const after = years.find(y => y > year);
  return [before, after].filter((y): y is number => y != null);
}
