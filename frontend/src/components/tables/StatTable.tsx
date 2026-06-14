interface Row {
  label: string;
  value: string | number | null;
}

interface Props {
  rows: Row[];
  title?: string;
  stretch?: boolean;
}

export default function StatTable({ rows, title, stretch = false }: Props) {
  if (stretch) {
    return (
      <div className="ba-card p-0 overflow-hidden flex flex-col h-full">
        {title && (
          <div className="px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--bone-2)] shrink-0">
            <h3 className="ba-h3">{title}</h3>
          </div>
        )}
        <div className="flex flex-col flex-1">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-4 px-4 flex-1 ${i < rows.length - 1 ? 'border-b border-[var(--rule)]' : ''}`}
            >
              <span className="text-[var(--ink-2)] text-[13.5px]">{r.label}</span>
              <span className="font-semibold text-right text-[var(--ink)] ba-mono">{r.value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ba-card p-0 overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--bone-2)]">
          <h3 className="ba-h3">{title}</h3>
        </div>
      )}
      <table className="ba-table min-w-full">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-4 text-[var(--ink-2)] text-[13.5px]">{r.label}</td>
              <td className="px-4 font-semibold text-right text-[var(--ink)] ba-mono">{r.value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
