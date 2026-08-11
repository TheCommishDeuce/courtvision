import { describe, it, expect } from 'vitest';
import { buildConditions, buildSql, relationByName, type FilterValues } from './builderConfig';

const matches = relationByName('matches_main');

const sql = (values: FilterValues, over = {}) =>
  buildSql({
    relation: matches,
    values,
    columns: ['date', 'winner_name'],
    orderBy: 'date',
    orderDir: 'DESC',
    limit: 50,
    ...over,
  });

describe('buildConditions', () => {
  it('produces no clauses for empty values', () => {
    expect(buildConditions(matches, {})).toEqual([]);
  });

  it('compares selects for equality and text case-insensitively', () => {
    expect(buildConditions(matches, { tour: { select: 'M' } })).toEqual(["tour = 'M'"]);
    expect(buildConditions(matches, { tournament: { text: 'Wimbledon' } })).toEqual([
      "tournament ILIKE '%Wimbledon%'",
    ]);
  });

  it('escapes single quotes so a name cannot break out of the literal', () => {
    expect(buildConditions(matches, { winner_name: { text: "O'Brien" } })).toEqual([
      "winner_name ILIKE '%O''Brien%'",
    ]);
  });

  it('trims text and ignores whitespace-only input', () => {
    expect(buildConditions(matches, { tournament: { text: '  Open  ' } })).toEqual([
      "tournament ILIKE '%Open%'",
    ]);
    expect(buildConditions(matches, { tournament: { text: '   ' } })).toEqual([]);
  });

  it('emits a bare column for booleans, and nothing when unchecked', () => {
    expect(buildConditions(matches, { is_upset: { on: true } })).toEqual(['is_upset']);
    expect(buildConditions(matches, { is_upset: { on: false } })).toEqual([]);
  });

  it('handles each end of a range independently', () => {
    expect(buildConditions(matches, { year: { min: '2000', max: '2010' } })).toEqual([
      'year BETWEEN 2000 AND 2010',
    ]);
    expect(buildConditions(matches, { year: { min: '2000' } })).toEqual(['year >= 2000']);
    expect(buildConditions(matches, { year: { max: '2010' } })).toEqual(['year <= 2010']);
    expect(buildConditions(matches, { year: {} })).toEqual([]);
  });

  it('drops non-numeric range input rather than injecting it', () => {
    expect(buildConditions(matches, { year: { min: '2000; DROP TABLE players' } })).toEqual([]);
    expect(buildConditions(matches, { year: { min: 'abc' } })).toEqual([]);
  });

  it('ignores values for filters the relation does not define', () => {
    expect(buildConditions(matches, { not_a_filter: { text: 'x' } })).toEqual([]);
  });
});

describe('buildSql', () => {
  it('omits WHERE when nothing is filtered', () => {
    expect(sql({})).toBe(
      'SELECT date, winner_name\nFROM matches_main\nORDER BY date DESC NULLS LAST\nLIMIT 50',
    );
  });

  it('joins multiple conditions with AND', () => {
    const out = sql({ tour: { select: 'M' }, is_upset: { on: true } });
    expect(out).toContain("WHERE tour = 'M'\n  AND is_upset");
  });

  it('falls back to * with no columns chosen', () => {
    expect(sql({}, { columns: [] })).toContain('SELECT *');
  });

  it('omits ORDER BY when no column is chosen', () => {
    const out = sql({}, { orderBy: '' });
    expect(out).not.toContain('ORDER BY');
    expect(out).toContain('LIMIT 50');
  });

  it('always ends with the row limit', () => {
    expect(sql({}, { limit: 7 }).trimEnd().endsWith('LIMIT 7')).toBe(true);
  });
});
