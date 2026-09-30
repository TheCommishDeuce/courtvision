import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '../api/http';
import { memoryStorage, renderAt } from '../test/render';
import HomePage from './HomePage';

vi.mock('../api/http', () => ({ get: vi.fn() }));

const STATS = { total_matches: 1069410, year_min: 1910, year_max: 2026, total_upsets: 0, total_tournaments: 0, total_players: 0, data_through: '2026-08-10' };
const STORY = {
  type: 'most_wins', label: 'Win Leader', headline: 'Jannik Sinner leads the ATP in wins', detail: 'Most tour-level match wins this season.',
  player_name: 'Jannik Sinner', tour: 'M', value: '37', link: '/records?tab=players&board=wins&tour=M&level=All%20Tour&y0=2026&y1=2026',
};
const CHAMP = {
  tournament: 'Roland Garros', year: 2026, winner_name: 'Alexander Zverev', loser_name: 'Flavio Cobolli',
  score: '6-1 4-6 6-4 6-7(5) 6-1', surface: 'Clay', level: 'G', level_name: 'Grand Slam', date: '2026-05-25T00:00:00',
};
const upset = (winner: string, wr: number, lr: number) => ({
  date: '2026-06-08T00:00:00', tournament: "'s-Hertogenbosch", round: 'SF', winner_name: winner, winner_rank: wr,
  loser_name: 'Someone Else', loser_rank: lr, score: '6-4 6-2', tour: 'F', rank_diff: wr - lr,
});

function mockApi(overrides: Record<string, () => unknown> = {}) {
  vi.mocked(get).mockImplementation(async (path: string, params?: object) => {
    if (overrides[path]) return overrides[path]();
    const tour = (params as { tour?: string } | undefined)?.tour;
    switch (path) {
      case '/meta/stats': return STATS;
      case '/meta/storylines': return [STORY];
      case '/tournament/recent-champions': return tour === 'M' ? [CHAMP] : [];
      case '/meta/recent-upsets': return tour === 'F' ? [upset('Small Gap', 150, 100), upset('Robin Montgomery', 484, 109)] : [];
      default: throw new Error(path);
    }
  });
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.mocked(get).mockReset();
  });

  it('shows the hero with freshness and fills the search from a chip', async () => {
    mockApi();
    renderAt(<HomePage />);
    expect(await screen.findByText(/1,069,410 matches · 1910–2026 · data through 10 Aug 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wimbledon 2025' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Wimbledon 2025'));
  });

  it('links storyline cards to the v1 Records address', async () => {
    mockApi();
    renderAt(<HomePage />);
    const card = await screen.findByRole('link', { name: /Jannik Sinner leads the ATP in wins/ });
    expect(card).toHaveAttribute('href', '/records?board=wins&tour=M&level=All+Tour&from=2026&to=2026');
  });

  it('lists the six Lab questions', () => {
    mockApi();
    renderAt(<HomePage />);
    const q = screen.getByRole('link', { name: /Which teenagers have beaten a world No\. 1\?/ });
    expect(q).toHaveAttribute('href', '/lab?example=teens-beat-no1');
    expect(screen.getAllByRole('link', { name: /\?/ })).toHaveLength(6);
  });

  it('links champions to the tournament-year and players', async () => {
    mockApi();
    renderAt(<HomePage />);
    expect(await screen.findByRole('link', { name: 'Roland Garros' })).toHaveAttribute('href', '/tournament/roland-garros/2026?tour=M');
    expect(screen.getByRole('link', { name: 'Alexander Zverev' })).toHaveAttribute('href', '/player/alexander-zverev');
    expect(get).toHaveBeenCalledWith('/tournament/recent-champions', { tour: 'M', limit: 8, span: 'recent' });
  });

  it('orders upsets by ranking gap', async () => {
    mockApi();
    renderAt(<HomePage />);
    const first = await screen.findByLabelText('Ranking gap 375');
    const second = screen.getByLabelText('Ranking gap 50');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('link', { name: "'s-Hertogenbosch" })[0]).toHaveAttribute('href', '/tournament/s-hertogenbosch/2026?tour=F');
  });

  it('keeps the page when one block fails, and retries that block', async () => {
    let fail = true;
    mockApi({ '/meta/storylines': () => { if (fail) throw new Error('down'); return [STORY]; } });
    renderAt(<HomePage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This season’s leaders didn’t load');
    expect(await screen.findByRole('link', { name: 'Roland Garros' })).toBeInTheDocument();
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /Jannik Sinner leads/ })).toBeInTheDocument();
  });
});
