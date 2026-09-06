import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as hooks from '../hooks';
import PlayerPage from './PlayerPage';
import VersusPage from './VersusPage';

vi.mock('../hooks', async importOriginal => {
  const original = await importOriginal<typeof import('../hooks')>();
  return Object.fromEntries(Object.keys(original).map(name => [name, vi.fn().mockReturnValue({
    data: undefined, isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
  })]));
});

function query<T>(data: T) {
  return { data, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() } as unknown as UseQueryResult<T>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hooks.useYearRange).mockReturnValue(query({ year_min: 2010, year_max: 2025 }));
  vi.mocked(hooks.usePlayers).mockReturnValue(query(['Player A', 'Player B']));
  vi.mocked(hooks.usePlayerSummary).mockReturnValue(query({
    total: 2, wins: 2, losses: 0, career_high_rank: 1,
    gs_titles: 1, tour_titles: 1, challenger_titles: 0, itf_titles: 0,
  }));
  vi.mocked(hooks.usePlayerMatches).mockReturnValue(query({
    total: 2, by_surface: [], by_level: [], by_year: [], last20: [], recent52w: [],
  }));
  vi.mocked(hooks.usePlayerServePercentiles).mockReturnValue(query({ 'ace%': 80, tour_size: 100 }));
  vi.mocked(hooks.usePlayerReturnPercentiles).mockReturnValue(query({ '1st_return_win%': 50, tour_size: 100 }));
});

function open(page: 'player' | 'versus', tour: string) {
  const names = page === 'player' ? 'p=Player+A' : 'a=Player+A&b=Player+B';
  return render(
    <MemoryRouter initialEntries={[`/${page}?${names}&tour=${tour}&surface=Clay&y0=2020&y1=2024`]}>
      {page === 'player' ? <PlayerPage /> : <VersusPage />}
    </MemoryRouter>,
  );
}

const scopedHooks = [hooks.usePlayerSummary, hooks.usePlayerServeStats, hooks.usePlayerReturnStats, hooks.useTopNRecords];

function expectScope(tour: string, level: string | undefined, pair: boolean) {
  const names = pair ? ['Player A', 'Player B'] : ['Player A'];
  for (const player of names) {
    const params = { player, tour, surface: 'Clay', level, year_min: 2020, year_max: 2024 };
    for (const hook of scopedHooks) expect(hook).toHaveBeenCalledWith(params, true);
    expect(hooks.usePlayerMatches).toHaveBeenCalledWith(params, true);
    for (const hook of [hooks.usePlayerServePercentiles, hooks.usePlayerReturnPercentiles]) {
      expect(hook).toHaveBeenCalledWith({ player, tour }, true);
      expect(vi.mocked(hook).mock.calls.every(([args]) => Object.keys(args).sort().join(',') === 'player,tour')).toBe(true);
    }
  }
}

describe.each(['M', 'F'])('filter scopes on tour %s', tour => {
  it('Player sends All Tour to every filtered statistic, keeping profile comparisons career-wide', () => {
    open('player', tour);
    expectScope(tour, 'All Tour', false);
    expect(hooks.usePlayerMilestones).toHaveBeenCalledWith({ player: 'Player A', tour }, true);
    expect(hooks.useSimilarPlayers).toHaveBeenCalledWith({ player: 'Player A', tour }, true);
    expect(hooks.useSimilarPlayersReturn).toHaveBeenCalledWith({ player: 'Player A', tour }, true);
    expect(screen.getByText('2W – 0L')).toBeInTheDocument();
    expect(screen.getByText('Career peak rank')).toBeInTheDocument();
    expect(screen.getByText(/career-wide tour percentiles/i)).toBeInTheDocument();
  });

  it('changing Player level updates all match-derived requests without narrowing percentiles', () => {
    open('player', tour);
    vi.clearAllMocks();
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'Grand Slam' } });
    expectScope(tour, 'Grand Slam', false);
  });

  it('the explicit All levels choice survives URL defaults', () => {
    open('player', tour);
    vi.clearAllMocks();
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'All' } });
    expect(screen.getByLabelText('Level')).toHaveValue('All');
    expectScope(tour, undefined, false);
  });

  it('changing Versus level updates both records and the common-opponent comparison', () => {
    open('versus', tour);
    vi.clearAllMocks();
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'Grand Slam' } });
    expectScope(tour, 'Grand Slam', true);
    expect(hooks.useCommonOpponents).toHaveBeenCalledWith({
      player_a: 'Player A', player_b: 'Player B', tour, surface: 'Clay', level: 'Grand Slam', year_min: 2020, year_max: 2024,
    }, true);
  });

  it('Versus scopes H2H, both records, and common opponents to the same filters', () => {
    open('versus', tour);
    expectScope(tour, 'All Tour', true);
    const pair = { player_a: 'Player A', player_b: 'Player B', tour, surface: 'Clay', level: 'All Tour', year_min: 2020, year_max: 2024 };
    expect(hooks.useH2H).toHaveBeenCalledWith(pair, true);
    expect(hooks.useCommonOpponents).toHaveBeenCalledWith(pair, true);
    expect(screen.queryByText(/level filter applies to the head-to-head only/i)).not.toBeInTheDocument();
    expect(screen.getByText(/career-wide tour percentiles/i)).toBeInTheDocument();
  });
});
