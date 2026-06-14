import { useLeadersReturn } from '../../../hooks';
import LeaderTable, { type LeaderColumn } from './LeaderTable';
import QueryError from '../../ui/QueryError';

interface ReturnRow {
  player_name: string;
  tour: string;
  n_matches: number;
  first_return_win_pct: number | null;
  second_return_win_pct: number | null;
  bp_converted_pct: number | null;
}

const COLS: LeaderColumn<ReturnRow>[] = [
  { key: 'n_matches',            label: 'Matches' },
  { key: 'first_return_win_pct', label: '1st Ret Won %', fmt: v => v == null ? '—' : `${v}%` },
  { key: 'second_return_win_pct',label: '2nd Ret Won %', fmt: v => v == null ? '—' : `${v}%` },
  { key: 'bp_converted_pct',     label: 'BP Conv %',     fmt: v => v == null ? '—' : `${v}%` },
];

export function ReturnTab({ tour, surface, level, yearRange }: { tour: string; surface: string; level: string; yearRange: [number, number] }) {
  const { data, isFetching, isError, refetch } = useLeadersReturn({
    tour, surface: surface === 'All' ? undefined : surface, level: level || undefined,
    year_min: yearRange[0], year_max: yearRange[1],
  });
  if (isError) return <QueryError message="Couldn't load the return leaderboard." onRetry={() => refetch()} />;
  const rows = (data ?? []) as ReturnRow[];
  return <LeaderTable rows={rows} columns={COLS} initialSortKey="first_return_win_pct" isFetching={isFetching} />;
}
