interface Props {
  title?: string;
  message?: string;
}

export default function EmptyState({ title = 'No Data', message = 'No data available.' }: Props) {
  return (
    <div className="text-center py-16 text-[var(--mute)] ba-card-flat border-t-2 border-t-[var(--ink)]">
      <div className="ba-kicker mb-2">Empty view</div>
      <div className="ba-h2 mb-2 text-[var(--ink-2)]">{title}</div>
      <p className="text-sm px-4 pb-4 max-w-xl mx-auto">{message}</p>
    </div>
  );
}
