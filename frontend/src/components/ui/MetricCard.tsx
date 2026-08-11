interface Props {
  label: string;
  value: string | number | null;
  tone?: 'default' | 'pos' | 'neg' | 'accent';
  sub?: string;
}

/** Tone shows in the top rule, not in the figure — figures stay ink. */
const TONE_RULE: Record<NonNullable<Props['tone']>, string> = {
  default: 'var(--ink)',
  pos: 'var(--clay)',
  neg: 'var(--rule-mid)',
  accent: 'var(--clay)',
};

export default function MetricCard({ label, value, tone = 'default', sub }: Props) {
  return (
    <div className="ba-card px-3 py-2.5 text-center" style={{ borderTopColor: TONE_RULE[tone] }}>
      <div className="ba-stat-sm leading-none text-[var(--ink)]">{value ?? '—'}</div>
      <div className="ba-label mt-1.5">{label}</div>
      {sub && <div className="ba-mono text-[9.5px] mt-0.5 text-[var(--mute)]">{sub}</div>}
    </div>
  );
}
