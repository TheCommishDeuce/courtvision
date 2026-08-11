interface Props {
  title?: string;
  message?: string;
}

/** An empty screen is an invitation to act — say what to change. */
export default function EmptyState({
  title = 'Nothing here yet',
  message = 'Widen the filters or pick a different player to see results.',
}: Props) {
  return (
    <div className="ba-card-flat border-t-2 border-t-[var(--rule-ink)] py-10 text-center">
      <div className="ba-eyebrow mb-1.5">No results</div>
      <div className="ba-h3 mb-1 text-[var(--ink)]">{title}</div>
      <p className="ba-cell text-[var(--ink-2)] px-4 max-w-md mx-auto">{message}</p>
    </div>
  );
}
