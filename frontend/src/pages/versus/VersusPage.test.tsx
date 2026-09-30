import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '../../api/http';
import playerRaw from '../../../../docs/design-brief/samples/player.json?raw';
import versusRaw from '../../../../docs/design-brief/samples/versus.json?raw';
import { LocationProbe, memoryStorage } from '../../test/render';
import VersusPage from './VersusPage';

vi.mock('../../api/http', () => ({ get: vi.fn() }));

const V = JSON.parse(versusRaw);
const P = JSON.parse(playerRaw);
const dir = (name: string, tour = 'M') => ({
  name, slug: name.toLowerCase().replace(/ /g, '-'), tour, country: null, first_year: 2018, last_year: 2026, career_high: 1, matches: 400,
});
const PEOPLE: Record<string, ReturnType<typeof dir>> = {
  'jannik-sinner': dir('Jannik Sinner'),
  'carlos-alcaraz': dir('Carlos Alcaraz'),
  'rafael-nadal': dir('Rafael Nadal'),
  'iga-swiatek': dir('Iga Swiatek', 'F'),
};

function mockApi({ neverMet = false } = {}) {
  vi.mocked(get).mockImplementation(async (path: string, params?: object) => {
    const p = params as Record<string, unknown> | undefined;
    if (path.startsWith('/directory/players/')) {
      const person = PEOPLE[path.split('/').pop()!];
      if (!person) throw Object.assign(new Error('404'), { response: { status: 404 } });
      return { players: [person] };
    }
    if (path === '/h2h') {
      if (neverMet || p?.surface === 'Grass') return V.never_met_example.response;
      return V.h2h.response;
    }
    if (path === '/player/summary') return p?.player === 'Carlos Alcaraz' ? V.player_b_summary.response : V.player_a_summary.response;
    if (path === '/player/top-n-records') return P.top_n_records.response;
    if (path === '/player/serve-stats') return P.serve_stats.response;
    if (path === '/player/return-stats') return P.return_stats.response;
    throw new Error(`unexpected ${path}`);
  });
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/versus" element={<><VersusPage /><LocationProbe /></>} />
          <Route path="/versus/:a/:b" element={<><VersusPage /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VersusPage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.mocked(get).mockReset();
  });

  it('offers popular rivalries when no pair is chosen', () => {
    mockApi();
    renderAt('/versus');
    expect(screen.getByRole('link', { name: /Sabalenka vs Swiatek/ })).toHaveAttribute('href', '/versus/aryna-sabalenka/iga-swiatek');
  });

  it('shows the record, leader, facts and splits from the real sample', async () => {
    mockApi();
    renderAt('/versus/jannik-sinner/carlos-alcaraz');
    const score = await screen.findByLabelText('Jannik Sinner 7, Carlos Alcaraz 11');
    expect(score).toBeInTheDocument();
    expect(screen.getByText('LEADS')).toBeInTheDocument();
    expect(screen.getByText('First meeting')).toBeInTheDocument();
    const surface = screen.getByRole('table', { name: 'Head-to-head by surface' });
    expect(within(surface).getAllByRole('row')).toHaveLength(4); // header + hard, clay, grass
    expect(screen.getByRole('table', { name: 'Career comparison' })).toBeInTheDocument();
  });

  it('links momentum cells to their meeting rows', async () => {
    mockApi();
    renderAt('/versus/jannik-sinner/carlos-alcaraz');
    await screen.findByText('Momentum');
    const cells = screen.getAllByRole('link', { name: /won/ }).filter(l => l.getAttribute('href')?.startsWith('#meeting-'));
    expect(cells.length).toBe(V.h2h.response.matches.length);
    expect(document.getElementById('meeting-0')).not.toBeNull();
  });

  it('says when they never met under the filters and keeps the careers', async () => {
    mockApi();
    renderAt('/versus/jannik-sinner/rafael-nadal?surface=Grass');
    expect(await screen.findByText('Sinner and Nadal never met on grass under these filters.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The two careers' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/versus\/jannik-sinner\/rafael-nadal$/));
  });

  it('swaps the pair', async () => {
    mockApi();
    renderAt('/versus/jannik-sinner/carlos-alcaraz');
    const swap = await screen.findByRole('button', { name: 'Swap players' });
    await waitFor(() => expect(swap).toBeEnabled());
    fireEvent.click(swap);
    expect(screen.getByTestId('location')).toHaveTextContent('/versus/carlos-alcaraz/jannik-sinner');
  });

  it('refuses players from different tours', async () => {
    mockApi();
    renderAt('/versus/jannik-sinner/iga-swiatek');
    expect(await screen.findByText(/play on different tours/)).toBeInTheDocument();
  });

  it('reports an unknown slug', async () => {
    mockApi();
    renderAt('/versus/jannik-sinner/nobody-here');
    expect(await screen.findByText('No player called ‘nobody-here’.')).toBeInTheDocument();
  });
});
