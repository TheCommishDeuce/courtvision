import { describe, expect, it } from 'vitest';
import { fmtDate, fmtDuration, fmtInt, fmtPct, fmtRank, fmtRankParen, record, roundName } from './format';

describe('format', () => {
  it('formats counts, percentages and dates', () => {
    expect(fmtInt(1069410)).toBe('1,069,410');
    expect(fmtPct(64.444)).toBe('64.4%');
    expect(fmtPct(null)).toBe('—');
    expect(fmtDate('2026-08-10')).toBe('10 Aug 2026');
    expect(fmtDate('2026-05-25T00:00:00')).toBe('25 May 2026');
    expect(fmtDate(null)).toBe('—');
  });

  it('formats durations as h:mm', () => {
    expect(fmtDuration(304)).toBe('5:04');
    expect(fmtDuration(59.6)).toBe('1:00');
    expect(fmtDuration(null)).toBe('—');
  });

  it('never shows an unknown rank as 0', () => {
    expect(fmtRankParen(3)).toBe('(3)');
    expect(fmtRankParen(null)).toBe('');
    expect(fmtRankParen(0)).toBe('');
    expect(fmtRank(1)).toBe('#1');
    expect(fmtRank(undefined)).toBe('—');
  });

  it('builds records with a low-sample flag', () => {
    expect(record(67, 37)).toEqual({ pct: '64.4%', wl: '67–37', total: 104, low: false });
    expect(record(3, 2).low).toBe(true);
    expect(record(0, 0).pct).toBe('—');
  });

  it('names rounds', () => {
    expect(roundName('QF')).toBe('Quarterfinal');
    expect(roundName('Q2')).toBe('Qualifying round 2');
    expect(roundName('XX')).toBe('XX');
  });
});
