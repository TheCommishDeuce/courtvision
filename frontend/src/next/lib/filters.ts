/**
 * The shared filter vocabulary (docs/design-brief/02-shell.md › Shared filter
 * model). Player, Matchup, Records and the Lab builder all speak it, and
 * FilterBar renders it.
 *
 * `level` values are what the API accepts: 'All', 'All Tour' (every main-tour
 * event, main draw), or an exact level_name. The data can't split ATP 250 from
 * ATP 500, so the options differ per tour rather than following the design's
 * generic "500 / 250" pair.
 */
import { z } from 'zod';
import { SURFACES } from './surface';

export type Tour = 'M' | 'F';
export const TOURS: readonly Tour[] = ['M', 'F'];

export interface LevelOption {
  value: string;
  label: string;
  /** Short form for the active-filter summary ("Grand Slams"). */
  summary: string;
}

const COMMON_HEAD: LevelOption[] = [
  { value: 'All', label: 'All levels', summary: '' },
  { value: 'All Tour', label: 'Tour level (all main-tour events)', summary: 'Tour level' },
  { value: 'Grand Slam', label: 'Grand Slam', summary: 'Grand Slams' },
];

export const LEVELS: Record<Tour, LevelOption[]> = {
  M: [
    ...COMMON_HEAD,
    { value: 'Masters 1000', label: 'Masters 1000', summary: 'Masters 1000' },
    { value: 'ATP 250/500', label: 'ATP 250 / 500', summary: 'ATP 250 / 500' },
    { value: 'Tour Finals', label: 'Tour Finals', summary: 'Tour Finals' },
    { value: 'Olympics', label: 'Olympics', summary: 'Olympics' },
    { value: 'Davis Cup', label: 'Davis Cup', summary: 'Davis Cup' },
    { value: 'Challenger', label: 'Challenger', summary: 'Challengers' },
    { value: 'ITF', label: 'ITF', summary: 'ITF' },
  ],
  F: [
    ...COMMON_HEAD,
    { value: 'Masters 1000', label: 'WTA 1000', summary: 'WTA 1000' },
    { value: 'WTA 500', label: 'WTA 500', summary: 'WTA 500' },
    { value: 'WTA 250', label: 'WTA 250', summary: 'WTA 250' },
    { value: 'Tour Finals', label: 'Tour Finals', summary: 'Tour Finals' },
    { value: 'Olympics', label: 'Olympics', summary: 'Olympics' },
    { value: 'BJK Cup', label: 'BJK Cup', summary: 'BJK Cup' },
    { value: 'Challenger', label: 'WTA 125 / Challenger', summary: 'WTA 125' },
    { value: 'ITF', label: 'ITF', summary: 'ITF' },
  ],
};

const ALL_LEVEL_VALUES = [...new Set([...LEVELS.M, ...LEVELS.F].map(l => l.value))];

export interface Filters {
  tour: Tour;
  surface: 'All' | (typeof SURFACES)[number];
  level: string;
  /** Inclusive year bounds; null = open. */
  from: number | null;
  to: number | null;
}

const year = z.coerce.number().int().min(1900).max(2100);

/** URL schema for useUrlFilters: each field falls back on its own. */
export const filterSchema = z.object({
  tour: z.enum(['M', 'F']),
  surface: z.enum(['All', ...SURFACES]),
  level: z.string().refine(v => ALL_LEVEL_VALUES.includes(v)),
  from: year.nullable(),
  to: year.nullable(),
});

export const countActive = (f: Filters, defaults: Filters): number =>
  (['tour', 'surface', 'level', 'from', 'to'] as const).filter(k => f[k] !== defaults[k]).length;

/** Years in order, whichever way round the user picked them. */
export function yearBounds(f: Pick<Filters, 'from' | 'to'>): [number | null, number | null] {
  const { from, to } = f;
  return from != null && to != null && from > to ? [to, from] : [from, to];
}

/**
 * The active filters in words: "Clay · Grand Slams · 2023–2026". Parts at
 * their "everything" value are left out; `fallback` is used when nothing is
 * narrowed ("Whole career").
 */
export function describeFilters(f: Filters, fallback: string, span?: [number, number]): string {
  const parts: string[] = [];
  if (f.surface !== 'All') parts.push(f.surface);
  const level = LEVELS[f.tour].find(l => l.value === f.level);
  if (level?.summary) parts.push(level.summary);
  const [from, to] = yearBounds(f);
  const lo = from ?? span?.[0];
  const hi = to ?? span?.[1];
  if (from != null || to != null) {
    if (lo != null && hi != null) parts.push(lo === hi ? String(lo) : `${lo}–${hi}`);
    else if (lo != null) parts.push(`since ${lo}`);
    else if (hi != null) parts.push(`to ${hi}`);
  }
  return parts.length ? parts.join(' · ') : fallback;
}

/** Filters as the API's common query params. */
export function toApiParams(f: Filters): {
  tour: Tour; surface?: string; level?: string; year_min?: number; year_max?: number;
} {
  const [from, to] = yearBounds(f);
  return {
    tour: f.tour,
    surface: f.surface === 'All' ? undefined : f.surface,
    level: f.level === 'All' ? undefined : f.level,
    year_min: from ?? undefined,
    year_max: to ?? undefined,
  };
}
