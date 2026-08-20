import { z } from 'zod';

export const searchFilterSchema = z.object({
  tab: z.enum(['query', 'cohort']).optional(),
  tour: z.enum(['M', 'F']).optional(),
});

export type SearchFilters = z.infer<typeof searchFilterSchema>;

export const defaultSearchFilters: SearchFilters = {
  tab: 'query',
  tour: 'M',
};
