interface Props {
  label: string;
  value: string | number | null;
  tone?: 'default' | 'pos' | 'neg' | 'accent';
  sub?: string;
}

const TONE_MAP: Record<NonNullable<Props['tone']>, { color: string; border: string }> = {
  default: { color: 'var(--ink)', border: 'var(--ink)' },
  pos:     { color: 'var(--primary)', border: 'var(--primary)' },
  neg:     { color: 'var(--secondary)', border: 'var(--secondary)' },
  accent:  { color: 'var(--ink)', border: 'var(--secondary)' },
};

export default function MetricCard({ label, value, tone = 'default', sub }: Props) {
  const t = TONE_MAP[tone];
  return (
    <div className="ba-card p-4 text-center" style={{ borderTopColor: t.border }}>
      <div className="ba-stat-sm leading-none" style={{ color: t.color }}>{value ?? '\u2014'}</div>
      <div className="ba-kicker mt-2">{label}</div>
      {sub && <div className="ba-mono text-[10px] mt-1" style={{ color: 'var(--mute)' }}>{sub}</div>}
    </div>
  );
}
