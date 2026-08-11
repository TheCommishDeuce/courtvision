import { Link } from 'react-router-dom';
import AdaptiveTable, { type Column } from '../../tables/AdaptiveTable';
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

function roundColumns(tour: string): Column<TournamentMatchRow>[] {
  return [
    {
      key: 'winner_name',
      header: 'Winner',
      hideOnCard: true,
      cell: m => (
        <span className="whitespace-nowrap">
          <Link
            to={`/player?p=${encodeURIComponent(m.winner_name)}&tour=${tour}`}
            className={`font-semibold hover:underline ${m.is_upset ? 'text-[var(--clay)]' : 'text-[var(--ink)]'}`}
          >
            {m.winner_name}
          </Link>
          {m.winner_rank && (
            <span className="ba-mono text-[10px] text-[var(--mute)] ml-1.5">#{m.winner_rank}</span>
          )}
        </span>
      ),
    },
    {
      key: 'loser_name',
      header: 'Beat',
      hideOnCard: true,
      cell: m => (
        <span className="whitespace-nowrap">
          <Link
            to={`/player?p=${encodeURIComponent(m.loser_name)}&tour=${tour}`}
            className="text-[var(--ink-2)] hover:underline"
          >
            {m.loser_name}
          </Link>
          {m.loser_rank && (
            <span className="ba-mono text-[10px] text-[var(--mute)] ml-1.5">#{m.loser_rank}</span>
          )}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      cell: m => <span className="ba-mono text-[11px] whitespace-nowrap">{m.score}</span>,
    },
    {
      key: 'time',
      header: 'Time',
      num: true,
      cell: m => <span className="text-[var(--mute)]">{m.time ? fmtTime(m.time) : '—'}</span>,
    },
  ];
}

/** The draw, latest round first, each round its own sub-headed block. */
export default function DrawResults({
  matchesByRound,
  tour,
}: {
  matchesByRound: TournamentRoundGroup[];
  tour: string;
}) {
  const rounds = matchesByRound
    .filter(g => MAIN_DRAW_ROUND_ORDER.includes(g.round))
    .sort((a, b) => MAIN_DRAW_ROUND_ORDER.indexOf(b.round) - MAIN_DRAW_ROUND_ORDER.indexOf(a.round));

  if (!rounds.length) return null;

  const columns = roundColumns(tour);

  return (
    <div className="space-y-3">
      {rounds.map(({ round, matches }) => (
        <div key={round}>
          <h3 className="ba-eyebrow border-b border-[var(--ink)] pb-1 mb-1.5">
            {ROUND_LABEL[round] ?? round}
            <span className="text-[var(--mute)] ml-2">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </span>
          </h3>
          <AdaptiveTable
            rows={matches}
            columns={columns}
            rowKey={(_m, i) => `${round}-${i}`}
            density="agate"
            pinFirst={false}
            flag={m => m.is_upset}
            cardTitle={m => `${m.winner_name} beat ${m.loser_name}`}
            cardMeta={m =>
              [
                m.winner_rank ? `#${m.winner_rank}` : null,
                'v',
                m.loser_rank ? `#${m.loser_rank}` : null,
              ]
                .filter(Boolean)
                .join(' ')
            }
            expand={m => (
              <MatchStatsPanel
                a={winnerSide(m)}
                b={loserSide(m)}
                aLabel={lastName(m.winner_name)}
                bLabel={lastName(m.loser_name)}
              />
            )}
          />
        </div>
      ))}
    </div>
  );
}
