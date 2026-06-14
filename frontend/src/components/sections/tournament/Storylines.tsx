import { Link } from 'react-router-dom';
import { fmtTime } from '../../../utils';
import type { DrawStrengthRow, TournamentRecap } from '../../../types/tennis';
import SectionHeader from '../../ui/SectionHeader';

export default function Storylines({ recap, drawStrength, tour }: {
  recap: TournamentRecap;
  drawStrength?: DrawStrengthRow[];
  tour: string;
}) {
  if (!(recap.longest_matches.length > 0 || recap.biggest_upsets.length > 0 || (drawStrength && drawStrength.length > 0))) {
    return null;
  }
  return (
    <section>
      <SectionHeader title="Storylines" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {recap.longest_matches.length > 0 && (
          <div className="ba-card p-0 overflow-hidden">
            <div className="px-2 py-1.5 bg-[var(--bone-2)] border-b border-[var(--rule)]">
              <h3 className="ba-label">Longest Matches</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--rule)]">
                  {['Rnd', 'Winner', 'Loser', 'Time', 'Score'].map(h => (
                    <th key={h} className="px-1.5 py-1 text-left ba-mono text-[9px] font-bold tracking-[0.08em] uppercase text-[var(--ink)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recap.longest_matches.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-[var(--rule)] last:border-b-0">
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] text-[var(--mute)] align-top">{r.round as string}</td>
                    <td className="px-1.5 py-1 text-[10.5px] leading-tight align-top">
                      <Link to={`/player?p=${encodeURIComponent(r.winner_name as string)}&tour=${tour}`} className="ba-link font-medium">{r.winner_name as string}</Link>
                    </td>
                    <td className="px-1.5 py-1 text-[10.5px] leading-tight text-[var(--ink-2)] align-top">
                      <Link to={`/player?p=${encodeURIComponent(r.loser_name as string)}&tour=${tour}`} className="hover:underline">{r.loser_name as string}</Link>
                    </td>
                    <td className="px-1.5 py-1 ba-mono text-[10px] whitespace-nowrap align-top">{fmtTime(r.time as number)}</td>
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] leading-tight text-[var(--ink-2)] align-top">{r.score as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recap.biggest_upsets.length > 0 && (
          <div className="ba-card p-0 overflow-hidden">
            <div className="px-2 py-1.5 bg-[var(--bone-2)] border-b border-[var(--rule)]">
              <h3 className="ba-label text-[var(--clay)]">Biggest Upsets</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--rule)]">
                  {['Rnd', 'Winner', 'WR', 'Loser', 'LR', 'Δ'].map(h => (
                    <th key={h} className="px-1.5 py-1 text-left ba-mono text-[9px] font-bold tracking-[0.08em] uppercase text-[var(--ink)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recap.biggest_upsets.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-[var(--rule)] last:border-b-0">
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] text-[var(--mute)] align-top">{r.round as string}</td>
                    <td className="px-1.5 py-1 text-[10.5px] leading-tight align-top">
                      <Link to={`/player?p=${encodeURIComponent(r.winner_name as string)}&tour=${tour}`} className="text-[var(--clay)] font-semibold hover:underline">{r.winner_name as string}</Link>
                    </td>
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] whitespace-nowrap align-top">{r.winner_rank ? `#${r.winner_rank}` : '—'}</td>
                    <td className="px-1.5 py-1 text-[10.5px] leading-tight text-[var(--ink-2)] align-top">
                      <Link to={`/player?p=${encodeURIComponent(r.loser_name as string)}&tour=${tour}`} className="hover:underline">{r.loser_name as string}</Link>
                    </td>
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] whitespace-nowrap align-top">{r.loser_rank ? `#${r.loser_rank}` : '—'}</td>
                    <td className="px-1.5 py-1 ba-mono text-[10.5px] font-bold text-[var(--clay)] align-top whitespace-nowrap">{r.rank_diff ? Math.round(r.rank_diff as number) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {drawStrength && drawStrength.length > 0 && (
          <div className="ba-card p-0 overflow-hidden">
            <div className="px-2 py-1.5 bg-[var(--bone-2)] border-b border-[var(--rule)]">
              <h3 className="ba-label">Toughest Draws</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--rule)]">
                  {['#', 'Player', 'M', 'Avg', 'Best', 'Worst'].map(h => (
                    <th key={h} className="px-1.5 py-1 text-left ba-mono text-[9px] font-bold tracking-[0.08em] uppercase text-[var(--ink)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drawStrength.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-[var(--rule)] last:border-b-0">
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] text-[var(--mute)] align-top">{i + 1}</td>
                    <td className="px-1.5 py-1 text-[10.5px] leading-tight align-top">
                      <Link to={`/player?p=${encodeURIComponent(r.player_name)}&tour=${tour}`} className="ba-link font-medium">{r.player_name}</Link>
                    </td>
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] align-top">{r.matches_played}</td>
                    <td className="px-1.5 py-1 ba-mono text-[10.5px] text-[var(--clay)] font-bold align-top whitespace-nowrap">#{r.avg_opp_rank}</td>
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] whitespace-nowrap align-top">#{r.best_opp_rank}</td>
                    <td className="px-1.5 py-1 ba-mono text-[9.5px] whitespace-nowrap text-right align-top">#{r.worst_opp_rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
