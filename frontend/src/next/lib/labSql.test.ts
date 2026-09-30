import { describe, expect, it } from 'vitest';
import { filterConditions, labHref, playerMatchesSql } from './labSql';

describe('labSql', () => {
  it('turns filters into conditions', () => {
    expect(filterConditions({ surface: 'All', level: 'All', from: null, to: null })).toEqual([]);
    expect(filterConditions({ surface: 'Clay', level: 'Grand Slam', from: 2026, to: 2023 })).toEqual([
      "surface = 'Clay'", "level_name = 'Grand Slam'", 'year >= 2023', 'year <= 2026',
    ]);
    expect(filterConditions({ surface: 'All', level: 'All Tour', from: null, to: null })[1]).toBe("round NOT IN ('Q1', 'Q2', 'Q3', 'ER')");
  });

  it('escapes names and builds a Lab link', () => {
    const sql = playerMatchesSql("Serena D'Ercole", 'F', { tour: 'F', surface: 'All', level: 'All', from: null, to: null });
    expect(sql).toContain("player_name = 'Serena D''Ercole'");
    expect(labHref('SELECT 1')).toBe('/lab?sql=SELECT%201');
  });
});
