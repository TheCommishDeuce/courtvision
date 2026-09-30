import { describe, expect, it } from 'vitest';
import type { PlayerMatchRow } from '../types/tennis';
import { fromPlayerRow, fromWinnerLoser, hasPointStats, statLines } from './matches';

const wl = {
  date: '2025-07-13', tournament: 'Wimbledon', tour: 'M', round: 'F', surface: 'Grass',
  score: '4-6 6-4 6-4 6-4', time: 184, is_upset: false,
  winner_name: 'Jannik Sinner', winner_rank: 1, loser_name: 'Carlos Alcaraz', loser_rank: 2,
  winner_aces: 8, loser_aces: 5, winner_dfs: 2, loser_dfs: 4, winner_pts: 110, loser_pts: 120,
  winner_firsts: 70, loser_firsts: 66, winner_fwon: 55, loser_fwon: 46, winner_swon: 24, loser_swon: 27,
  winner_saved: 3, loser_saved: 6, winner_chances: 4, loser_chances: 10,
};

describe('matches', () => {
  it('adapts winner/loser rows and marks the focal player', () => {
    const m = fromWinnerLoser(wl, 'Carlos Alcaraz');
    expect(m.result).toBe('L');
    expect(m.year).toBe(2025);
    expect(m.winner.faced).toBe(4);
    expect(hasPointStats(m)).toBe(true);
  });

  it('computes the stats panel lines', () => {
    const lines = statLines(fromWinnerLoser(wl));
    expect(lines.map(l => l.label)).toEqual([
      'Aces', 'Double faults', '1st serve in', '1st serve won', '2nd serve won', 'Break points saved',
    ]);
    expect(lines[2].winner).toBe('63.6% · 70/110');
    expect(lines[4].winner).toBe('60.0%');
    expect(lines[5].loser).toBe('6/10');
  });

  it('reports missing statistics instead of zeros', () => {
    const bare = fromWinnerLoser({ ...wl, winner_pts: null, loser_pts: null, winner_firsts: null, loser_firsts: null });
    expect(hasPointStats(bare)).toBe(false);
  });

  it('orients player-perspective rows by result', () => {
    const row = {
      player_name: 'Jannik Sinner', opponent_name: 'Carlos Alcaraz', result: 'L', player_rank: 1, opponent_rank: 2,
      aces: 5, dfs: 1, fwon: 40, swon: 20, firsts: 60, pts: 100, bp_saved: 2, bp_chances: 5,
      o_aces: 9, o_dfs: 3, o_pts: 110, o_firsts: 70, o_fwon: 50, o_swon: 25, o_saved: 4, o_chances: 6,
      date: '2025-06-08', tournament: 'Roland Garros', surface: 'Clay', level: 'G', level_name: 'Grand Slam',
      round: 'F', score: '4-6 6-7(4) 6-4 7-6(3) 7-6(2)', time: 329, tour: 'M', year: 2025, is_upset: false,
    } as PlayerMatchRow;
    const m = fromPlayerRow(row);
    expect(m.result).toBe('L');
    expect(m.winner.name).toBe('Carlos Alcaraz');
    expect(m.winner.aces).toBe(9);
    expect(m.loser.saved).toBe(2);
  });
});
