interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** States what happened and how to fix it. No apology, no vagueness. */
export default function QueryError({
  title = 'This data did not load',
  message = 'The request to the API failed. Retry, or reload the page if it keeps failing.',
  onRetry,
}: Props) {
  return (
    <div className="ba-card-flat border-t-2 border-t-[var(--clay)] py-10 text-center">
      <div className="ba-eyebrow mb-1.5">Request failed</div>
      <div className="ba-h3 mb-1 text-[var(--ink)]">{title}</div>
      <p className="text-[13px] text-[var(--ink-2)] px-4 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ba-btn ba-btn-ghost mt-4">
          Retry
        </button>
      )}
    </div>
  );
}
