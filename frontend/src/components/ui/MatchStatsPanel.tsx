import { matchStatRows, hasStats, type SideStats } from '../../lib/matchStats';

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
      <div className="bg-[var(--bone-3)] px-4 py-5 text-center text-[13px] text-[var(--mute)]">
        No point-level stats recorded for this match.
      </div>
    );
  }
  return (
    <div className="bg-[var(--bone-3)] px-4 py-5">
      <table className="w-full max-w-md mx-auto ba-mono">
        <thead>
          <tr className="border-b border-[var(--ink)]">
            <th className="text-right px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--clay)' }}>{aLabel}</th>
            <th className="px-2" />
            <th className="text-left px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink)]">{bLabel}</th>
          </tr>
        </thead>
        <tbody>
          {matchStatRows(a, b).map(r => (
            <tr key={r.label}>
              <td className="text-right px-2 py-1 text-[14px] text-[var(--ink)]">{r.va}</td>
              <td className="text-center px-2 py-1 text-[10.5px] uppercase tracking-[0.1em] text-[var(--mute)]">{r.label}</td>
              <td className="text-left px-2 py-1 text-[14px] text-[var(--ink)]">{r.vb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
