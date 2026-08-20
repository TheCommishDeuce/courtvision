import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatBoard, { type BoardRow } from './StatBoard';

const rows = (n: number): BoardRow[] =>
  Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, value: 100 - i }));

const board = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('StatBoard', () => {
  it('numbers rows from one and shows their figures', () => {
    board(<StatBoard title="Most wins" rows={rows(3)} rowCount={3} />);
    expect(screen.getByText('Most wins')).toBeInTheDocument();
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // the third ordinal
  });

  it('reserves every row slot when the data runs short', () => {
    // The no-reflow contract: a short board still occupies all ten slots, so a
    // grid of boards does not move when a filter shrinks one of them.
    const { container } = board(<StatBoard title="Short" rows={rows(3)} rowCount={10} />);
    expect(container.querySelectorAll('.ba-board-row')).toHaveLength(10);
    expect(container.querySelectorAll('.ba-board-row.is-empty')).toHaveLength(7);
  });

  it('caps the rows it renders at rowCount', () => {
    const { container } = board(<StatBoard title="Long" rows={rows(25)} rowCount={10} />);
    expect(container.querySelectorAll('.ba-board-row')).toHaveLength(10);
    expect(screen.queryByText('Player 11')).not.toBeInTheDocument();
  });

  it('states the qualifier once, in the footer', () => {
    board(<StatBoard title="Ace %" rows={rows(2)} rowCount={10} foot="Min. 100 matches" />);
    expect(screen.getByText('Min. 100 matches')).toBeInTheDocument();
  });

  it('names its empty state when nothing qualifies', () => {
    board(<StatBoard title="Nobody" rows={[]} rowCount={10} emptyNote="No qualifiers" />);
    expect(screen.getByText('No qualifiers')).toBeInTheDocument();
  });

  it('links the header to the focused table when given a route', () => {
    board(<StatBoard title="Most wins" rows={rows(2)} to="/records?board=wins" />);
    const link = screen.getByRole('link', { name: /Most wins — open full table/ });
    expect(link).toHaveAttribute('href', '/records?board=wins');
  });

  it('leaves the header inert without a route', () => {
    board(<StatBoard title="Most wins" rows={rows(2)} />);
    expect(screen.queryByRole('link', { name: /open full table/ })).not.toBeInTheDocument();
  });
});
