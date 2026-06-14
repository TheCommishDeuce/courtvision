import type { ReactNode } from 'react';

type Props = {
  kicker?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared filter surface: quiet card, responsive controls, and consistent action slot.
 */
export default function FilterPanel({ kicker = 'Filters', summary, children, actions, className = '' }: Props) {
  return (
    <section className={`ba-card-flat border-t-2 border-t-[var(--ink)] space-y-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--rule)] pb-3">
        <div className="ba-kicker">{kicker}</div>
        {summary && <div className="ba-mono text-[11px] text-[var(--ink-2)]">{summary}</div>}
      </div>
      <div className="space-y-4">{children}</div>
      {actions && <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">{actions}</div>}
    </section>
  );
}
