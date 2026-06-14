import { useLeadersActivityCombined } from '../../../hooks';
import LeaderTable, { type LeaderColumn } from './LeaderTable';
import QueryError from '../../ui/QueryError';

interface ActivityRow {
  player_name: string;
  tour: string;
  matches: number;
  wins: number;
  win_pct: number | null;
  finals: number;
  titles: number;
  tb_played: number;
  tb_won: number;
  upset_wins: number;
  comebacks: number;
  bagels_given: number;
  bagels_received: number;
  breadsticks_given: number;
  breadsticks_received: number;
}

const COLS: LeaderColumn<ActivityRow>[] = [
  { key: 'matches',             label: 'M',        accent: true },
  { key: 'wins',                label: 'W',        accent: true },
  { key: 'win_pct',             label: 'Win %',    fmt: v => v == null ? '—' : `${v}%` },
  { key: 'finals',              label: 'Finals' },
  { key: 'titles',              label: 'Titles' },
  { key: 'tb_won',              label: 'TB W' },
  { key: 'tb_played',           label: 'TB P' },
  { key: 'upset_wins',          label: 'Upsets' },
  { key: 'comebacks',           label: 'Cmbks' },
  { key: 'bagels_given',        label: 'Bgl G' },
  { key: 'bagels_received',     label: 'Bgl R' },
  { key: 'breadsticks_given',   label: 'Brd G' },
  { key: 'breadsticks_received',label: 'Brd R' },
];

export function ActivityTab({ tour, surface, level, yearRange }: { tour: string; surface: string; level: string; yearRange: [number, number] }) {
  const { data, isFetching, isError, refetch } = useLeadersActivityCombined({
    tour,
    surface: surface === 'All' ? undefined : surface,
    level: level || undefined,
    year_min: yearRange[0],
    year_max: yearRange[1],
    min_matches: 10,
  });
  if (isError) return <QueryError message="Couldn't load the activity leaderboard." onRetry={() => refetch()} />;
  const rows = (data ?? []) as ActivityRow[];
  return <LeaderTable rows={rows} columns={COLS} initialSortKey="wins" isFetching={isFetching} zeroAsDash />;
}
