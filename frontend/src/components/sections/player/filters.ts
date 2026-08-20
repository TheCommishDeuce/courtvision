import { z } from 'zod';

export const playerFilterSchema = z.object({
  tour: z.enum(['M', 'F']),
  p: z.string().optional(),
  surface: z.string(),
  level: z.string(),
  y0: z.coerce.number().optional(),
  y1: z.coerce.number().optional(),
});

export type PlayerFilters = z.infer<typeof playerFilterSchema>;

export const defaultPlayerFilters: PlayerFilters = {
  tour: 'M',
  surface: 'All',
  level: 'All Tour',
};
