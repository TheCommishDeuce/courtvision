/**
 * URL slug for a player or tournament name. Twin of `slugify` in
 * api/directory.py: the two must agree exactly, which
 * tests/fixtures/slug_vectors.json enforces on both sides.
 */
const TRANSLITERATE: Record<string, string> = {
  ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i',
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[øæœßłđðþı]/g, c => TRANSLITERATE[c])
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const playerPath = (name: string, tour?: string | null): string =>
  `/player/${slugify(name)}${tour ? `?tour=${tour}` : ''}`;

export const tournamentPath = (name: string, year: number | string, tour?: string | null): string =>
  `/tournament/${slugify(name)}/${year}${tour ? `?tour=${tour}` : ''}`;

export const versusPath = (a: string, b: string, tour?: string | null): string =>
  `/versus/${slugify(a)}/${slugify(b)}${tour ? `?tour=${tour}` : ''}`;
