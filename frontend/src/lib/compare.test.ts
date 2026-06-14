import { describe, it, expect } from 'vitest';
import { pct, toNum } from './compare';

describe('pct', () => {
  it('formats a win percentage to one decimal', () => {
    expect(pct(7, 10)).toBe('70.0');
    expect(pct(1, 3)).toBe('33.3');
  });

  it('returns 0.0 for zero totals', () => {
    expect(pct(0, 0)).toBe('0.0');
  });
});

describe('toNum', () => {
  it('parses plain numbers and numeric strings', () => {
    expect(toNum(42)).toBe(42);
    expect(toNum('55.5')).toBe(55.5);
  });

  it('strips % and # prefixes', () => {
    expect(toNum('63.2%')).toBe(63.2);
    expect(toNum('#3')).toBe(3);
  });

  it('returns null for null/undefined/non-numeric', () => {
    expect(toNum(null)).toBeNull();
    expect(toNum(undefined)).toBeNull();
    expect(toNum('—')).toBeNull();
  });

  it('pins current W-L behavior: "12-3" parses as 12', () => {
    expect(toNum('12-3')).toBe(12);
  });
});
