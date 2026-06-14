interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function QueryError({ title = "Couldn't Load", message = 'Something went wrong loading this data.', onRetry }: Props) {
  return (
    <div className="text-center py-16 text-[var(--mute)] ba-card-flat border-t-2 border-t-[var(--ink)]">
      <div className="ba-kicker mb-2">Data unavailable</div>
      <div className="ba-h2 mb-2 text-[var(--ink-2)]">{title}</div>
      <p className="text-sm px-4 pb-4 max-w-xl mx-auto">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ba-btn ba-btn-primary">
          Retry
        </button>
      )}
    </div>
  );
}
