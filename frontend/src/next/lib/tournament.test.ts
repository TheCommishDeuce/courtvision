import { describe, expect, it } from 'vitest';
import type { TournamentMatchRow, TournamentRoundGroup } from '../../types/tennis';
import { championPath, nearestYears, roundTabs } from './tournament';

const m = (winner: string, loser: string) => ({ winner_name: winner, loser_name: loser } as TournamentMatchRow);
const groups: TournamentRoundGroup[] = [
  { round: 'Q1', matches: [m('Q', 'X')] },
  { round: 'R128', matches: [m('Sinner', 'A'), m('B', 'C')] },
  { round: 'QF', matches: [m('Sinner', 'Shelton')] },
  { round: 'F', matches: [m('Sinner', 'Alcaraz')] },
  { round: 'SF', matches: [m('Sinner', 'Djokovic')] },
];

describe('tournament helpers', () => {
  it('orders round tabs final first, qualifying only on request', () => {
    expect(roundTabs(groups, false)).toEqual(['F', 'SF', 'QF', 'R128']);
    expect(roundTabs(groups, true)).toEqual(['F', 'SF', 'QF', 'R128', 'Q1']);
  });

  it('traces the champion from the first round', () => {
    expect(championPath(groups, 'Sinner')).toEqual([
      { round: 'R128', opponent: 'A' }, { round: 'QF', opponent: 'Shelton' },
      { round: 'SF', opponent: 'Djokovic' }, { round: 'F', opponent: 'Alcaraz' },
    ]);
  });

  it('finds the editions around a missing year', () => {
    expect(nearestYears([2018, 2019, 2021, 2022], 2020)).toEqual([2019, 2021]);
    expect(nearestYears([2018, 2019], 2025)).toEqual([2019]);
  });
});
