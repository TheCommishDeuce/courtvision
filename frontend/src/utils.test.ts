import { describe, it, expect } from 'vitest';
import { fmtTime, countryDisplay } from './utils';

describe('fmtTime', () => {
  it('returns em dash for null/undefined/zero', () => {
    expect(fmtTime(null)).toBe('—');
    expect(fmtTime(undefined)).toBe('—');
    expect(fmtTime(0)).toBe('—');
  });

  it('formats minutes as h:mm', () => {
    expect(fmtTime(75)).toBe('1:15');
    expect(fmtTime(60)).toBe('1:00');
    expect(fmtTime(125)).toBe('2:05');
  });

  it('formats sub-hour durations with 0 hours', () => {
    expect(fmtTime(45)).toBe('0:45');
  });
});

describe('countryDisplay', () => {
  it('returns empty string for missing code', () => {
    expect(countryDisplay(null)).toBe('');
    expect(countryDisplay(undefined)).toBe('');
    expect(countryDisplay('')).toBe('');
  });

  it('maps IOC codes that differ from ISO2', () => {
    expect(countryDisplay('GER')).toBe('🇩🇪 GER');
    expect(countryDisplay('SUI')).toBe('🇨🇭 SUI');
  });

  it('falls back to first two letters for ISO-like codes', () => {
    expect(countryDisplay('USA')).toBe('🇺🇸 USA');
    expect(countryDisplay('FRA')).toBe('🇫🇷 FRA');
  });
});
