import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { lastName } from '../../../utils';
import { groupMatchesByTournament } from '../../../domain/playerMatches';
import AdaptiveTable, { type Column } from '../../primitives/AdaptiveTable';
import MatchStatsPanel, { type SideStats } from '../../primitives/MatchStatsPanel';
import SurfaceTag from '../../primitives/SurfaceTag';
import SectionHeader from '../../primitives/SectionHeader';
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
          className={`ba-mono font-bold ${m.result === 'W' ? 'text-clay' : 'text-ink-2'}`}
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
        <span className="ba-mono ba-meta text-mute whitespace-nowrap">
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
          className="font-medium whitespace-nowrap text-ink hover:text-clay-deep"
        >
          {m.opponent_name}
        </Link>
      ),
    },
    {
      key: 'opponent_rank',
      header: 'Opp rank',
      num: true,
      cell: m => <span className="text-mute">{m.opponent_rank ?? '—'}</span>,
    },
    { key: 'surface', header: 'Surf', cell: m => <SurfaceTag surface={m.surface} /> },
    {
      key: 'level_name',
      header: 'Level',
      hideOnCard: true,
      cell: m => <span className="ba-meta text-ink-2">{m.level_name}</span>,
    },
    {
      key: 'round',
      header: 'Rnd',
      cell: m => <span className="ba-mono ba-meta text-ink-2">{m.round}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      cell: m => <span className="ba-mono ba-meta whitespace-nowrap">{m.score}</span>,
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
      <div className="overflow-hidden rounded-[var(--r-md)] border border-rule bg-paper-raised divide-y divide-[var(--rule)]">
        {groups.map(group => {
          const isOpen = openKey === group.key;
          const panelId = `run-${group.key.replace(/[^a-zA-Z0-9]+/g, '-')}`;
          const count = group.matches.length;
          return (
            <div key={group.key}>
              {/* The whole row opens the run — reaching for a control on the
                  far right to expand the row you are already pointing at is a
                  trip for nothing. The event name is the one exception: it
                  stops the click and goes to that event's own page. */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenKey(isOpen ? null : group.key)}
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                  // Only the row itself — Enter on the nested link navigates.
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenKey(isOpen ? null : group.key);
                  }
                }}
                className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-2.5 py-1.5
                            cursor-pointer transition-colors ${
                              isOpen ? 'bg-clay-wash' : 'hover:bg-clay-wash'
                            }`}
              >
                <span aria-hidden="true" className="ba-mono ba-agate text-mute">
                  {isOpen ? '▾' : '▸'}
                </span>
                <Link
                  to={`/tournament?t=${encodeURIComponent(group.tournament)}&year=${group.year}&tour=${tour}`}
                  onClick={e => e.stopPropagation()}
                  className="ba-touch ba-link-quiet ba-cell font-semibold"
                >
                  {group.tournament}
                </Link>
                <span className="ba-mono ba-meta text-mute">{group.year}</span>
                <span className="ba-mono ba-meta font-bold text-clay">
                  {group.result}
                </span>
                {/* The week drops on a phone: it repeats in the open run, and
                    keeping it wraps every long event name onto two lines. */}
                <span className="ba-mono ba-meta text-mute ml-auto hidden sm:inline">
                  {group.week}
                </span>
                <span className="ba-mono ba-meta text-mute ml-auto sm:ml-0">
                  {count} {count === 1 ? 'match' : 'matches'}
                </span>
              </div>

              {isOpen && (
                <div id={panelId} className="px-2.5 pb-2.5 pt-1 bg-paper-sunken">
                  <TournamentMatches matches={group.matches} tour={tour} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="ba-kicker mt-1.5">
        The row opens this run; the event name opens that tournament. Accent tick marks a win.
      </p>
    </section>
  );
}
