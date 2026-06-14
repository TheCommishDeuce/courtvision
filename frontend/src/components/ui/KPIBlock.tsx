import type { ReactNode } from 'react';

type Variant = 'hero' | 'clay' | 'muted' | 'plain';

type Props = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  variant?: Variant;
  className?: string;
  reveal?: boolean;
};

export default function KPIBlock({
  label,
  value,
  sub,
  variant = 'clay',
  className = '',
  reveal = false,
}: Props) {
  // Padding is baked into the CSS classes — no per-page overrides.
  const base =
    variant === 'hero'
      ? 'ba-kpi ba-kpi-hero'
      : variant === 'clay'
      ? 'ba-kpi'
      : variant === 'muted'
      ? 'ba-kpi-muted'
      : 'border-t-2 border-[var(--ink)] pt-3'; // plain: lives on canvas

  const onClay = variant === 'hero' || variant === 'clay';

  const valueClass = variant === 'hero' ? 'ba-stat block' : 'ba-stat-sm block';

  const labelClass = onClay ? 'ba-kicker mb-2 text-[var(--bone)]/90' : 'ba-kicker mb-2';

  const subClass = onClay
    ? 'mt-3 text-sm text-[var(--bone)]/90'
    : 'mt-3 text-sm text-[var(--ink-2)]';

  return (
    <div className={`${base} ${reveal ? 'ba-reveal' : ''} ${className}`}>
      <div className={labelClass}>{label}</div>
      <div className={valueClass}>{value}</div>
      {sub && <div className={subClass}>{sub}</div>}
    </div>
  );
}
