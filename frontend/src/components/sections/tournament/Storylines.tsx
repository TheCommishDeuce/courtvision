import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fmtTime } from '../../../utils';
import SectionHeader from '../../primitives/SectionHeader';
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
      <div className="px-2.5 py-1.5 bg-paper-sunken border-b border-rule-ink">
        <h3 className={`ba-board-title ${accent ? 'text-clay' : ''}`}>{title}</h3>
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
  <Link
    to={`/player?p=${encodeURIComponent(name)}&tour=${tour}`}
    title={name}
    className={`truncate min-w-0 ${cls}`}
  >
    {name}
  </Link>
);

const WINNER_CLASS = 'font-semibold text-ink hover:text-clay-deep';
const LOSER_CLASS = 'text-ink-2 hover:text-clay-deep';

/**
 * Three of these sit in one row, so a name cell has to yield rather than push
 * the figure column out of the panel. The percentage width with `max-w-[1px]`
 * is what lets the cell ellipsise instead of growing.
 */
const NAME_CELL = 'max-w-[1px] w-[38%] overflow-hidden';

/** A name with its rank hung off the end, both on one line. */
const named = (name: string, rank: number | null, tour: string, cls: string) => (
  <span className="flex items-baseline gap-1 min-w-0">
    {playerLink(name, tour, cls)}
    {rank ? <span className="ba-mono ba-agate text-mute shrink-0">#{rank}</span> : null}
  </span>
);

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
      {/* Not "the week's" — this recap is just as often a 1998 draw. */}
      <SectionHeader title="Storylines" kicker="Outliers in this draw" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {hasLongest && (
          <Panel title="Longest matches" headers={['Rnd', 'Winner', 'Beat', 'Time']}>
            {recap.longest_matches.slice(0, 5).map((r, i) => (
              <tr key={i}>
                <td className="ba-mono ba-agate text-mute">{r.round as string}</td>
                <td className={NAME_CELL}>
                  <span className="flex min-w-0">
                    {playerLink(r.winner_name as string, tour, WINNER_CLASS)}
                  </span>
                </td>
                <td className={NAME_CELL}>
                  <span className="flex min-w-0">
                    {playerLink(r.loser_name as string, tour, LOSER_CLASS)}
                  </span>
                </td>
                <td className="num font-semibold text-clay whitespace-nowrap">
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
                <td className="ba-mono ba-agate text-mute">{r.round as string}</td>
                <td className={NAME_CELL}>
                  {named(r.winner_name as string, (r.winner_rank as number) ?? null, tour, WINNER_CLASS)}
                </td>
                <td className={NAME_CELL}>
                  {named(r.loser_name as string, (r.loser_rank as number) ?? null, tour, LOSER_CLASS)}
                </td>
                <td className="num font-bold text-clay">
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
                <td className={`${NAME_CELL} w-[46%]`}>
                  <span className="flex min-w-0">{playerLink(r.player_name, tour, WINNER_CLASS)}</span>
                </td>
                <td className="num text-mute">{r.matches_played}</td>
                <td className="num font-bold text-clay whitespace-nowrap">#{r.avg_opp_rank}</td>
                <td className="num text-ink-2 whitespace-nowrap">#{r.best_opp_rank}</td>
              </tr>
            ))}
          </Panel>
        )}
      </div>
    </section>
  );
}
