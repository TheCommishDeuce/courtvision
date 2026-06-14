import { useLeadersServe } from '../../../hooks';
import LeaderTable, { type LeaderColumn } from './LeaderTable';
import QueryError from '../../ui/QueryError';

interface ServeRow {
  player_name: string;
  tour: string;
  n_matches: number;
  total_aces: number;
  ace_pct: number | null;
  first_in_pct: number | null;
  first_win_pct: number | null;
  second_win_pct: number | null;
  bp_saved_pct: number | null;
}

const COLS: LeaderColumn<ServeRow>[] = [
  { key: 'n_matches',       label: 'Matches' },
  { key: 'total_aces',      label: 'Aces' },
  { key: 'ace_pct',         label: 'Ace %',      fmt: v => v == null ? '—' : `${v}%` },
  { key: 'first_in_pct',    label: '1st In %',   fmt: v => v == null ? '—' : `${v}%` },
  { key: 'first_win_pct',   label: '1st Won %',  fmt: v => v == null ? '—' : `${v}%` },
  { key: 'second_win_pct',  label: '2nd Won %',  fmt: v => v == null ? '—' : `${v}%` },
  { key: 'bp_saved_pct',    label: 'BP Saved %', fmt: v => v == null ? '—' : `${v}%` },
];

export function ServeTab({ tour, surface, level, yearRange }: { tour: string; surface: string; level: string; yearRange: [number, number] }) {
  const { data, isFetching, isError, refetch } = useLeadersServe({
    tour, surface: surface === 'All' ? undefined : surface, level: level || undefined,
    year_min: yearRange[0], year_max: yearRange[1],
  });
  if (isError) return <QueryError message="Couldn't load the serve leaderboard." onRetry={() => refetch()} />;
  const rows = (data ?? []) as ServeRow[];
  return <LeaderTable rows={rows} columns={COLS} initialSortKey="ace_pct" isFetching={isFetching} />;
}
