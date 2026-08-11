import StatBoard from '../../ui/StatBoard';
import type { TournamentStatsLeader } from '../../../types/tennis';

/** A tournament stat leaderboard — the same results column used on Records. */
export default function StatsLeaderTable({
  title,
  rows,
  valueKey,
  unit = '',
  tour,
}: {
  title: string;
  rows: TournamentStatsLeader[];
  valueKey: string;
  unit?: string;
  tour: string;
}) {
  if (!rows.length) return null;

  return (
    <StatBoard
      title={title}
      rowCount={5}
      rows={rows.slice(0, 5).map(r => {
        const raw = r[valueKey];
        return {
          name: r.player,
          value: typeof raw === 'number' ? `${unit === '%' ? raw.toFixed(1) : raw}${unit}` : '—',
          to: `/player?p=${encodeURIComponent(r.player)}&tour=${tour}`,
        };
      })}
    />
  );
}
