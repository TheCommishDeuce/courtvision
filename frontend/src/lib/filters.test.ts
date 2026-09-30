import { describe, expect, it } from 'vitest';
import { countActive, describeFilters, filterSchema, LEVELS, toApiParams, type Filters } from './filters';

const career: Filters = { tour: 'M', surface: 'All', level: 'All', from: null, to: null };

describe('filters', () => {
  it('describes filters in words', () => {
    expect(describeFilters(career, 'Whole career')).toBe('Whole career');
    expect(describeFilters({ ...career, surface: 'Clay', level: 'Grand Slam', from: 2023, to: 2026 }, ''))
      .toBe('Clay · Grand Slams · 2023–2026');
    expect(describeFilters({ ...career, from: 2026, to: 2026 }, '')).toBe('2026');
    expect(describeFilters({ ...career, from: 2020 }, '', [2018, 2026])).toBe('2020–2026');
    expect(describeFilters({ ...career, from: 2020 }, '')).toBe('since 2020');
    expect(describeFilters({ ...career, tour: 'F', level: 'Masters 1000' }, '')).toBe('WTA 1000');
  });

  it('counts filters that differ from the page defaults', () => {
    expect(countActive(career, career)).toBe(0);
    expect(countActive({ ...career, surface: 'Clay', from: 2023 }, career)).toBe(2);
  });

  it('maps to API params, dropping "everything" values and ordering years', () => {
    expect(toApiParams(career)).toEqual({ tour: 'M', surface: undefined, level: undefined, year_min: undefined, year_max: undefined });
    expect(toApiParams({ ...career, surface: 'Grass', level: 'All Tour', from: 2026, to: 2020 }))
      .toEqual({ tour: 'M', surface: 'Grass', level: 'All Tour', year_min: 2020, year_max: 2026 });
  });

  it('validates each URL field on its own', () => {
    const level = filterSchema.shape.level;
    expect(level.safeParse('Grand Slam').success).toBe(true);
    expect(level.safeParse('WTA 500').success).toBe(true);
    expect(level.safeParse('Nonsense').success).toBe(false);
    expect(filterSchema.shape.from.safeParse('2023').data).toBe(2023);
    expect(filterSchema.shape.surface.safeParse('Ice').success).toBe(false);
  });

  it('offers tour-specific levels', () => {
    expect(LEVELS.M.map(l => l.value)).toContain('ATP 250/500');
    expect(LEVELS.F.map(l => l.value)).toContain('WTA 250');
    expect(LEVELS.M.map(l => l.value)).not.toContain('WTA 250');
  });
});
