/** /api/directory: global search suggestions and slug resolution. */
import { get } from '../../api/http';
import type { Tour } from '../lib/filters';

export interface DirectoryPlayer {
  name: string;
  slug: string;
  tour: Tour;
  country: string | null;
  first_year: number | null;
  last_year: number | null;
  career_high: number | null;
  matches: number;
}

export interface DirectoryTournament {
  name: string;
  slug: string;
  tour: Tour;
  level_name: string | null;
  surface: string | null;
  first_year: number | null;
  last_year: number | null;
  matches: number;
}

export interface Suggestions {
  query: string;
  matchup: { tour: Tour; a: DirectoryPlayer; b: DirectoryPlayer } | null;
  tournament_years: (DirectoryTournament & { year: number })[];
  players: DirectoryPlayer[];
  tournaments: DirectoryTournament[];
}

export interface SuggestParams {
  q: string;
  tour?: Tour;
  kind?: 'all' | 'players' | 'tournaments';
  exclude?: string;
  limit?: number;
}

export const fetchSuggestions = (params: SuggestParams): Promise<Suggestions> =>
  get<Suggestions>('/directory/suggest', params);

export const resolvePlayer = (slug: string, tour?: Tour): Promise<{ players: DirectoryPlayer[] }> =>
  get(`/directory/players/${encodeURIComponent(slug)}`, { tour });

export const resolveTournament = (
  slug: string, tour?: Tour,
): Promise<{ tournaments: (DirectoryTournament & { years: number[] })[] }> =>
  get(`/directory/tournaments/${encodeURIComponent(slug)}`, { tour });
