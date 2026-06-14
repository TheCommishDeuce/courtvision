import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { lastName } from '../../../utils';
import { groupMatchesByTournament } from '../../../lib/playerMatches';
import MatchStatsPanel, { type SideStats } from '../../ui/MatchStatsPanel';
import SurfaceTag from '../../ui/SurfaceTag';
import SectionHeader from '../../ui/SectionHeader';
import type { PlayerMatchRow } from '../../../types/tennis';

function focalSide(m: PlayerMatchRow): SideStats {
  return { aces: m.aces, dfs: m.dfs, pts: m.pts, firsts: m.firsts,
           fwon: m.fwon, swon: m.swon, saved: m.bp_saved, chances: m.bp_chances };
}
function oppSide(m: PlayerMatchRow): SideStats {
  return { aces: m.o_aces, dfs: m.o_dfs, pts: m.o_pts, firsts: m.o_firsts,
           fwon: m.o_fwon, swon: m.o_swon, saved: m.o_saved, chances: m.o_chances };
}

export function RecentMatchesSection({ recentMatches, tour }: { recentMatches: PlayerMatchRow[]; tour: string }) {
  const [expandedTournamentKey, setExpandedTournamentKey] = useState<string | null>(null);
  const [openMatchKey, setOpenMatchKey] = useState<string | null>(null);
  const recentByTournament = useMemo(() => groupMatchesByTournament(recentMatches), [recentMatches]);

  if (recentByTournament.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Recent Matches" kicker={`Last 52 weeks · ${recentByTournament.length} tournament${recentByTournament.length !== 1 ? 's' : ''}`} />
      <div className="ba-card p-0 overflow-x-auto">
        <table className="ba-table min-w-full">
          <thead><tr>{['Tournament', 'Year', 'Result', 'Week', 'Open'].map(h => <th key={h} className="px-3">{h}</th>)}</tr></thead>
          {recentByTournament.map(group => {
            const isOpen = expandedTournamentKey === group.key;
            return (
              <tbody key={group.key}>
                <tr className="cursor-pointer hover:bg-[var(--bone-3)]" onClick={() => setExpandedTournamentKey(isOpen ? null : group.key)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedTournamentKey(isOpen ? null : group.key); } }} role="button" tabIndex={0} aria-expanded={isOpen}>
                  <td className="px-3"><Link to={`/tournament?t=${encodeURIComponent(group.tournament)}&year=${group.year}&tour=${tour}`} className="ba-link font-medium" onClick={e => e.stopPropagation()}>{group.tournament}</Link></td>
                  <td className="px-3 ba-mono text-[12px] text-[var(--ink-2)]">{group.year}</td>
                  <td className="px-3 ba-mono text-[12px] text-[var(--ink-2)]">{group.result}</td>
                  <td className="px-3 ba-mono text-[12px] text-[var(--mute)]">{group.week}</td>
                  <td className="px-3 ba-mono text-[11px] text-[var(--clay)]">{isOpen ? 'Hide' : 'Show'} ↓</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 bg-[var(--bone-3)]">
                      <table className="w-full">
                        <thead><tr>{['Date', 'W/L', 'Opponent', 'OR', 'Surface', 'Level', 'Round', 'Score'].map(h => <th key={h} className="px-2 py-1 text-left ba-mono text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--ink-2)]">{h}</th>)}</tr></thead>
                        <tbody>
                          {group.matches.map((m: PlayerMatchRow, i) => {
                            const isWin = m.result === 'W';
                            const edgeColor = isWin ? 'var(--clay)' : 'var(--ink-2)';
                            const mKey = `${group.key}-${i}`;
                            const mOpen = openMatchKey === mKey;
                            return (
                              <Fragment key={mKey}>
                                <tr
                                  className="border-b border-[var(--rule)] last:border-b-0 cursor-pointer hover:bg-[var(--bone-2)]"
                                  onClick={() => setOpenMatchKey(mOpen ? null : mKey)}
                                  aria-expanded={mOpen}
                                >
                                  <td className="px-2 py-1.5 ba-mono text-[12px] text-[var(--mute)]" style={{ borderLeft: `3px solid ${edgeColor}` }}>
                                    <span className="mr-1">{mOpen ? '▾' : '▸'}</span>{m.date?.slice(0, 10)}
                                  </td>
                                  <td className="px-2 py-1.5 ba-mono font-bold text-center" style={{ color: edgeColor, width: 28 }}>{m.result}</td>
                                  <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}><Link to={`/player?p=${encodeURIComponent(m.opponent_name)}&tour=${tour}`} className="ba-link font-medium">{m.opponent_name}</Link></td>
                                  <td className="px-2 py-1.5 ba-mono text-[12px] text-[var(--mute)]">{m.opponent_rank ?? '—'}</td>
                                  <td className="px-2 py-1.5"><SurfaceTag surface={m.surface} /></td>
                                  <td className="px-2 py-1.5 text-[13px] text-[var(--ink-2)]">{m.level_name}</td>
                                  <td className="px-2 py-1.5 ba-mono text-[12px] text-[var(--ink-2)]">{m.round}</td>
                                  <td className="px-2 py-1.5 ba-mono text-[13px]">{m.score}</td>
                                </tr>
                                {mOpen && (
                                  <tr>
                                    <td colSpan={8} className="p-0">
                                      <MatchStatsPanel
                                        a={focalSide(m)} b={oppSide(m)}
                                        aLabel={lastName(m.player_name)}
                                        bLabel={lastName(m.opponent_name)}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}
