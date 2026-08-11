import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { lastName } from '../../../utils';
import { groupMatchesByTournament } from '../../../lib/playerMatches';
import AdaptiveTable, { type Column } from '../../tables/AdaptiveTable';
import MatchStatsPanel, { type SideStats } from '../../ui/MatchStatsPanel';
import SurfaceTag from '../../ui/SurfaceTag';
import SectionHeader from '../../ui/SectionHeader';
import type { PlayerMatchRow } from '../../../types/tennis';

function focalSide(m: PlayerMatchRow): SideStats {
  return {
    aces: m.aces, dfs: m.dfs, pts: m.pts, firsts: m.firsts,
    fwon: m.fwon, swon: m.swon, saved: m.bp_saved, chances: m.bp_chances,
  };
}
function oppSide(m: PlayerMatchRow): SideStats {
  return {
    aces: m.o_aces, dfs: m.o_dfs, pts: m.o_pts, firsts: m.o_firsts,
    fwon: m.o_fwon, swon: m.o_swon, saved: m.o_saved, chances: m.o_chances,
  };
}

/** Matches inside one tournament run, newest first, expandable to point stats. */
function TournamentMatches({ matches, tour }: { matches: PlayerMatchRow[]; tour: string }) {
  const columns: Column<PlayerMatchRow>[] = [
    {
      key: 'result',
      header: 'W/L',
      cell: m => (
        <span
          className={`ba-mono font-bold ${m.result === 'W' ? 'text-[var(--clay)]' : 'text-[var(--ink-2)]'}`}
        >
          {m.result}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideOnCard: true,
      cell: m => (
        <span className="ba-mono text-[11px] text-[var(--mute)] whitespace-nowrap">
          {m.date?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'opponent_name',
      header: 'Opponent',
      hideOnCard: true,
      cell: m => (
        <Link
          to={`/player?p=${encodeURIComponent(m.opponent_name)}&tour=${tour}`}
          className="font-medium whitespace-nowrap text-[var(--ink)] hover:text-[var(--clay-deep)]"
        >
          {m.opponent_name}
        </Link>
      ),
    },
    {
      key: 'opponent_rank',
      header: 'Opp rank',
      num: true,
      cell: m => <span className="text-[var(--mute)]">{m.opponent_rank ?? '—'}</span>,
    },
    { key: 'surface', header: 'Surf', cell: m => <SurfaceTag surface={m.surface} /> },
    {
      key: 'level_name',
      header: 'Level',
      hideOnCard: true,
      cell: m => <span className="text-[12px] text-[var(--ink-2)]">{m.level_name}</span>,
    },
    {
      key: 'round',
      header: 'Rnd',
      cell: m => <span className="ba-mono text-[11px] text-[var(--ink-2)]">{m.round}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      cell: m => <span className="ba-mono text-[11px] whitespace-nowrap">{m.score}</span>,
    },
  ];

  return (
    <AdaptiveTable
      rows={matches}
      columns={columns}
      rowKey={(m, i) => `${m.date}-${i}`}
      density="agate"
      pinFirst={false}
      flag={m => m.result === 'W'}
      cardTitle={m => `${m.result === 'W' ? 'Beat' : 'Lost to'} ${m.opponent_name}`}
      cardMeta={m => `${m.date?.slice(0, 10)} · ${m.round} · ${m.score}`}
      expand={m => (
        <MatchStatsPanel
          a={focalSide(m)}
          b={oppSide(m)}
          aLabel={lastName(m.player_name)}
          bLabel={lastName(m.opponent_name)}
        />
      )}
    />
  );
}

export function RecentMatchesSection({
  recentMatches,
  tour,
}: {
  recentMatches: PlayerMatchRow[];
  tour: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const groups = useMemo(() => groupMatchesByTournament(recentMatches), [recentMatches]);

  if (groups.length === 0) return null;

  return (
    <section id="recent">
      <SectionHeader
        title="Recent matches"
        kicker={`Last 52 weeks · ${groups.length} tournament${groups.length !== 1 ? 's' : ''}`}
      />

      {/* One row per tournament run, opening to that run's matches. Rendered as
          a list of disclosures rather than nested tables, so it works at any
          width without a table inside a table inside a scroller. */}
      <div className="border border-[var(--rule)] border-t-2 border-t-[var(--ink)] divide-y divide-[var(--rule)]">
        {groups.map(group => {
          const isOpen = openKey === group.key;
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : group.key)}
                aria-expanded={isOpen}
                className={`w-full flex flex-wrap items-baseline gap-x-3 gap-y-1 px-2.5 py-1.5 text-left transition-colors ${
                  isOpen ? 'bg-[var(--clay-wash)]' : 'hover:bg-[var(--paper-sunken)]'
                }`}
              >
                <span className="ba-mono text-[9px] text-[var(--mute)] w-2">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span className="text-[13px] font-semibold text-[var(--ink)]">
                  {group.tournament}
                </span>
                <span className="ba-mono text-[11px] text-[var(--mute)]">{group.year}</span>
                <span className="ba-mono text-[11px] font-bold text-[var(--clay)]">
                  {group.result}
                </span>
                <span className="ba-mono text-[10.5px] text-[var(--mute)] ml-auto">
                  {group.week}
                </span>
              </button>

              {isOpen && (
                <div className="px-2.5 pb-2.5 pt-1 bg-[var(--paper-sunken)]">
                  <TournamentMatches matches={group.matches} tour={tour} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="ba-kicker mt-1.5">
        Open a tournament for its matches, then a match for its point stats. Clay tick marks a win.
      </p>
    </section>
  );
}
