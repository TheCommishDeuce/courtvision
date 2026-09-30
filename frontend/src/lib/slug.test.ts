import { describe, expect, it } from 'vitest';
// Shared with the backend tests: api/directory.py must produce the same slugs.
import raw from '../../../tests/fixtures/slug_vectors.json?raw';
import { playerPath, slugify, tournamentPath, versusPath } from './slug';

const { vectors } = JSON.parse(raw) as { vectors: [string, string][] };

describe('slugify', () => {
  it.each(vectors)('%s → %s (shared with api/directory.py)', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

describe('paths', () => {
  it('builds entity URLs', () => {
    expect(playerPath('Jannik Sinner')).toBe('/player/jannik-sinner');
    expect(playerPath('Alex Smith', 'F')).toBe('/player/alex-smith?tour=F');
    expect(tournamentPath("'s-Hertogenbosch", 2025, 'M')).toBe('/tournament/s-hertogenbosch/2025?tour=M');
    expect(versusPath('Jannik Sinner', 'Carlos Alcaraz')).toBe('/versus/jannik-sinner/carlos-alcaraz');
  });
});
