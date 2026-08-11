import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fmtTime } from '../../../utils';
import SectionHeader from '../../ui/SectionHeader';
import type { DrawStrengthRow, TournamentRecap } from '../../../types/tennis';

/** A small headed table. Three of these sit side by side. */
function Panel({
  title,
  headers,
  children,
  accent = false,
}: {
  title: string;
  headers: string[];
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="ba-card p-0 overflow-hidden">
      <div className="px-2.5 py-1.5 bg-[var(--paper-sunken)] border-b border-[var(--ink)]">
        <h3 className={`ba-board-title ${accent ? 'text-[var(--clay)]' : ''}`}>{title}</h3>
      </div>
      <div className="ba-scroller">
        <table className="ba-table ba-table-agate w-full">
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} scope="col" className={h === 'Δ' || h.endsWith('.') || h === 'M' || h === 'Best' || h === 'Time' ? 'num' : ''}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const playerLink = (name: string, tour: string, cls: string) => (
  <Link to={`/player?p=${encodeURIComponent(name)}&tour=${tour}`} className={cls}>
    {name}
  </Link>
);

const WINNER_CLASS = 'font-semibold text-[var(--ink)] hover:text-[var(--clay-deep)]';
const LOSER_CLASS = 'text-[var(--ink-2)] hover:text-[var(--clay-deep)]';

export default function Storylines({
  recap,
  drawStrength,
  tour,
}: {
  recap: TournamentRecap;
  drawStrength?: DrawStrengthRow[];
  tour: string;
}) {
  const hasLongest = recap.longest_matches.length > 0;
  const hasUpsets = recap.biggest_upsets.length > 0;
  const draws = drawStrength ?? [];
  const hasDraws = draws.length > 0;

  if (!hasLongest && !hasUpsets && !hasDraws) return null;

  return (
    <section>
      <SectionHeader title="Storylines" kicker="The week's outliers" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {hasLongest && (
          <Panel title="Longest matches" headers={['Rnd', 'Winner', 'Beat', 'Time']}>
            {recap.longest_matches.slice(0, 5).map((r, i) => (
              <tr key={i}>
                <td className="ba-mono text-[10px] text-[var(--mute)]">{r.round as string}</td>
                <td className="text-[11.5px]">{playerLink(r.winner_name as string, tour, WINNER_CLASS)}</td>
                <td className="text-[11.5px]">{playerLink(r.loser_name as string, tour, LOSER_CLASS)}</td>
                <td className="num font-semibold text-[var(--clay)] whitespace-nowrap">
                  {fmtTime(r.time as number)}
                </td>
              </tr>
            ))}
          </Panel>
        )}

        {hasUpsets && (
          <Panel title="Biggest upsets" headers={['Rnd', 'Winner', 'Beat', 'Δ']} accent>
            {recap.biggest_upsets.slice(0, 5).map((r, i) => (
              <tr key={i}>
                <td className="ba-mono text-[10px] text-[var(--mute)]">{r.round as string}</td>
                <td className="text-[11.5px] whitespace-nowrap">
                  {playerLink(r.winner_name as string, tour, WINNER_CLASS)}
                  {r.winner_rank ? (
                    <span className="ba-mono text-[9.5px] text-[var(--mute)] ml-1">#{r.winner_rank as number}</span>
                  ) : null}
                </td>
                <td className="text-[11.5px] whitespace-nowrap">
                  {playerLink(r.loser_name as string, tour, LOSER_CLASS)}
                  {r.loser_rank ? (
                    <span className="ba-mono text-[9.5px] text-[var(--mute)] ml-1">#{r.loser_rank as number}</span>
                  ) : null}
                </td>
                <td className="num font-bold text-[var(--clay)]">
                  {r.rank_diff ? Math.round(r.rank_diff as number) : '—'}
                </td>
              </tr>
            ))}
          </Panel>
        )}

        {hasDraws && (
          <Panel title="Toughest draws" headers={['Player', 'M', 'Avg opp.', 'Best']}>
            {draws.slice(0, 5).map((r, i) => (
              <tr key={i}>
                <td className="text-[11.5px]">{playerLink(r.player_name, tour, WINNER_CLASS)}</td>
                <td className="num text-[var(--mute)]">{r.matches_played}</td>
                <td className="num font-bold text-[var(--clay)] whitespace-nowrap">#{r.avg_opp_rank}</td>
                <td className="num text-[var(--ink-2)] whitespace-nowrap">#{r.best_opp_rank}</td>
              </tr>
            ))}
          </Panel>
        )}
      </div>
    </section>
  );
}
