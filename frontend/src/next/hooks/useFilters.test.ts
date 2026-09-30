import { describe, expect, it } from 'vitest';
import type { Filters } from '../lib/filters';
import { parseFilters, writeFilters } from './useFilters';

const defaults: Filters = { tour: 'M', surface: 'All', level: 'All', from: null, to: null };

describe('URL filters', () => {
  it('parses each field independently, falling back per field', () => {
    const f = parseFilters(new URLSearchParams('surface=Clay&level=Nonsense&from=2023&to=abc'), defaults);
    expect(f).toEqual({ ...defaults, surface: 'Clay', from: 2023 });
  });

  it('writes only what differs from the defaults and keeps unrelated params', () => {
    const prev = new URLSearchParams('board=wins&surface=Grass');
    const next = writeFilters(prev, { ...defaults, surface: 'All', from: 2020 }, defaults);
    expect(next.toString()).toBe('board=wins&from=2020');
  });
});
