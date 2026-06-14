import { Link } from 'react-router-dom';
import type { TournamentStatsLeader } from '../../../types/tennis';

export default function StatsLeaderTable({ title, rows, valueKey, unit = '', tour }: {
  title: string;
  rows: TournamentStatsLeader[];
  valueKey: string;
  unit?: string;
  tour: string;
}) {
  if (!rows.length) return null;
  const fmt = (v: unknown) => {
    if (typeof v !== 'number') return '—';
    return unit === '%' ? v.toFixed(1) : String(v);
  };
  return (
    <div className="ba-card p-0 overflow-hidden">
      <div className="px-2 py-1.5 bg-[var(--bone-2)] border-b border-[var(--rule)]">
        <h3 className="ba-label leading-tight">{title}</h3>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--rule)] last:border-b-0">
              <td className="px-1.5 py-1 ba-mono text-[9.5px] text-[var(--mute)] w-4 align-top">{i + 1}</td>
              <td className="px-1.5 py-1 text-[10.5px] leading-tight align-top">
                <Link to={`/player?p=${encodeURIComponent(r.player)}&tour=${tour}`} className="ba-link font-medium">{r.player}</Link>
              </td>
              <td className="px-1.5 py-1 text-right font-bold text-[var(--clay)] ba-mono text-[10.5px] align-top whitespace-nowrap">
                {fmt(r[valueKey])}{typeof r[valueKey] === 'number' ? unit : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
