import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '../../api/http';
// Real API responses captured for the design brief (Jannik Sinner, career).
import playerRaw from '../../../../docs/design-brief/samples/player.json?raw';
import splitsRaw from '../../../../docs/design-brief/samples/player-splits.json?raw';
import { LocationProbe, memoryStorage } from '../../test/render';
import PlayerPage from './PlayerPage';

vi.mock('../../api/http', () => ({ get: vi.fn() }));

const S = JSON.parse(playerRaw) as Record<string, { response: unknown }>;
const SPLIT_ROWS = JSON.parse(splitsRaw).example_match_rows.response;
const SINNER = { name: 'Jannik Sinner', slug: 'jannik-sinner', tour: 'M', country: 'ITA', first_year: 2018, last_year: 2026, career_high: 1, matches: 548 };

const SPLITS = {
  groups: [{
    id: 'situation', title: 'Situation', rows: [{
      id: 'lost_first', label: 'After losing the 1st set', params: { situation: 'lost_first' }, lab_sql: 'SELECT 1',
      summary: { total: 137, wins: 57, losses: 80, win_pct: 41.6, y5_total: 100, y5_wins: 50, y5_losses: 50, y5_win_pct: 50, w52_total: 4, w52_wins: 3, w52_losses: 1, w52_win_pct: 75 },
    }],
  }],
};

type Params = Record<string, unknown> | undefined;

function mockApi({ players = [SINNER] as unknown[], missing = false } = {}) {
  vi.mocked(get).mockImplementation(async (path: string, params?: object) => {
    const p = params as Params;
    if (path.startsWith('/directory/players/')) {
      if (missing) throw Object.assign(new Error('404'), { response: { status: 404 } });
      return { players };
    }
    if (path === '/directory/suggest') return { query: '', matchup: null, tournament_years: [], players: [SINNER], tournaments: [] };
    if (path === '/player/summary') {
      if (p?.surface === 'Carpet') return { ...(S.summary.response as object), total: 0, wins: 0, losses: 0 };
      return S.summary.response;
    }
    if (path === '/player/splits') return SPLITS;
    if (path === '/search/relational') return SPLIT_ROWS;
    if (path === '/meta/stats') return { data_through: '2026-08-10' };
    const key = {
      '/player/form': 'form', '/player/matches': 'matches', '/player/rank-history': 'rank_history',
      '/player/surface-heatmap': 'surface_heatmap', '/player/milestones': 'milestones', '/player/top-n-records': 'top_n_records',
      '/player/serve-stats': 'serve_stats', '/player/return-stats': 'return_stats',
      '/player/serve-percentiles': 'serve_percentiles', '/player/return-percentiles': 'return_percentiles',
    }[path];
    if (key) return S[key].response;
    throw new Error(`unexpected ${path}`);
  });
}

function renderPlayer(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/player/:slug" element={<><PlayerPage /><LocationProbe /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PlayerPage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.mocked(get).mockReset();
  });

  it('shows the career identity from the real sample', async () => {
    mockApi();
    renderPlayer('/player/jannik-sinner');
    expect(await screen.findByRole('heading', { level: 1, name: 'Jannik Sinner' })).toBeInTheDocument();
    expect((await screen.findAllByText('77.6%'))[0]).toBeInTheDocument();
    expect(screen.getByText('425–123 · 548 matches')).toBeInTheDocument();
    expect(screen.getByText('4 · 26 · 3 · 2')).toBeInTheDocument();
    expect(screen.getByText('Italy')).toBeInTheDocument();
    expect(screen.getByText('Plays right-handed')).toBeInTheDocument();
    expect(await screen.findByText(/first reached/)).toBeInTheDocument();
    expect(document.title).toBe('Jannik Sinner — courtvision');
  });

  it('renders every section with real figures', async () => {
    mockApi();
    renderPlayer('/player/jannik-sinner');
    expect(await screen.findByText('How has Sinner played lately?')).toBeInTheDocument();
    expect(await screen.findByText('9–1')).toBeInTheDocument();                       // last 10
    expect(await screen.findByText('64.4%')).toBeInTheDocument();                     // vs top 10
    expect(await screen.findByRole('table', { name: 'Win percentage by surface and level' })).toBeInTheDocument();
    expect(await screen.findByText(/matches have point statistics/)).toBeInTheDocument();
    expect(screen.getByText('96th')).toBeInTheDocument();                             // 1st serve won percentile
    expect(await screen.findByText('Bergamo CH')).toBeInTheDocument();                // first title
    expect(await screen.findByText('Ranking trajectory')).toBeInTheDocument();
  });

  it('opens a split to its matches and the Lab', async () => {
    mockApi();
    renderPlayer('/player/jannik-sinner');
    const toggle = await screen.findByRole('button', { name: 'Show matches after losing the 1st set' });
    fireEvent.click(toggle);
    const foot = await screen.findByText(/Latest 3 of 137 matches in this split/);
    expect(within(foot.parentElement!).getByRole('link', { name: 'Open in Lab →' })).toHaveAttribute('href', '/lab?sql=SELECT%201');
    expect(get).toHaveBeenCalledWith('/search/relational', expect.objectContaining({ player: 'Jannik Sinner', tour: 'M', situation: 'lost_first', limit: 10 }));
  });

  it('sends filters to the filtered blocks and keeps tour out of the URL', async () => {
    mockApi();
    renderPlayer('/player/jannik-sinner?surface=Clay&from=2023');
    expect((await screen.findAllByText('Clay · 2023–2026'))[0]).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith('/player/splits', expect.objectContaining({ surface: 'Clay', year_min: 2023 })));
    expect(get).toHaveBeenCalledWith('/player/milestones', { player: 'Jannik Sinner', tour: 'M' });
  });

  it('replaces the filtered blocks with one empty state', async () => {
    mockApi();
    renderPlayer('/player/jannik-sinner?surface=Carpet');
    expect(await screen.findByText('Jannik Sinner has never played a match on carpet.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Splits')).toBeNull();
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset filters' }).at(-1)!);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/player\/jannik-sinner$/));
  });

  it('answers an unknown slug with suggestions', async () => {
    mockApi({ missing: true });
    renderPlayer('/player/jannik-sinnr');
    expect(await screen.findByRole('heading', { name: 'No player called ‘jannik-sinnr’' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Jannik Sinner/ })).toHaveAttribute('href', '/player/jannik-sinner');
  });

  it('picks the tour from ?tour= and links the namesake', async () => {
    const wta = { ...SINNER, tour: 'F', career_high: 400 };
    mockApi({ players: [SINNER, wta] });
    renderPlayer('/player/jannik-sinner?tour=F');
    expect(await screen.findByRole('link', { name: 'Jannik Sinner (ATP)' })).toHaveAttribute('href', '/player/jannik-sinner?tour=M');
    await waitFor(() => expect(get).toHaveBeenCalledWith('/player/summary', { player: 'Jannik Sinner', tour: 'F' }));
  });
});
