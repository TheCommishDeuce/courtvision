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

/** Padding is baked into the CSS classes — no per-page overrides. */
const BASE: Record<Variant, string> = {
  hero: 'ba-kpi ba-kpi-hero',
  clay: 'ba-kpi',
  muted: 'ba-kpi-muted',
  plain: 'border-l-2 border-clay pl-[var(--space-sm)]', // sits directly on the page
};

export default function KPIBlock({
  label,
  value,
  sub,
  variant = 'clay',
  className = '',
  reveal = false,
}: Props) {
  const onClay = variant === 'hero' || variant === 'clay';

  return (
    <div className={`${BASE[variant]} ${reveal ? 'ba-reveal' : ''} ${className}`}>
      <div className={`ba-kicker mb-1.5 ${onClay ? 'text-on-clay-soft' : ''}`}>{label}</div>
      <div className={variant === 'hero' ? 'ba-stat block text-spark' : 'ba-stat-sm block'}>
        {value}
      </div>
      {sub && (
        <div className={`mt-2 ba-cell ${onClay ? 'text-on-clay' : 'text-ink-2'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
