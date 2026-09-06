import { z } from 'zod';

export const versusFilterSchema = z.object({
  tour: z.enum(['M', 'F']),
  a: z.string().optional(),
  b: z.string().optional(),
  surface: z.string(),
  level: z.string(),
  y0: z.coerce.number().optional(),
  y1: z.coerce.number().optional(),
});

export type VersusFilters = z.infer<typeof versusFilterSchema> & { enabled?: boolean };

export const defaultVersusFilters: VersusFilters = {
  tour: 'M',
  surface: 'All',
  level: 'All Tour',
};

/** Extracts params for a single player API call from the combined versus filters. */
export function playerParams(f: VersusFilters, p: string) {
  return {
    player: p,
    tour: f.tour,
    surface: f.surface === 'All' ? undefined : f.surface,
    level: f.level === 'All' ? undefined : f.level || undefined,
    year_min: f.y0,
    year_max: f.y1,
  };
}
