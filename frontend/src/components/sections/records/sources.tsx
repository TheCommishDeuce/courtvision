import { Link } from 'react-router-dom';
import {
  useLeadersActivityCombined,
  useLeadersServe,
  useLeadersReturn,
  useLeadersStreaks,
  useLeadersDrawStrength,
} from '../../../hooks';
import type { Column } from '../../tables/AdaptiveTable';
import SortHeader, { type SortState } from '../../tables/SortHeader';
import { MIN_MATCHES, formatFigure, type SourceId } from './config';

export type { SortState };

/**
 * Rows from the five leaderboard endpoints have different shapes but always
 * carry a player and a tour, so the Records page treats them uniformly and
 * reads the varying columns by key.
 */
export type RecordRow = Record<string, unknown> & { player_name: string; tour: string };

export interface RecordsFilters {
  tour: string;
  surface: string;
  level: string;
  yearRange: [number, number];
}

export interface SourceState {
  rows: RecordRow[];
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

const num = (r: RecordRow, key: string): number | null => {
  const v = r[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
const str = (r: RecordRow, key: string): string => {
  const v = r[key];
  return v == null ? '—' : String(v);
};

/** Fetches all five sources under one set of filters. Five requests per tab. */
export function useRecordSources(f: RecordsFilters): Record<SourceId, SourceState> {
  const shared = {
    tour: f.tour,
    surface: f.surface === 'All' ? undefined : f.surface,
    level: f.level || undefined,
    year_min: f.yearRange[0],
    year_max: f.yearRange[1],
  };

  const activity = useLeadersActivityCombined({ ...shared, min_matches: MIN_MATCHES.activity });
  // Serve and return are rate leaderboards drawn from player_match_view, which
  // includes the opponents of scraped players — so the API's 10-match default
  // lets a three-match career top an all-time percentage board. Ask for a real
  // sample instead; the board footers state the threshold.
  const serve = useLeadersServe({ ...shared, min_matches: MIN_MATCHES.rate });
  const ret = useLeadersReturn({ ...shared, min_matches: MIN_MATCHES.rate });
  const streaks = useLeadersStreaks(shared);
  const draw = useLeadersDrawStrength(shared);

  const wrap = (q: {
    data?: unknown;
    isFetching: boolean;
    isError: boolean;
    refetch: () => unknown;
  }): SourceState => ({
    rows: (q.data ?? []) as RecordRow[],
    isFetching: q.isFetching,
    isError: q.isError,
    refetch: () => void q.refetch(),
  });

  return {
    activity: wrap(activity),
    serve: wrap(serve),
    return: wrap(ret),
    streaks: wrap(streaks),
    draw: wrap(draw),
  };
}

// ── Full-table columns ───────────────────────────────────────────────────────

interface ColSpec {
  key: string;
  label: string;
  fmt?: 'count' | 'pct' | 'rank' | 'date' | 'text';
  /** Keep off the stacked mobile card. */
  hideOnCard?: boolean;
}

const rankColumn = (): Column<RecordRow> => ({
  key: '__rank',
  header: '#',
  hideOnCard: true,
  cell: (_r, i) => <span className="ba-mono text-[10.5px] text-[var(--mute)]">{i + 1}</span>,
});

const playerColumn = (): Column<RecordRow> => ({
  key: 'player_name',
  header: 'Player',
  hideOnCard: true,
  cell: r => (
    <Link
      to={`/player?p=${encodeURIComponent(r.player_name)}&tour=${r.tour}`}
      className="font-semibold whitespace-nowrap text-[var(--ink)] hover:text-[var(--clay-deep)]"
    >
      {r.player_name}
    </Link>
  ),
});

function specToColumn(spec: ColSpec, sort: SortState, highlight: string): Column<RecordRow> {
  const isMetric = spec.fmt !== 'text' && spec.fmt !== 'date';
  return {
    key: spec.key,
    header: <SortHeader label={spec.label} colKey={spec.key} sort={sort} />,
    cardLabel: spec.label,
    num: isMetric,
    hideOnCard: spec.hideOnCard,
    accentHeader: spec.key === highlight,
    cell: r => {
      if (spec.fmt === 'date') {
        const v = r[spec.key];
        return (
          <span className="ba-mono text-[11px] text-[var(--ink-2)]">
            {v ? String(v).slice(0, 10) : 'Active'}
          </span>
        );
      }
      if (spec.fmt === 'text') return <span className="text-[12px]">{str(r, spec.key)}</span>;
      const text = formatFigure(num(r, spec.key), spec.fmt ?? 'count');
      const lead = spec.key === sort.sortKey;
      return (
        <span className={lead ? 'font-bold text-[var(--clay)]' : 'text-[var(--ink-2)]'}>{text}</span>
      );
    },
  };
}

const SPECS: Record<SourceId, ColSpec[]> = {
  activity: [
    { key: 'matches', label: 'M' },
    { key: 'wins', label: 'W' },
    { key: 'win_pct', label: 'Win %', fmt: 'pct' },
    { key: 'titles', label: 'Titles' },
    { key: 'finals', label: 'Finals' },
    { key: 'tb_won', label: 'TB won' },
    { key: 'tb_played', label: 'TB played' },
    { key: 'upset_wins', label: 'Upsets' },
    { key: 'comebacks', label: 'Comebacks' },
    { key: 'bagels_given', label: 'Bagels for' },
    { key: 'bagels_received', label: 'Bagels against' },
    { key: 'breadsticks_given', label: 'Breadsticks for' },
    { key: 'breadsticks_received', label: 'Breadsticks against' },
  ],
  serve: [
    { key: 'n_matches', label: 'Matches' },
    { key: 'total_aces', label: 'Aces' },
    { key: 'ace_pct', label: 'Ace %', fmt: 'pct' },
    { key: 'first_in_pct', label: '1st in %', fmt: 'pct' },
    { key: 'first_win_pct', label: '1st won %', fmt: 'pct' },
    { key: 'second_win_pct', label: '2nd won %', fmt: 'pct' },
    { key: 'bp_saved_pct', label: 'BP saved %', fmt: 'pct' },
  ],
  return: [
    { key: 'n_matches', label: 'Matches' },
    { key: 'first_return_win_pct', label: '1st return won %', fmt: 'pct' },
    { key: 'second_return_win_pct', label: '2nd return won %', fmt: 'pct' },
    { key: 'bp_converted_pct', label: 'BP converted %', fmt: 'pct' },
  ],
  streaks: [
    { key: 'streak_length', label: 'Streak' },
    { key: 'surface', label: 'Surface', fmt: 'text' },
    { key: 'start_date', label: 'Start', fmt: 'date' },
    { key: 'end_date', label: 'End', fmt: 'date' },
  ],
  draw: [
    { key: 'tournament', label: 'Tournament', fmt: 'text' },
    { key: 'year', label: 'Year' },
    { key: 'surface', label: 'Surface', fmt: 'text' },
    { key: 'avg_opp_rank', label: 'Avg opp', fmt: 'rank' },
    { key: 'matches_won', label: 'Wins' },
    { key: 'best_opp_beaten', label: 'Best beaten', fmt: 'rank' },
  ],
};

/** Columns for a source's full table, with `highlight` accented in the head. */
export function columnsFor(
  source: SourceId,
  sort: SortState,
  highlight: string,
): Column<RecordRow>[] {
  return [
    rankColumn(),
    playerColumn(),
    ...SPECS[source].map(s => specToColumn(s, sort, highlight)),
  ];
}

/** Every column a source exposes, for the "sorted by" line on the focused view. */
export const labelForKey = (source: SourceId, key: string): string =>
  SPECS[source].find(s => s.key === key)?.label ?? key;
