import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdaptiveTable, { type Column } from './AdaptiveTable';

interface Row {
  name: string;
  wins: number;
}

const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, wins: 100 - i }));

const columns: Column<Row>[] = [
  { key: 'rank', header: '#', hideOnCard: true, cell: (_r, i) => String(i + 1) },
  { key: 'name', header: 'Player', cell: r => r.name },
  { key: 'wins', header: 'Wins', num: true, cell: r => r.wins },
];

const table = (props: Partial<Parameters<typeof AdaptiveTable<Row>>[0]> = {}) =>
  render(
    <AdaptiveTable
      rows={rows(5)}
      columns={columns}
      rowKey={(r: Row) => r.name}
      {...props}
    />,
  );

describe('AdaptiveTable', () => {
  it('renders both the table and the stacked cards, letting CSS pick', () => {
    const { container } = table();
    // Each layout is present in the DOM; the breakpoint classes hide one.
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelectorAll('.ba-record-card')).toHaveLength(5);
  });

  it('passes an absolute row index so rank columns survive paging', () => {
    table({ rows: rows(120), pageSize: 50 });
    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('51');
  });

  it('clamps the page when a filter shortens the result set', () => {
    const { rerender, container } = render(
      <AdaptiveTable rows={rows(120)} columns={columns} rowKey={(r: Row) => r.name} pageSize={50} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText(/Page 2 \/ 3/)).toBeInTheDocument();

    // Same component, far fewer rows: the stored page 2 must not strand the
    // view on an empty slice.
    rerender(
      <AdaptiveTable rows={rows(10)} columns={columns} rowKey={(r: Row) => r.name} pageSize={50} />,
    );
    const body = container.querySelector('tbody')!;
    expect(body.querySelectorAll('tr')).toHaveLength(10);
    expect(body.textContent).toContain('Player 1');
  });

  it('hides the pager when everything fits on one page', () => {
    table({ pageSize: 50 });
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
  });

  it('opens one detail panel at a time', () => {
    // Both layouts are in the DOM at once, so scope to the table's own rows.
    const { container } = table({ expand: (r: Row) => <div>stats for {r.name}</div> });
    const body = container.querySelector('tbody')!;
    const rowFor = (name: string) =>
      [...body.querySelectorAll('tr[role="button"]')].find(tr => tr.textContent?.includes(name))!;

    fireEvent.click(rowFor('Player 1'));
    expect(body.textContent).toContain('stats for Player 1');

    fireEvent.click(rowFor('Player 2'));
    expect(body.textContent).not.toContain('stats for Player 1');
    expect(body.textContent).toContain('stats for Player 2');
  });

  it('leaves rows inert when no detail panel is given', () => {
    const { container } = table();
    expect(container.querySelectorAll('tbody tr[role="button"]')).toHaveLength(0);
  });

  it('flags notable rows for the margin tick', () => {
    const { container } = table({ flag: (r: Row) => r.name === 'Player 2' });
    expect(container.querySelectorAll('tbody tr.flag')).toHaveLength(1);
  });

  it('states the empty case instead of rendering an empty table', () => {
    table({ rows: [], emptyNote: 'No rows match these filters.' });
    expect(screen.getByText('No rows match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps hideOnCard columns off the stacked cards', () => {
    const { container } = table();
    const card = container.querySelector('.ba-record-card')!;
    // '#' is desktop-only, so it must not appear as a card field label.
    expect(card.textContent).not.toContain('#');
    expect(card.textContent).toContain('Wins');
  });
});
