import { useLeadersStreaks } from '../../../hooks';
import Spinner from '../../ui/Spinner';
import QueryError from '../../ui/QueryError';
import { PlayerLink, TourTag, TableShell, ROW_CLASS } from './shared';

export function StreaksTab({ tour, surface, level, yearRange }: { tour: string; surface: string; level: string; yearRange: [number, number] }) {
  const { data, isFetching, isError, refetch } = useLeadersStreaks({
    tour, surface: surface === 'All' ? undefined : surface, level: level || undefined,
    year_min: yearRange[0], year_max: yearRange[1],
  });
  if (isFetching) return <div className="py-10 flex justify-center"><Spinner /></div>;
  if (isError) return <QueryError message="Couldn't load the streaks leaderboard." onRetry={() => refetch()} />;
  return (
    <TableShell>
      <thead>
        <tr className="border-b border-[var(--rule)] bg-[var(--bone-2)]">
          {['#', 'Player', 'Tour', 'Streak', 'Surface', 'Start', 'End'].map((h, i) => (
            <th key={h} className={`px-3 py-2 ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-left text-[var(--ink)] ${i === 0 ? 'w-10' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(data ?? []).slice(0, 50).map((r, i) => (
          <tr key={i} className={ROW_CLASS}>
            <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--mute)]">{i + 1}</td>
            <td className="px-3 py-1.5 text-[12.5px]"><PlayerLink name={r.player_name} tour={r.tour} /></td>
            <td className="px-3 py-1.5"><TourTag tour={r.tour} /></td>
            <td className="px-3 py-1.5 ba-mono text-[12.5px] font-bold text-[var(--clay)]">{r.streak_length}</td>
            <td className="px-3 py-1.5 text-[12px]">{r.surface}</td>
            <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--ink-2)]">{r.start_date?.slice(0, 10)}</td>
            <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--ink-2)]">{r.end_date?.slice(0, 10) ?? 'Active'}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
