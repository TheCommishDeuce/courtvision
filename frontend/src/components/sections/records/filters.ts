import { z } from 'zod';

export const recordsFilterSchema = z.object({
  tab: z.enum(['players', 'matches']).optional(),
  tour: z.enum(['M', 'F']),
  surface: z.string().optional(),
  level: z.string().optional(),
  y0: z.coerce.number().optional(),
  y1: z.coerce.number().optional(),
  board: z.string().optional(),
});

export type RecordsFilters = z.infer<typeof recordsFilterSchema>;

export const defaultRecordsFilters: RecordsFilters = {
  tab: 'players',
  tour: 'M',
  surface: 'All',
  level: 'All Tour',
};
