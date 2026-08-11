import type { ReactNode } from 'react';

/**
 * Rule weight carries the hierarchy:
 *   page    → double rule (heavy over hairline), once per page
 *   section → single ink rule
 *   sub     → hairline
 */
type Level = 'page' | 'section' | 'sub';

type Props = {
  /** Section title — rendered in the canonical EB Garamond face. */
  title: ReactNode;
  /** Small clay label above the title. */
  eyebrow?: ReactNode;
  /** Mono note shown to the right. */
  kicker?: ReactNode;
  /** Node shown to the right; overrides `kicker` when both are given. */
  action?: ReactNode;
  /** Heading level for semantics. Defaults to h2, or h3 at `sub`. */
  as?: 'h2' | 'h3';
  level?: Level;
  className?: string;
};

const RULE: Record<Level, string> = {
  page: 'ba-double-rule pb-2 mb-5',
  section: 'border-b border-[var(--rule-ink)] pb-1.5 mb-4',
  sub: 'border-b border-[var(--rule)] pb-1.5 mb-3',
};

export default function SectionHeader({
  title,
  eyebrow,
  kicker,
  action,
  as,
  level = 'section',
  className = '',
}: Props) {
  const Heading = as ?? (level === 'sub' ? 'h3' : 'h2');
  const right = action ?? (kicker ? <span className="ba-kicker">{kicker}</span> : null);

  return (
    <div className={`${RULE[level]} ${className}`}>
      {eyebrow && <div className="ba-eyebrow mb-1">{eyebrow}</div>}
      {/* Wraps rather than crushes: on narrow screens the note drops below the title. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <Heading className={Heading === 'h3' ? 'ba-h3' : 'ba-h2'}>{title}</Heading>
        {right}
      </div>
    </div>
  );
}
