import { describe, expect, it } from 'vitest';
import type { H2HRow } from '../../types/tennis';
import { compareLine, meetingFacts, pivotWins, shortNames } from './versus';

const m = (date: string, winner: string): H2HRow => ({ date, winner_name: winner } as H2HRow);

describe('versus helpers', () => {
  it('shortens names, keeping sisters apart', () => {
    expect(shortNames('Jannik Sinner', 'Carlos Alcaraz')).toEqual(['Sinner', 'Alcaraz']);
    expect(shortNames('Serena Williams', 'Venus Williams')).toEqual(['S. Williams', 'V. Williams']);
  });

  it('pivots wins per surface, leaving out combinations they never met on', () => {
    const lines = pivotWins(
      [
        { surface: 'Clay', winner_name: 'Carlos Alcaraz', wins: 4 },
        { surface: 'Clay', winner_name: 'Jannik Sinner', wins: 2 },
        { surface: 'Grass', winner_name: 'Jannik Sinner', wins: 2 },
        { surface: 'Hard', winner_name: 'Carlos Alcaraz', wins: 7 },
        { surface: 'Hard', winner_name: 'Jannik Sinner', wins: 3 },
      ],
      r => r.surface, 'Jannik Sinner', 'Carlos Alcaraz', ['Hard', 'Clay', 'Grass', 'Carpet'],
    );
    expect(lines).toEqual([
      { label: 'Hard', a: 3, b: 7 }, { label: 'Clay', a: 2, b: 4 }, { label: 'Grass', a: 2, b: 0 },
    ]);
  });

  it('finds first, last and the current run', () => {
    const f = meetingFacts([m('2025-09-07', 'A'), m('2025-07-13', 'A'), m('2025-06-08', 'B'), m('2021-11-01', 'A')]);
    expect(f?.first.date).toBe('2021-11-01');
    expect(f?.last.date).toBe('2025-09-07');
    expect(f?.run).toBe(2);
    expect(f?.runSince.date).toBe('2025-07-13');
    expect(meetingFacts([])).toBeNull();
  });

  it('marks the better career figure', () => {
    expect(compareLine('Rank', 1, 2, v => `#${v}`, true).better).toBe('a');
    expect(compareLine('Ace %', 8.1, 9.3, v => `${v}%`).better).toBe('b');
    expect(compareLine('Titles', 3, 3, String).better).toBeNull();
    expect(compareLine('Titles', null, 3, String)).toEqual({ label: 'Titles', a: '—', b: '3', better: null });
  });
});
