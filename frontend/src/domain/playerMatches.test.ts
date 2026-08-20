import { describe, it, expect } from 'vitest';
import { stageResult, groupMatchesByTournament, hasRetirement, hasWalkover, weekDate } from './playerMatches';
import type { PlayerMatchRow } from '../types/tennis';

const match = (over: Partial<PlayerMatchRow>): PlayerMatchRow =>
  ({
    date: '2025-01-01',
    tournament: 'Test Open',
    round: 'R32',
    result: 'W',
    score: '6-4 6-4',
    ...over,
  }) as PlayerMatchRow;

describe('stageResult', () => {
  it('returns — for an empty run', () => {
    expect(stageResult([])).toBe('—');
  });

  it('returns W when the final was won', () => {
    expect(stageResult([match({ round: 'SF' }), match({ round: 'F', result: 'W' })])).toBe('W');
  });

  it('returns F when the final was lost', () => {
    expect(stageResult([match({ round: 'SF' }), match({ round: 'F', result: 'L' })])).toBe('F');
  });

  it('returns the deepest round reached otherwise', () => {
    expect(stageResult([match({ round: 'R32' }), match({ round: 'QF', result: 'L' })])).toBe('QF');
  });

  it('breaks round ties by latest date', () => {
    const result = stageResult([
      match({ round: 'QF', date: '2025-01-05', score: '6-0 6-0' }),
      match({ round: 'QF', date: '2025-01-06', score: '6-4 ret.' }),
    ]);
    expect(result).toBe('QF (ret.)');
  });

  it('suffixes walkovers', () => {
    expect(stageResult([match({ round: 'R16', score: 'W/O' })])).toBe('R16 (w/o)');
  });
});

describe('groupMatchesByTournament', () => {
  it('groups by tournament and year, preserving first-seen order', () => {
    const groups = groupMatchesByTournament([
      match({ tournament: 'A', date: '2025-02-01', round: 'F' }),
      match({ tournament: 'A', date: '2025-01-28', round: 'SF' }),
      match({ tournament: 'B', date: '2025-01-10', round: 'R32', result: 'L' }),
      match({ tournament: 'A', date: '2024-02-01', round: 'QF', result: 'L' }),
    ]);
    expect(groups.map(g => g.key)).toEqual(['A|2025', 'B|2025', 'A|2024']);
    expect(groups[0].matches).toHaveLength(2);
  });

  it('computes result and week per group', () => {
    const [g] = groupMatchesByTournament([
      match({ tournament: 'A', date: '2025-02-03', round: 'F', result: 'W' }),
      match({ tournament: 'A', date: '2025-01-30', round: 'SF' }),
    ]);
    expect(g.result).toBe('W');
    expect(g.week).toBe('2025-01-30'); // earliest match date
    expect(g.latestDate).toBe('2025-02-03');
  });
});

describe('score helpers', () => {
  it('detects retirements and walkovers', () => {
    expect(hasRetirement('6-4 2-1 ret.')).toBe(true);
    expect(hasRetirement('6-4 6-4')).toBe(false);
    expect(hasWalkover('W/O')).toBe(true);
  });

  it('formats week dates', () => {
    expect(weekDate('2025-01-30T00:00:00')).toBe('2025-01-30');
    expect(weekDate(null)).toBe('—');
  });
});
