import { z } from 'zod';

export const tournamentFilterSchema = z.object({
  tour: z.enum(['M', 'F']),
  t: z.string().optional(),
  year: z.coerce.number().optional(),
});

export type TournamentFilters = z.infer<typeof tournamentFilterSchema>;

export const defaultTournamentFilters: TournamentFilters = {
  tour: 'M',
};
