import { describe, expect, it } from 'vitest';
import { legacyRedirect } from './legacy';

describe('legacyRedirect', () => {
  it('moves old query-string entity pages to slug paths', () => {
    expect(legacyRedirect('/player', '?p=Jannik%20Sinner&tour=M&surface=Clay&y0=2023'))
      .toBe('/player/jannik-sinner?tour=M&surface=Clay&from=2023');
    expect(legacyRedirect('/versus', '?a=Jannik+Sinner&b=Carlos+Alcaraz&tour=M'))
      .toBe('/versus/jannik-sinner/carlos-alcaraz?tour=M');
    expect(legacyRedirect('/tournament', "?t='s-Hertogenbosch&year=2025&tour=F"))
      .toBe('/tournament/s-hertogenbosch/2025?tour=F');
    expect(legacyRedirect('/tournament', '?t=Wimbledon')).toBe('/tournament/wimbledon');
  });

  it('retargets retired routes', () => {
    expect(legacyRedirect('/search', '')).toBe('/lab');
    expect(legacyRedirect('/leaders', '?tour=F')).toBe('/records?tour=F');
    expect(legacyRedirect('/h2h', '?a=Iga+Swiatek&b=Aryna+Sabalenka')).toBe('/versus/iga-swiatek/aryna-sabalenka');
    expect(legacyRedirect('/compare', '?tour=F')).toBe('/versus?tour=F');
    expect(legacyRedirect('/player', '')).toBe('/');
  });

  it('renames old parameters on current paths', () => {
    expect(legacyRedirect('/records', '?tab=players&board=wins&tour=M&level=All+Tour&y0=2026&y1=2026'))
      .toBe('/records?board=wins&tour=M&level=All+Tour&from=2026&to=2026');
  });

  it('leaves current URLs alone', () => {
    expect(legacyRedirect('/records', '?board=wins&from=2026')).toBeNull();
    expect(legacyRedirect('/player/jannik-sinner', '?surface=Clay')).toBeNull();
    expect(legacyRedirect('/versus', '')).toBeNull();
    expect(legacyRedirect('/tournament', '?tour=F')).toBeNull();
  });
});
