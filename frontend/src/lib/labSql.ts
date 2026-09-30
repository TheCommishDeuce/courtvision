/**
 * SQL for "Open in Lab" links built from the shared filters. Mirrors the API's
 * filter semantics (db/queries/_helpers.py: 'All Tour' = main-tour levels,
 * main draw only), so the Lab lists what the page counted.
 */
import { yearBounds, type Filters } from './filters';

/** Keep in step with _TOUR_LEVELS in db/queries/_helpers.py. */
export const TOUR_LEVEL_NAMES = ['Grand Slam', 'Masters 1000', 'ATP 250/500', 'WTA 500', 'WTA 250', 'Tour Finals', 'Olympics', 'WTA'];

export const sqlString = (s: string): string => `'${s.replace(/'/g, "''")}'`;

/** WHERE conditions for the shared filters over player_match_view / matches_main columns. */
export function filterConditions(f: Pick<Filters, 'surface' | 'level' | 'from' | 'to'>): string[] {
  const out: string[] = [];
  if (f.surface !== 'All') out.push(`surface = ${sqlString(f.surface)}`);
  if (f.level === 'All Tour') {
    out.push(`level_name IN (${TOUR_LEVEL_NAMES.map(sqlString).join(', ')})`);
    out.push(`round NOT IN ('Q1', 'Q2', 'Q3', 'ER')`);
  } else if (f.level !== 'All') {
    out.push(`level_name = ${sqlString(f.level)}`);
  }
  const [from, to] = yearBounds(f);
  if (from != null) out.push(`year >= ${from}`);
  if (to != null) out.push(`year <= ${to}`);
  return out;
}

export function playerMatchesSql(player: string, tour: string, f: Filters): string {
  const where = [`player_name = ${sqlString(player)}`, `tour = ${sqlString(tour)}`, ...filterConditions(f)];
  return [
    'SELECT date, tournament, level_name, surface, round, opponent_name, opponent_rank, result, score',
    'FROM player_match_view',
    `WHERE ${where.join('\n  AND ')}`,
    'ORDER BY date DESC',
  ].join('\n');
}

export const labHref = (sql: string): string => `/lab?sql=${encodeURIComponent(sql)}`;
