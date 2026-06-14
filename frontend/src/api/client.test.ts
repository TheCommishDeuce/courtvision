import { describe, it, expect } from 'vitest';
import { _flattenSearchParams, searchMatchesCsvUrl } from './client';

describe('_flattenSearchParams', () => {
  it('drops undefined, null, and empty-string values', () => {
    expect(
      _flattenSearchParams({ winner: 'Federer', loser: undefined, surface: '', tour: 'M' }),
    ).toEqual({ winner: 'Federer', tour: 'M' });
  });

  it('stringifies numbers and booleans', () => {
    expect(
      _flattenSearchParams({ year_min: 2010, upsets_only: true, limit: 50 }),
    ).toEqual({ year_min: '2010', upsets_only: 'true', limit: '50' });
  });

  it('expands stat_filters into col_min/col_max keys', () => {
    expect(
      _flattenSearchParams({ stat_filters: { aces: { min: 10, max: 30 }, dfs: { max: 5 } } }),
    ).toEqual({ aces_min: '10', aces_max: '30', dfs_max: '5' });
  });

  it('keeps zero values in stat_filters', () => {
    expect(_flattenSearchParams({ stat_filters: { dfs: { min: 0 } } })).toEqual({ dfs_min: '0' });
  });
});

describe('searchMatchesCsvUrl', () => {
  it('builds the CSV URL with flattened query params', () => {
    expect(
      searchMatchesCsvUrl({ winner: 'Iga Swiatek', tour: 'W', stat_filters: { aces: { min: 5 } } }),
    ).toBe('/api/search/matches/csv?winner=Iga+Swiatek&tour=W&aces_min=5');
  });
});
