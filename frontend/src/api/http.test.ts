import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './http';
import { fetchPlayers, runQuery } from './client';

afterEach(() => vi.restoreAllMocks());

describe('shared dashboard transport', () => {
  it('keeps the API base URL and dashboard access header', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.headers['X-CourtVision-Client']).toBe('dashboard');
  });

  it('routes GET helpers through the shared client and unwraps the response', async () => {
    // Intercept every Axios instance so a duplicate client fails the assertion
    // below without accidentally sending a real network request.
    vi.spyOn(axios.Axios.prototype, 'request').mockResolvedValue({ data: { players: ['Serena Williams'] } });
    const get = vi.spyOn(api, 'get');
    await expect(fetchPlayers('F')).resolves.toEqual(['Serena Williams']);
    expect(get).toHaveBeenCalledWith('/meta/players', { params: { tour: 'F' } });
  });

  it('routes SQL POSTs through the same client', async () => {
    const response = { columns: ['ok'], rows: [[1]], row_count: 1, truncated: false, limit: 1, elapsed_ms: 0 };
    vi.spyOn(axios.Axios.prototype, 'request').mockResolvedValue({ data: response });
    const post = vi.spyOn(api, 'post');
    await expect(runQuery('SELECT 1 AS ok', 1)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith('/query', { sql: 'SELECT 1 AS ok', limit: 1 });
  });
});
