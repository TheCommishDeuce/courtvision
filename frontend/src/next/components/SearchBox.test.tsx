import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as directory from '../api/directory';
import type { DirectoryPlayer, Suggestions } from '../api/directory';
import { fillSearch } from '../lib/searchBus';
import { memoryStorage, renderAt } from '../test/render';
import SearchBox from './SearchBox';

const player = (name: string, tour: 'M' | 'F', career_high: number): DirectoryPlayer => ({
  name, slug: name.toLowerCase().replace(/ /g, '-'), tour, country: 'ITA', first_year: 2018, last_year: 2026, career_high, matches: 500,
});
const empty: Suggestions = { query: '', matchup: null, tournament_years: [], players: [], tournaments: [] };

describe('SearchBox', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('offers the matchup first and opens it with Enter', async () => {
    const sinner = player('Jannik Sinner', 'M', 1);
    const alcaraz = player('Carlos Alcaraz', 'M', 1);
    vi.spyOn(directory, 'fetchSuggestions').mockResolvedValue({ ...empty, matchup: { tour: 'M', a: sinner, b: alcaraz } });
    renderAt(<SearchBox />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'sinner alcaraz' } });
    expect(await screen.findByText('Sinner vs Alcaraz')).toBeInTheDocument();
    expect(screen.getByText('Matchup')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/versus/jannik-sinner/carlos-alcaraz');
  });

  it('groups players by tour with their career line, and arrows move the selection', async () => {
    vi.spyOn(directory, 'fetchSuggestions').mockResolvedValue({
      ...empty, players: [player('Jannik Sinner', 'M', 1), player('Martin Sinner', 'M', 42), player('Sinnia Test', 'F', 300)],
    });
    renderAt(<SearchBox />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'sinn' } });

    expect(await screen.findByText('ATP players')).toBeInTheDocument();
    expect(screen.getByText('WTA players')).toBeInTheDocument();
    expect(screen.getAllByText('ITA · 2018–2026 · career high #1')).toHaveLength(1);

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/player/martin-sinner');
  });

  it('remembers what was opened and shows it when focused empty', async () => {
    vi.spyOn(directory, 'fetchSuggestions').mockResolvedValue({ ...empty, players: [player('Jannik Sinner', 'M', 1)] });
    const { unmount } = renderAt(<SearchBox />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'sinner' } });
    await screen.findByText('Jannik Sinner');
    fireEvent.keyDown(input, { key: 'Enter' });
    unmount();

    renderAt(<SearchBox />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByText('Recent searches')).toBeInTheDocument();
    expect(screen.getByText('Jannik Sinner')).toBeInTheDocument();
  });

  it('points to the Lab when nothing matches', async () => {
    vi.spyOn(directory, 'fetchSuggestions').mockResolvedValue(empty);
    renderAt(<SearchBox />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz' } });
    expect(await screen.findByText('try asking the Lab')).toHaveAttribute('href', '/lab');
  });

  it('hands the pick to onPick in picker mode, with tour and exclude sent to the API', async () => {
    const spy = vi.spyOn(directory, 'fetchSuggestions').mockResolvedValue({ ...empty, players: [player('Carlos Alcaraz', 'M', 1)] });
    const onPick = vi.fn();
    renderAt(<SearchBox kind="players" tour="M" exclude="Jannik Sinner" onPick={onPick} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'alc' } });
    fireEvent.mouseDown(await screen.findByText('Carlos Alcaraz'));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ player: expect.objectContaining({ name: 'Carlos Alcaraz' }) }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ q: 'alc', kind: 'players', tour: 'M', exclude: 'Jannik Sinner' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('fills from its channel and focuses', async () => {
    vi.spyOn(directory, 'fetchSuggestions').mockResolvedValue(empty);
    renderAt(<SearchBox channel="hero" />);
    fillSearch('hero', 'Iga Swiatek');
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Iga Swiatek'));
    fillSearch('other', 'ignored');
    expect(screen.getByRole('combobox')).toHaveValue('Iga Swiatek');
  });
});
