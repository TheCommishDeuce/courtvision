/** Per-block loading, error and empty states (brief 02-shell.md › States). */
import type { CSSProperties, ReactNode } from 'react';

/** A grey bar in the block's final shape. */
export function SkelBar({ width = '100%', height = 12, style }: { width?: number | string; height?: number; style?: CSSProperties }) {
  return <div className="cv-skel-bar" style={{ width, height, ...style }} />;
}

/** Wrap skeleton content: pulses, and is hidden from assistive tech. */
export function Skeleton({ children, label = 'Loading', style }: { children: ReactNode; label?: string; style?: CSSProperties }) {
  return (
    <div className="cv-skel" role="status" aria-label={label} style={style}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Skeleton rows for any list or table block. */
export function SkeletonRows({ rows = 5, height = 48 }: { rows?: number; height?: number }) {
  return (
    <Skeleton>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, height, borderBottom: '1px solid var(--line2)' }}>
          <SkelBar width="18%" />
          <SkelBar width="42%" />
          <SkelBar width="20%" />
        </div>
      ))}
    </Skeleton>
  );
}

/** A block failed to load: say so inline and offer a retry. Other blocks keep working. */
export function BlockError({ message = 'This didn’t load.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="cv-block-error" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className="cv-btn" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/** Nothing to show, and why, with a way out. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="cv-empty">
      <h2 className="cv-h2">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
