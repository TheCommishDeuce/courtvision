import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '../../../api/http';
import recordsRaw from '../../../../../docs/design-brief/samples/records.json?raw';
import { LocationProbe, memoryStorage } from '../../test/render';
import RecordsPage from './RecordsPage';

vi.mock('../../../api/http', () => ({ get: vi.fn() }));

const R = JSON.parse(recordsRaw);
const SOURCE: Record<string, unknown[]> = {
  '/leaders/activity-combined': R.activity.response,
  '/leaders/serve': R.serve.response,
  '/leaders/return': R.return.response,
  '/leaders/streaks': R.streaks.response,
  '/leaders/draw-strength': R.draw_strength.response,
};

function mockApi(empty = false) {
  vi.mocked(get).mockImplementation(async (path: string) => {
    if (path in SOURCE) return empty ? [] : SOURCE[path];
    if (path === '/meta/stats') return { data_through: '2026-08-10' };
    throw new Error(`unexpected ${path}`);
  });
}

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/records" element={<><RecordsPage /><LocationProbe /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.mocked(get).mockReset();
  });
  afterEach(() => setWidth(1024));

  it('shows 24 boards under three groups with this season’s tour-level defaults', async () => {
    mockApi();
    renderAt('/records');
    expect(await screen.findAllByRole('button', { name: /open the full table/ })).toHaveLength(24);
    expect(screen.getByRole('heading', { name: 'On return and margins' })).toBeInTheDocument();
    const season = new Date().getFullYear();
    expect(get).toHaveBeenCalledWith('/leaders/serve', expect.objectContaining({
      tour: 'M', level: 'All Tour', year_min: season, year_max: season, min_matches: 20,
    }));
    const wins = screen.getByRole('button', { name: 'Most wins: open the full table' }).closest('article')!;
    await waitFor(() => expect(within(wins).getAllByRole('listitem')[0]).toHaveTextContent('Jannik Sinner'));
  });

  it('opens a board’s full table and sorts it through the URL', async () => {
    mockApi();
    renderAt('/records');
    fireEvent.click(await screen.findByRole('button', { name: 'Ace %: open the full table' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/records?board=ace_pct');
    const table = await screen.findByRole('table');
    const ace = within(table).getByRole('columnheader', { name: /Ace %/ });
    expect(ace).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(within(ace).getByRole('button'));
    expect(screen.getByTestId('location')).toHaveTextContent('dir=asc');
    fireEvent.click(within(table).getByRole('button', { name: 'Aces' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('sort=total_aces'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('dir=');

    fireEvent.click(screen.getByRole('button', { name: '← All records' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/records$/);
  });

  it('shows cards with a sort picker on phones', async () => {
    setWidth(390);
    mockApi();
    renderAt('/records?board=wins');
    const sort = await screen.findByLabelText('Sort by');
    expect(sort).toHaveValue('wins');
    expect(screen.queryByRole('table')).toBeNull();
    expect((await screen.findAllByRole('listitem'))[0]).toHaveTextContent('Jannik Sinner');
  });

  it('says when nobody qualifies', async () => {
    mockApi(true);
    renderAt('/records?surface=Carpet');
    expect(await screen.findByRole('heading', { name: /No leaderboards for/ })).toBeInTheDocument();
  });
});
