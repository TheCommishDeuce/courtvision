import { Link } from 'react-router-dom';
import { useLeadersDrawStrength } from '../../../hooks';
import Spinner from '../../ui/Spinner';
import QueryError from '../../ui/QueryError';
import { PlayerLink, TableShell, ROW_CLASS } from './shared';

export function DrawStrengthTab({ tour, surface, level, yearRange }: { tour: string; surface: string; level: string; yearRange: [number, number] }) {
  const { data, isFetching, isError, refetch } = useLeadersDrawStrength({
    tour, surface: surface === 'All' ? undefined : surface, level: level || undefined,
    year_min: yearRange[0], year_max: yearRange[1],
  });
  if (isFetching) return <div className="py-10 flex justify-center"><Spinner /></div>;
  if (isError) return <QueryError message="Couldn't load the draw-strength leaderboard." onRetry={() => refetch()} />;
  return (
    <TableShell>
      <thead>
        <tr className="border-b border-[var(--rule)] bg-[var(--bone-2)]">
          {['#', 'Player', 'Tournament', 'Year', 'Surface', 'Avg Opp', 'Wins', 'Best Opp'].map((h, i) => (
            <th key={h} className={`px-3 py-2 ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-left text-[var(--ink)] ${i === 0 ? 'w-10' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(data ?? []).slice(0, 50).map((r, i) => (
          <tr key={i} className={ROW_CLASS}>
            <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--mute)]">{i + 1}</td>
            <td className="px-3 py-1.5 text-[12.5px]"><PlayerLink name={r.player_name} tour={r.tour} /></td>
            <td className="px-3 py-1.5 text-[12px]">
              <Link to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.year}&tour=${r.tour}`} className="ba-link">
                {r.tournament}
              </Link>
            </td>
            <td className="px-3 py-1.5 ba-mono text-[11.5px]">{r.year}</td>
            <td className="px-3 py-1.5 text-[11.5px] text-[var(--ink-2)]">{r.surface}</td>
            <td className="px-3 py-1.5 ba-mono text-[12.5px] text-[var(--clay)] font-bold">#{r.avg_opp_rank}</td>
            <td className="px-3 py-1.5 ba-mono text-[12px]">{r.matches_won}</td>
            <td className="px-3 py-1.5 ba-mono text-[11.5px]">#{r.best_opp_beaten}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
