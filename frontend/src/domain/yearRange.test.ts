import { describe, it, expect } from 'vitest';
import { clampRange, parseYearRange, DEFAULT_YEAR_RANGE } from './yearRange';

describe('clampRange', () => {
  it('leaves a range that already fits', () => {
    expect(clampRange([2005, 2015], 2000, 2020)).toEqual([2005, 2015]);
  });

  it('pulls both ends inside narrower bounds', () => {
    expect(clampRange([1910, 2026], 2003, 2026)).toEqual([2003, 2026]);
    expect(clampRange([1990, 2026], 1968, 2000)).toEqual([1990, 2000]);
  });

  it('falls back to the full span when the ends cross', () => {
    expect(clampRange([2015, 2005], 2000, 2020)).toEqual([2000, 2020]);
  });

  it('falls back to the full span when the range misses the bounds entirely', () => {
    // A 2015–2024 link opened on a career that ended in 2002.
    expect(clampRange([2015, 2024], 1988, 2002)).toEqual([1988, 2002]);
    expect(clampRange([1970, 1980], 1988, 2002)).toEqual([1988, 2002]);
  });

  it('survives bounds that have not loaded yet', () => {
    expect(clampRange([2000, 2010], 2020, 2010)).toEqual([2020, 2020]);
  });
});

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
