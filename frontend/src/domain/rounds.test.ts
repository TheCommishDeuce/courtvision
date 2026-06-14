import { describe, it, expect } from 'vitest';
import { roundRank, normalizeRound, MAIN_DRAW_ROUND_ORDER, ROUND_LABEL } from './rounds';

describe('roundRank', () => {
  it('ranks later rounds higher', () => {
    expect(roundRank('F')).toBeGreaterThan(roundRank('SF'));
    expect(roundRank('SF')).toBeGreaterThan(roundRank('QF'));
    expect(roundRank('QF')).toBeGreaterThan(roundRank('R16'));
    expect(roundRank('R16')).toBeGreaterThan(roundRank('R128'));
    expect(roundRank('R128')).toBeGreaterThan(roundRank('Q3'));
  });

  it('normalizes case and whitespace', () => {
    expect(roundRank(' f ')).toBe(roundRank('F'));
    expect(roundRank('qf')).toBe(roundRank('QF'));
  });

  it('returns 0 for unknown or missing rounds', () => {
    expect(roundRank('XYZ')).toBe(0);
    expect(roundRank(null)).toBe(0);
    expect(roundRank(undefined)).toBe(0);
  });
});

describe('normalizeRound', () => {
  it('trims and uppercases', () => {
    expect(normalizeRound(' r16 ')).toBe('R16');
    expect(normalizeRound(null)).toBe('');
  });
});

describe('round constants', () => {
  it('orders main-draw rounds earliest to latest', () => {
    expect(MAIN_DRAW_ROUND_ORDER[0]).toBe('R128');
    expect(MAIN_DRAW_ROUND_ORDER[MAIN_DRAW_ROUND_ORDER.length - 1]).toBe('F');
  });

  it('labels every main-draw round', () => {
    for (const r of MAIN_DRAW_ROUND_ORDER) {
      expect(ROUND_LABEL[r]).toBeTruthy();
    }
  });
});
