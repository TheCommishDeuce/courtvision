import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { LocationProbe, memoryStorage } from './test/render';

vi.mock('../api/http', () => ({
  get: vi.fn(async (path: string) => {
    if (path === '/meta/stats') {
      return {
        total_matches: 1069410, total_matches_atp: 599831, total_matches_wta: 469579, year_min: 1910,
        year_max: 2026, total_upsets: 1, total_tournaments: 1, total_players: 38189, data_through: '2026-08-10',
      };
    }
    throw new Error(`unexpected ${path}`);
  }),
}));

function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App routes', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('redirects old player links to their slug address', async () => {
    renderApp('/player?p=Jannik%20Sinner&y0=2023');
    expect(await screen.findByTestId('location')).toHaveTextContent('/player/jannik-sinner?from=2023');
  });

  it('shows freshness in the footer and the About page', async () => {
    renderApp('/about');
    expect(await screen.findByText('Data through 10 Aug 2026')).toBeInTheDocument();
    expect(await screen.findByText('ATP & WTA', { exact: false })).toBeInTheDocument();
    expect(await screen.findByText(/ATP 599,831 · WTA 469,579/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'About the data' })).toBeInTheDocument();
  });

  it('marks the current section in the nav', async () => {
    renderApp('/records');
    const links = await screen.findAllByRole('link', { name: 'Records' });
    expect(links[0]).toHaveAttribute('aria-current', 'page');
  });

  it('answers unknown addresses with a not-found page', async () => {
    renderApp('/nowhere');
    expect(await screen.findByText('That address isn’t part of courtvision')).toBeInTheDocument();
  });
});
