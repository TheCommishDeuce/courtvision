interface Props {
  title?: string;
  message?: string;
  /**
   * Overrides the standing "No results" tag. This block is used for two
   * different states — a query that came back empty, and a query that hasn't
   * been run yet — and "No results" is wrong above "Pick a player".
   */
  eyebrow?: string;
}

/** An empty screen is an invitation to act — say what to change. */
export default function EmptyState({
  title = 'Nothing here yet',
  message = 'Widen the filters or pick a different player to see results.',
  eyebrow = 'No results',
}: Props) {
  return (
    <div className="ba-card-flat border-dashed py-10 text-center">
      <div className="ba-eyebrow mb-1.5">{eyebrow}</div>
      <div className="ba-h3 mb-1 text-ink">{title}</div>
      <p className="ba-cell text-ink-2 px-4 max-w-md mx-auto">{message}</p>
    </div>
  );
}
