import { describe, it, expect } from 'vitest';
import { parseYearRange, DEFAULT_YEAR_RANGE } from './yearRange';

describe('parseYearRange', () => {
  it('parses y0/y1 query params', () => {
    expect(parseYearRange(new URLSearchParams('y0=2000&y1=2010'))).toEqual([2000, 2010]);
  });

  it('returns null when either param is missing', () => {
    expect(parseYearRange(new URLSearchParams('y0=2000'))).toBeNull();
    expect(parseYearRange(new URLSearchParams(''))).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    expect(parseYearRange(new URLSearchParams('y0=abc&y1=2010'))).toBeNull();
  });
});

describe('DEFAULT_YEAR_RANGE', () => {
  it('spans the full dataset era', () => {
    expect(DEFAULT_YEAR_RANGE).toEqual([1910, 2026]);
  });
});
