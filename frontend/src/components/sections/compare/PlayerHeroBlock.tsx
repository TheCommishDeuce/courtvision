import { Link } from 'react-router-dom';

/**
 * The two players keep one identity for the whole page: A is clay-filled,
 * B is white under an ink rule. Every chart, table and legend below follows
 * the same pairing, so you never have to re-learn which is which.
 */
export default function PlayerHeroBlock({
  name,
  tour,
  winPct,
  record,
  peakRank,
  titles,
  variant,
}: {
  name: string;
  tour: string;
  winPct: string;
  record: string;
  peakRank: number | null;
  titles: number;
  variant: 'clay' | 'ink';
}) {
  const isClay = variant === 'clay';
  const label = isClay ? 'text-[var(--on-clay-soft)]' : 'text-[var(--mute)]';
  const value = isClay ? 'text-[var(--on-clay)]' : 'text-[var(--ink)]';
  const rule = isClay ? 'border-[var(--on-clay)]/30' : 'border-[var(--rule)]';

  const rows = [
    { k: 'Record', v: record },
    { k: 'Peak rank', v: peakRank ? `#${peakRank}` : '—' },
    { k: 'Titles', v: String(titles) },
  ];

  return (
    <div
      className={
        isClay
          ? 'ba-kpi px-4 py-3.5 flex flex-col gap-2'
          : 'bg-[var(--paper-raised)] border border-[var(--rule)] border-t-2 border-t-[var(--ink)] px-4 py-3.5 flex flex-col gap-2'
      }
    >
      <div className={`ba-label ${label}`}>{isClay ? 'Player A' : 'Player B'}</div>

      <Link
        to={`/player?p=${encodeURIComponent(name)}&tour=${tour}`}
        className={`ba-h3 ${value} hover:underline`}
      >
        {name}
      </Link>

      <div className={`flex items-baseline justify-between pt-2 border-t ${rule}`}>
        <span className={`ba-label ${label}`}>Win rate</span>
        <span className={`ba-stat-sm ${value}`}>
          {winPct}
          <span className="text-[0.6em] ml-0.5">%</span>
        </span>
      </div>

      {rows.map(r => (
        <div key={r.k} className="flex items-baseline justify-between">
          <span className={`ba-label ${label}`}>{r.k}</span>
          <span className={`ba-mono text-[13px] font-medium ${value}`}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}
