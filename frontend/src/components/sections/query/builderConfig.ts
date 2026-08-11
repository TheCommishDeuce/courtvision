/**
 * What the query builder can filter, per relation.
 *
 * These mirror the filters the rest of the site exposes — tour, surface, level,
 * round, years, names — so someone who knows the Records or Player pages can
 * find the same controls here and then read the SQL they produce.
 */

export type RelationName = 'matches_main' | 'player_match_view' | 'h2h_view' | 'players';

export type FilterKind = 'text' | 'select' | 'numberRange' | 'bool' | 'yearRange';

export interface FilterDef {
  id: string;
  label: string;
  /** Column the clause is built against. */
  column: string;
  kind: FilterKind;
  options?: { label: string; value: string }[];
  /** Placeholder for text/number inputs. */
  hint?: string;
}

const TOUR: FilterDef = {
  id: 'tour',
  label: 'Tour',
  column: 'tour',
  kind: 'select',
  options: [
    { label: 'Any', value: '' },
    { label: 'ATP', value: 'M' },
    { label: 'WTA', value: 'F' },
  ],
};

const SURFACE: FilterDef = {
  id: 'surface',
  label: 'Surface',
  column: 'surface',
  kind: 'select',
  options: [
    { label: 'Any', value: '' },
    { label: 'Hard', value: 'Hard' },
    { label: 'Clay', value: 'Clay' },
    { label: 'Grass', value: 'Grass' },
    { label: 'Carpet', value: 'Carpet' },
  ],
};

const LEVEL: FilterDef = {
  id: 'level_name',
  label: 'Level',
  column: 'level_name',
  kind: 'select',
  options: [
    { label: 'Any', value: '' },
    { label: 'Grand Slam', value: 'Grand Slam' },
    { label: 'Masters 1000', value: 'Masters 1000' },
    { label: 'ATP 250/500', value: 'ATP 250/500' },
    { label: 'WTA 500', value: 'WTA 500' },
    { label: 'WTA 250', value: 'WTA 250' },
    { label: 'Tour Finals', value: 'Tour Finals' },
    { label: 'Olympics', value: 'Olympics' },
    { label: 'Challenger', value: 'Challenger' },
    { label: 'ITF', value: 'ITF' },
  ],
};

const ROUND: FilterDef = {
  id: 'round',
  label: 'Round',
  column: 'round',
  kind: 'select',
  options: [
    { label: 'Any', value: '' },
    { label: 'Final', value: 'F' },
    { label: 'Semifinal', value: 'SF' },
    { label: 'Quarterfinal', value: 'QF' },
    { label: 'Round of 16', value: 'R16' },
    { label: 'Round of 32', value: 'R32' },
    { label: 'Round of 64', value: 'R64' },
    { label: 'Round of 128', value: 'R128' },
    { label: 'Round robin', value: 'RR' },
  ],
};

const YEARS: FilterDef = { id: 'year', label: 'Years', column: 'year', kind: 'yearRange' };

export interface RelationDef {
  name: RelationName;
  /** One line on what a row of this relation is. */
  grain: string;
  defaultColumns: string[];
  defaultOrderBy: string;
  filters: FilterDef[];
}

export const RELATIONS: RelationDef[] = [
  {
    name: 'matches_main',
    grain: 'One row per match, oriented winner and loser.',
    defaultColumns: ['date', 'tournament', 'surface', 'round', 'winner_name', 'loser_name', 'score'],
    defaultOrderBy: 'date',
    filters: [
      TOUR,
      SURFACE,
      LEVEL,
      ROUND,
      YEARS,
      { id: 'tournament', label: 'Tournament contains', column: 'tournament', kind: 'text', hint: 'e.g. Wimbledon' },
      { id: 'winner_name', label: 'Winner contains', column: 'winner_name', kind: 'text', hint: 'e.g. Federer' },
      { id: 'loser_name', label: 'Loser contains', column: 'loser_name', kind: 'text', hint: 'e.g. Nadal' },
      { id: 'winner_rank', label: 'Winner rank', column: 'winner_rank', kind: 'numberRange' },
      { id: 'loser_rank', label: 'Loser rank', column: 'loser_rank', kind: 'numberRange' },
      { id: 'is_upset', label: 'Upsets only', column: 'is_upset', kind: 'bool' },
      { id: 'had_tiebreak', label: 'Had a tiebreak', column: 'had_tiebreak', kind: 'bool' },
      { id: 'is_complete', label: 'Completed matches only', column: 'is_complete', kind: 'bool' },
    ],
  },
  {
    name: 'player_match_view',
    grain: 'One row per player per match, so each match appears twice.',
    defaultColumns: ['date', 'tournament', 'surface', 'round', 'player_name', 'result', 'opponent_name', 'score'],
    defaultOrderBy: 'date',
    filters: [
      TOUR,
      SURFACE,
      LEVEL,
      ROUND,
      YEARS,
      { id: 'player_name', label: 'Player contains', column: 'player_name', kind: 'text', hint: 'e.g. Swiatek' },
      { id: 'opponent_name', label: 'Opponent contains', column: 'opponent_name', kind: 'text' },
      {
        id: 'result',
        label: 'Result',
        column: 'result',
        kind: 'select',
        options: [
          { label: 'Any', value: '' },
          { label: 'Wins', value: 'W' },
          { label: 'Losses', value: 'L' },
        ],
      },
      { id: 'player_rank', label: 'Player rank', column: 'player_rank', kind: 'numberRange' },
      { id: 'opponent_rank', label: 'Opponent rank', column: 'opponent_rank', kind: 'numberRange' },
      { id: 'aces', label: 'Aces', column: 'aces', kind: 'numberRange' },
    ],
  },
  {
    name: 'h2h_view',
    grain: 'One row per match with the pair ordered alphabetically, so A v B and B v A match the same rows.',
    defaultColumns: ['date', 'tournament', 'surface', 'round', 'player_a', 'player_b', 'winner_name', 'score'],
    defaultOrderBy: 'date',
    filters: [
      TOUR,
      SURFACE,
      LEVEL,
      ROUND,
      YEARS,
      { id: 'player_a', label: 'Player A contains', column: 'player_a', kind: 'text' },
      { id: 'player_b', label: 'Player B contains', column: 'player_b', kind: 'text' },
      { id: 'winner_name', label: 'Winner contains', column: 'winner_name', kind: 'text' },
    ],
  },
  {
    name: 'players',
    grain: 'One row per player in the reference list.',
    defaultColumns: ['name', 'country', 'birthdate', 'hand', 'height', 'current_rank'],
    defaultOrderBy: 'current_rank',
    filters: [
      TOUR,
      { id: 'name', label: 'Name contains', column: 'name', kind: 'text' },
      { id: 'country', label: 'Country', column: 'country', kind: 'text', hint: 'e.g. ESP' },
      {
        id: 'hand',
        label: 'Hand',
        column: 'hand',
        kind: 'select',
        options: [
          { label: 'Any', value: '' },
          { label: 'Right', value: 'R' },
          { label: 'Left', value: 'L' },
        ],
      },
      { id: 'current_rank', label: 'Current rank', column: 'current_rank', kind: 'numberRange' },
      { id: 'height', label: 'Height (cm)', column: 'height', kind: 'numberRange' },
    ],
  },
];

export const relationByName = (name: RelationName): RelationDef =>
  RELATIONS.find(r => r.name === name) ?? RELATIONS[0];

/** A filter's current value. Ranges keep both ends; bool is on or absent. */
export interface FilterValue {
  text?: string;
  select?: string;
  min?: string;
  max?: string;
  on?: boolean;
}

export type FilterValues = Record<string, FilterValue>;

/** Single-quote escaping for string literals we put into generated SQL. */
const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;

const numeric = (raw?: string): number | null => {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Builds the WHERE clauses for the active filters, in definition order. */
export function buildConditions(relation: RelationDef, values: FilterValues): string[] {
  const out: string[] = [];

  for (const f of relation.filters) {
    const v = values[f.id];
    if (!v) continue;

    switch (f.kind) {
      case 'select':
        if (v.select) out.push(`${f.column} = ${lit(v.select)}`);
        break;
      case 'text':
        if (v.text?.trim()) out.push(`${f.column} ILIKE ${lit(`%${v.text.trim()}%`)}`);
        break;
      case 'bool':
        if (v.on) out.push(`${f.column}`);
        break;
      case 'yearRange':
      case 'numberRange': {
        const lo = numeric(v.min);
        const hi = numeric(v.max);
        if (lo !== null && hi !== null) out.push(`${f.column} BETWEEN ${lo} AND ${hi}`);
        else if (lo !== null) out.push(`${f.column} >= ${lo}`);
        else if (hi !== null) out.push(`${f.column} <= ${hi}`);
        break;
      }
    }
  }

  return out;
}

export interface BuildOptions {
  relation: RelationDef;
  values: FilterValues;
  columns: string[];
  orderBy: string;
  orderDir: 'ASC' | 'DESC';
  limit: number;
}

/** Renders the builder state as readable, hand-editable SQL. */
export function buildSql({
  relation,
  values,
  columns,
  orderBy,
  orderDir,
  limit,
}: BuildOptions): string {
  const select = columns.length > 0 ? columns.join(', ') : '*';
  const conditions = buildConditions(relation, values);

  const lines = [`SELECT ${select}`, `FROM ${relation.name}`];
  if (conditions.length > 0) {
    lines.push(`WHERE ${conditions.join('\n  AND ')}`);
  }
  if (orderBy) lines.push(`ORDER BY ${orderBy} ${orderDir} NULLS LAST`);
  lines.push(`LIMIT ${limit}`);

  return lines.join('\n');
}
