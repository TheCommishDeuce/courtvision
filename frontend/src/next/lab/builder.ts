/** "Build a query": the shared filters, a relation and a player, written out as editable SQL. */
import { filterConditions, sqlString } from '../lib/labSql';
import type { Filters } from '../lib/filters';

export type Relation = 'player_match_view' | 'matches_main' | 'h2h_view' | 'players';

export const RELATIONS: { value: Relation; label: string }[] = [
  { value: 'player_match_view', label: 'Matches, from each player’s side' },
  { value: 'matches_main', label: 'Matches (winner / loser)' },
  { value: 'h2h_view', label: 'Head-to-head pairs' },
  { value: 'players', label: 'Players' },
];

export interface BuilderState extends Filters {
  relation: Relation;
  player: string;
  order: 'newest' | 'oldest';
  limit: number;
}

const COLUMNS: Record<Relation, string> = {
  player_match_view: 'date, tournament, round, opponent_name, opponent_rank, result, score',
  matches_main: 'date, tournament, round, winner_name, loser_name, score',
  h2h_view: 'date, tournament, round, player_a, player_b, winner_name, score',
  players: 'name, country, birthdate, hand, height, current_rank',
};

export function buildSql(s: BuilderState): string {
  const where = [`tour = ${sqlString(s.tour)}`];
  if (s.relation !== 'players') where.push(...filterConditions(s));
  const p = s.player.trim();
  if (p) {
    const name = sqlString(p);
    where.push({
      player_match_view: `player_name = ${name}`,
      matches_main: `(winner_name = ${name} OR loser_name = ${name})`,
      h2h_view: `${name} IN (player_a, player_b)`,
      players: `name = ${name}`,
    }[s.relation]);
  }
  const order = s.relation === 'players'
    ? 'current_rank NULLS LAST'
    : `date ${s.order === 'newest' ? 'DESC' : 'ASC'}`;
  return [
    `SELECT ${COLUMNS[s.relation]}`,
    `FROM ${s.relation}`,
    `WHERE ${where.join('\n  AND ')}`,
    `ORDER BY ${order}`,
    `LIMIT ${Math.max(1, Math.min(1000, Math.round(s.limit)))}`,
  ].join('\n');
}
