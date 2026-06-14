import type { ReactNode } from 'react';

type Props = {
  /** Section title — rendered in the canonical .ba-h2 face. */
  title: ReactNode;
  /** Optional mono kicker shown to the right (e.g. "Six ways in"). */
  kicker?: ReactNode;
  /** Optional action node shown to the right (link/button); overrides kicker if both given. */
  action?: ReactNode;
  /** Heading level for semantics (default h2). */
  as?: 'h2' | 'h3';
  className?: string;
};

/**
 * Canonical section header: hairline rule + consistent rhythm (pb-3 mb-6).
 * Use everywhere instead of hand-rolled `flex … border-b-2 … pb-2 mb-N` blocks.
 */
export default function SectionHeader({ title, kicker, action, as = 'h2', className = '' }: Props) {
  const Heading = as;
  const right = action ?? (kicker ? <span className="ba-kicker">{kicker}</span> : null);

  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-[var(--rule)] pb-3 mb-6 ${className}`}
    >
      <Heading className={as === 'h3' ? 'ba-h3' : 'ba-h2'}>{title}</Heading>
      {right}
    </div>
  );
}
