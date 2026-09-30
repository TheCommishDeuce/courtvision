import { describe, expect, it } from 'vitest';
import { buildSql } from './builder';
import { columnMeaning } from './schemaText';
import { precheck, tokenize } from './sqlText';

const base = { tour: 'F' as const, surface: 'All' as const, level: 'All', from: null, to: null, relation: 'player_match_view' as const, player: '', order: 'newest' as const, limit: 100 };

describe('Lab helpers', () => {
  it('builds editable SQL from the shared filters', () => {
    expect(buildSql({ ...base, surface: 'Clay', from: 2020, player: "Iga Swiatek" })).toBe([
      'SELECT date, tournament, round, opponent_name, opponent_rank, result, score',
      'FROM player_match_view',
      "WHERE tour = 'F'\n  AND surface = 'Clay'\n  AND year >= 2020\n  AND player_name = 'Iga Swiatek'",
      'ORDER BY date DESC',
      'LIMIT 100',
    ].join('\n'));
    expect(buildSql({ ...base, relation: 'matches_main', player: "D'Ercole" })).toContain("(winner_name = 'D''Ercole' OR loser_name = 'D''Ercole')");
    expect(buildSql({ ...base, relation: 'players', surface: 'Clay' })).not.toContain('surface');
    expect(buildSql({ ...base, limit: 99999 })).toContain('LIMIT 1000');
  });

  it('tokenizes losslessly and classifies', () => {
    const sql = "SELECT count(*) AS n -- note\nFROM matches_main WHERE score = 'it''s' AND year > 2020";
    const tokens = tokenize(sql);
    expect(tokens.map(t => t.text).join('')).toBe(sql);
    expect(tokens.find(t => t.text === 'SELECT')?.kind).toBe('kw');
    expect(tokens.find(t => t.text === 'count')?.kind).toBe('fn');
    expect(tokens.find(t => t.text === "'it''s'")?.kind).toBe('str');
    expect(tokens.find(t => t.text === '2020')?.kind).toBe('num');
    expect(tokens.find(t => t.text.startsWith('--'))?.kind).toBe('comment');
  });

  it('pre-checks like the server', () => {
    expect(precheck('')).toBe('Enter a query to run.');
    expect(precheck('-- hi\nSELECT 1')).toBeNull();
    expect(precheck('WITH x AS (SELECT 1) SELECT * FROM x;')).toBeNull();
    expect(precheck('DROP TABLE players')).toMatch(/Only a single read-only/);
    expect(precheck('SELECT 1; SELECT 2')).toBe('Run one statement at a time.');
    expect(precheck("SELECT ';' AS semi")).toBeNull();
    expect(precheck(`SELECT '${'x'.repeat(20_001)}'`)).toMatch(/too long/);
  });

  it('explains columns', () => {
    expect(columnMeaning('winner_rank')).toBe('Winner’s rank at the time (lower is better)');
    expect(columnMeaning('winner_aces')).toBe('Aces served (winner)');
    expect(columnMeaning('mystery_col')).toBe('mystery col');
  });
});
