import { describe, expect, it } from 'vitest';
import { BOARDS, COLUMNS, GROUPS, formatValue, naturalDir, rowDetail, sortRows } from './records';

describe('records registry', () => {
  it('has eight boards per group, each ranking a real column of its source', () => {
    for (const g of GROUPS) expect(BOARDS.filter(b => b.group === g.id)).toHaveLength(8);
    for (const b of BOARDS) expect(COLUMNS[b.source].map(c => c.key)).toContain(b.key);
    expect(new Set(BOARDS.map(b => b.id)).size).toBe(BOARDS.length);
  });

  it('formats figures', () => {
    expect(formatValue(64.444, 'pct')).toBe('64.4%');
    expect(formatValue(1234, 'count')).toBe('1,234');
    expect(formatValue(19.6, 'rank')).toBe('#19.6');
    expect(formatValue(2026, 'year')).toBe('2026');
    expect(formatValue(null, 'count')).toBe('—');
  });

  it('sorts with blanks last and ties by name', () => {
    const rows = [
      { player_name: 'B', v: 2 }, { player_name: 'A', v: 2 }, { player_name: 'C', v: null }, { player_name: 'D', v: 5 },
    ];
    expect(sortRows(rows, 'v', 'desc').map(r => r.player_name)).toEqual(['D', 'A', 'B', 'C']);
    expect(sortRows(rows, 'v', 'asc').map(r => r.player_name)).toEqual(['A', 'B', 'D', 'C']);
  });

  it('knows which way is better', () => {
    expect(naturalDir('draw', 'avg_opp_rank')).toBe('asc');
    expect(naturalDir('activity', 'wins')).toBe('desc');
  });

  it('describes per-run rows', () => {
    expect(rowDetail('draw', { player_name: 'x', tournament: 'Monte Carlo Masters', year: 2026 })).toBe('Monte Carlo Masters 2026');
    expect(rowDetail('streaks', { player_name: 'x', surface: 'Clay', start_date: '2026-03-04', end_date: null })).toBe('Clay · 4 Mar 2026 – ongoing');
  });
});
