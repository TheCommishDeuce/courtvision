import { describe, expect, it } from 'vitest';
import { countryName } from './country';

describe('countryName', () => {
  it('names IOC codes', () => {
    expect(countryName('ITA')).toBe('Italy');
    expect(countryName('SUI')).toBe('Switzerland');
    expect(countryName('GER')).toBe('Germany');
    expect(countryName('USA')).toBe('United States');
    expect(countryName(null)).toBe('');
  });
});
