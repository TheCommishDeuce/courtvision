import { describe, expect, it } from 'vitest';
import { firstAtOrBetter, heatShare, ordinal, rankByYear, rankChart, surfaceLevelGrid } from './playerCharts';

const history = [
  { date: '2018-03-12T00:00:00', rank: 1583 },
  { date: '2019-11-05T00:00:00', rank: 95 },
  { date: '2021-11-01T00:00:00', rank: 9 },
  { date: '2024-06-10T00:00:00', rank: 1 },
  { date: '2026-05-25T00:00:00', rank: 2 },
];

describe('player charts', () => {
  it('orders ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 96].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '96th']);
  });

  it('clamps heat tints', () => {
    expect(heatShare(20)).toBe(4);
    expect(heatShare(70)).toBe(24);
    expect(heatShare(99)).toBe(42);
  });

  it('draws the log scale with rank 1 at the top and gridlines up to the worst rank', () => {
    const c = rankChart(history, 'log');
    expect(c.gridlines.map(g => g.label)).toEqual(['#1', '10', '100', '1,000', '10,000']);
    expect(c.gridlines[0].top).toBe(0);
    expect(c.path.startsWith('M0.0 ')).toBe(true);
    expect(c.path.split(/[ML]/).filter(Boolean)).toHaveLength(5);
    expect(c.dot?.left).toBeCloseTo(100);
  });

  it('breaks the top-100 line where the player was outside it', () => {
    const c = rankChart(history, 'top100');
    expect(c.path.match(/M/g)).toHaveLength(1);
    expect(c.path.split(/[ML]/).filter(Boolean)).toHaveLength(4);
    expect(c.gridlines.map(g => g.label)).toEqual(['#1', '25', '50', '75', '100']);
  });

  it('thins year ticks on long careers', () => {
    const long = [{ date: '1990-01-01', rank: 50 }, { date: '2015-01-01', rank: 1 }];
    expect(rankChart(long, 'log').xTicks.map(x => x.label)).toEqual(['1990', '1995', '2000', '2005', '2010', '2015']);
    expect(rankChart(history, 'log', true).xTicks[0].label).toBe('’18');
  });

  it('summarises rank by year and finds firsts', () => {
    expect(rankByYear(history)[0]).toEqual({ year: '2018', best: 1583, last: 1583 });
    expect(firstAtOrBetter(history, 100)?.date).toBe('2019-11-05T00:00:00');
    expect(firstAtOrBetter(history, 1)?.date).toBe('2024-06-10T00:00:00');
  });

  it('builds the surface × level grid with totals, biggest levels first', () => {
    const g = surfaceLevelGrid([
      { surface: 'Clay', level_name: 'Challenger', wins: 6, total: 13, win_pct: 46 },
      { surface: 'Clay', level_name: 'Grand Slam', wins: 23, total: 30, win_pct: 77 },
      { surface: 'Hard', level_name: 'Grand Slam', wins: 60, total: 70, win_pct: 86 },
    ]);
    expect(g.surfaces).toEqual(['Hard', 'Clay', 'Grass']);
    expect(g.rows.map(r => r.level)).toEqual(['Grand Slam', 'Challenger']);
    expect(g.rows[0].all).toEqual({ wins: 83, total: 100 });
    expect(g.rows[1].cells[0]).toBeNull();
    expect(g.totals.cells[1]).toEqual({ wins: 29, total: 43 });
    expect(g.totals.cells[2]).toBeNull();
    expect(g.totals.all).toEqual({ wins: 89, total: 113 });
  });
});
