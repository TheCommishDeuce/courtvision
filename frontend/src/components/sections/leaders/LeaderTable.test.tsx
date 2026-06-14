import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeaderTable, { type LeaderColumn } from './LeaderTable';

interface Row { player_name: string; tour: string; wins: number; titles: number }

const COLS: LeaderColumn<Row>[] = [
  { key: 'wins', label: 'W', accent: true },
  { key: 'titles', label: 'Titles' },
];

const renderTable = (zeroAsDash: boolean) =>
  render(
    <MemoryRouter>
      <LeaderTable
        rows={[{ player_name: 'Test Player', tour: 'M', wins: 0, titles: 0 }]}
        columns={COLS}
        initialSortKey="wins"
        zeroAsDash={zeroAsDash}
      />
    </MemoryRouter>,
  );

describe('LeaderTable zero display rule', () => {
  it('with zeroAsDash, non-accent zeros render as — but accent zeros show 0', () => {
    renderTable(true);
    const cells = screen.getAllByRole('cell').map(c => c.textContent);
    expect(cells).toContain('0');  // wins (accent, sorted column)
    expect(cells).toContain('—');  // titles (non-accent)
  });

  it('without zeroAsDash, zeros are shown', () => {
    renderTable(false);
    const cells = screen.getAllByRole('cell').map(c => c.textContent);
    expect(cells.filter(c => c === '0')).toHaveLength(2);
    expect(cells).not.toContain('—');
  });
});
