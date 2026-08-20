import { matchStatRows, hasStats, type SideStats } from '../../domain/matchStats';

export type { SideStats };

interface Props {
  a: SideStats;
  b: SideStats;
  aLabel: string;
  bLabel: string;
}

// Self-contained: owns its background, padding, and explicit type sizes so it
// renders identically wherever a match row expands (no inherited size drift).
export default function MatchStatsPanel({ a, b, aLabel, bLabel }: Props) {
  if (!hasStats(a) && !hasStats(b)) {
    return (
      <div className="bg-paper-sunken px-3 py-4 text-center ba-kicker">
        No point-level stats recorded for this match.
      </div>
    );
  }
  return (
    <div className="bg-paper-sunken px-3 py-3.5">
      <table className="w-full max-w-md mx-auto ba-mono">
        <thead>
          <tr className="border-b border-rule-ink">
            <th className="text-right px-2 pb-1 ba-agate font-bold uppercase tracking-[0.1em] text-clay">{aLabel}</th>
            <th className="px-2" />
            <th className="text-left px-2 pb-1 ba-agate font-bold uppercase tracking-[0.1em] text-ink">{bLabel}</th>
          </tr>
        </thead>
        <tbody>
          {matchStatRows(a, b).map(r => (
            <tr key={r.label}>
              <td className="text-right px-2 py-0.5 ba-cell font-medium text-ink">{r.va}</td>
              <td className="text-center px-2 py-0.5 ba-agate uppercase tracking-[0.1em] text-mute">{r.label}</td>
              <td className="text-left px-2 py-0.5 ba-cell font-medium text-ink">{r.vb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
