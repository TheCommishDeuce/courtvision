import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import MatchStatsPanel, { type SideStats } from '../../ui/MatchStatsPanel';
import { fmtTime, lastName } from '../../../utils';
import { MAIN_DRAW_ROUND_ORDER, ROUND_LABEL } from '../../../domain/rounds';
import type { TournamentMatchRow, TournamentRoundGroup } from '../../../types/tennis';

const winnerSide = (m: TournamentMatchRow): SideStats => ({
  aces: m.winner_aces ?? null, dfs: m.winner_dfs ?? null, pts: m.winner_pts ?? null, firsts: m.winner_firsts ?? null,
  fwon: m.winner_fwon ?? null, swon: m.winner_swon ?? null, saved: m.winner_saved ?? null, chances: m.winner_chances ?? null,
});
const loserSide = (m: TournamentMatchRow): SideStats => ({
  aces: m.loser_aces ?? null, dfs: m.loser_dfs ?? null, pts: m.loser_pts ?? null, firsts: m.loser_firsts ?? null,
  fwon: m.loser_fwon ?? null, swon: m.loser_swon ?? null, saved: m.loser_saved ?? null, chances: m.loser_chances ?? null,
});

export default function DrawResults({ matchesByRound, tour }: { matchesByRound: TournamentRoundGroup[]; tour: string }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rounds = matchesByRound
    .filter(g => MAIN_DRAW_ROUND_ORDER.includes(g.round))
    .sort((a, b) => MAIN_DRAW_ROUND_ORDER.indexOf(b.round) - MAIN_DRAW_ROUND_ORDER.indexOf(a.round));

  if (!rounds.length) return null;

  return (
    <div>
      {rounds.map(({ round, matches }, ri) => (
        <div key={round} className={ri > 0 ? 'border-t-2 border-[var(--ink)]' : ''}>
          <div className="px-3 py-1.5 bg-[var(--bone-2)] ba-mono text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--clay)]">
            {ROUND_LABEL[round] ?? round}
          </div>
          <table className="w-full">
            <tbody>
              {matches.map((m, i) => {
                const key = `${round}-${i}`;
                const isOpen = openKey === key;
                return (
                  <Fragment key={key}>
                    <tr
                      className={`border-b border-[var(--rule)] last:border-b-0 cursor-pointer ${m.is_upset ? 'bg-[color-mix(in_oklab,var(--clay)_6%,transparent)]' : ''} ${isOpen ? 'bg-[var(--bone-2)]' : 'hover:bg-[var(--bone-2)]'}`}
                      onClick={() => setOpenKey(isOpen ? null : key)}
                      aria-expanded={isOpen}
                    >
                      <td className="px-3 py-1.5 w-[40%] text-[12px]">
                        <span className="text-[var(--mute)] mr-1.5 ba-mono text-[10px]">{isOpen ? '▾' : '▸'}</span>
                        <Link
                          to={`/player?p=${encodeURIComponent(m.winner_name)}&tour=${tour}`}
                          onClick={e => e.stopPropagation()}
                          className={`font-semibold ${m.is_upset ? 'text-[var(--clay)]' : 'text-[var(--ink)]'} hover:underline`}
                        >
                          {m.winner_name}
                        </Link>
                        {m.winner_rank && <span className="ba-mono text-[var(--mute)] text-[10px] ml-1.5">#{m.winner_rank}</span>}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--mute)] text-[10px] ba-mono whitespace-nowrap">def</td>
                      <td className="px-3 py-1.5 w-[40%] text-[12px]">
                        <Link
                          to={`/player?p=${encodeURIComponent(m.loser_name)}&tour=${tour}`}
                          onClick={e => e.stopPropagation()}
                          className="text-[var(--ink-2)] hover:underline"
                        >
                          {m.loser_name}
                        </Link>
                        {m.loser_rank && <span className="ba-mono text-[var(--mute)] text-[10px] ml-1.5">#{m.loser_rank}</span>}
                      </td>
                      <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--ink-2)]">
                        {m.score}{m.time ? <span className="text-[var(--mute)] ml-1.5">· {fmtTime(m.time)}</span> : null}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-[var(--rule)]">
                        <td colSpan={4} className="p-0">
                          <MatchStatsPanel
                            a={winnerSide(m)} b={loserSide(m)}
                            aLabel={lastName(m.winner_name)}
                            bLabel={lastName(m.loser_name)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
