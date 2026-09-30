import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '../../api/http';
import homeRaw from '../../../../docs/design-brief/samples/home.json?raw';
import tournamentRaw from '../../../../docs/design-brief/samples/tournament.json?raw';
import { LocationProbe, memoryStorage } from '../../test/render';
import TournamentPage from './TournamentPage';

vi.mock('../../api/http', () => ({ get: vi.fn() }));

const T = JSON.parse(tournamentRaw);
const HOME = JSON.parse(homeRaw);
const YEARS: number[] = [...T.years.response.years].sort((a: number, b: number) => a - b);
const entry = (tour: string) => ({
  name: 'Wimbledon', slug: 'wimbledon', tour, level_name: 'Grand Slam', surface: 'Grass',
  first_year: YEARS[0], last_year: 2025, matches: 9000, years: YEARS,
});
const RECAP = {
  ...T.recap.response,
  meta: { ...T.recap.response.meta, main_draw_matches: 127, qualifying_matches: 112 },
};

function mockApi() {
  vi.mocked(get).mockImplementation(async (path: string) => {
    if (path === '/directory/tournaments/wimbledon') return { tournaments: [entry('M'), entry('F')] };
    if (path.startsWith('/directory/tournaments/')) throw Object.assign(new Error('404'), { response: { status: 404 } });
    if (path === '/tournament/recap') return RECAP;
    if (path === '/tournament/draw-strength') return T.draw_strength.response;
    if (path === '/tournament/recent-champions') return HOME.latest_champions_atp.response;
    if (path === '/directory/suggest') return { query: '', matchup: null, tournament_years: [], players: [], tournaments: [] };
    throw new Error(`unexpected ${path}`);
  });
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tournament" element={<><TournamentPage /><LocationProbe /></>} />
          <Route path="/tournament/:slug/:year" element={<><TournamentPage /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TournamentPage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.mocked(get).mockReset();
  });

  it('browses the latest champions and switches tour in the URL', async () => {
    mockApi();
    renderAt('/tournament');
    expect(await screen.findByRole('link', { name: /Roland Garros/ })).toHaveAttribute('href', '/tournament/roland-garros/2026?tour=M');
    fireEvent.click(screen.getByRole('button', { name: 'WTA' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/tournament?tour=F');
  });

  it('shows the edition: final, draw with the champion’s path, storylines, leaders', async () => {
    mockApi();
    renderAt('/tournament/wimbledon/2025?tour=M');
    expect(await screen.findByRole('heading', { level: 1, name: 'Wimbledon 2025' })).toBeInTheDocument();
    expect(await screen.findByText('Final', { selector: '.cv-eyebrow' })).toBeInTheDocument();
    expect(screen.getByText(/Sinner’s path/)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128']);
    expect(screen.getByLabelText('Jannik Sinner’s match')).toBeInTheDocument();
    expect(screen.getByText('Biggest upsets')).toBeInTheDocument();
    expect(screen.getByText('Stat leaders')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/tournament/recap', expect.objectContaining({ main_draw_only: true }));
  });

  it('opens a round from the path and keeps it in the URL', async () => {
    mockApi();
    renderAt('/tournament/wimbledon/2025?tour=M');
    const path = await screen.findByText(/Sinner’s path/);
    fireEvent.click(within(path.parentElement!).getAllByRole('button')[0]);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/round=R(128|64)/));
  });

  it('adds qualifying rounds and recomputes the lists with them', async () => {
    mockApi();
    renderAt('/tournament/wimbledon/2025?tour=M');
    fireEvent.click(await screen.findByRole('checkbox', { name: /Show qualifying \(112 matches\)/ }));
    await waitFor(() => expect(screen.getAllByRole('tab').map(t => t.textContent)).toContain('Q1'));
    expect(get).toHaveBeenCalledWith('/tournament/recap', expect.objectContaining({ main_draw_only: false }));
  });

  it('offers the nearest editions for a year that wasn’t held', async () => {
    mockApi();
    renderAt('/tournament/wimbledon/2020?tour=M');
    expect(await screen.findByRole('heading', { name: 'No 2020 edition' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wimbledon 2021' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/tournament/wimbledon/2021?tour=M');
  });

  it('answers an unknown event with not found', async () => {
    mockApi();
    renderAt('/tournament/nowhere-open/2025');
    expect(await screen.findByText('That address isn’t part of courtvision')).toBeInTheDocument();
  });
});
