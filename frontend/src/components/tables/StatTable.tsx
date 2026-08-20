interface Row {
  label: string;
  value: string | number | null;
}

interface Props {
  rows: Row[];
  title?: string;
  /** Distribute rows to fill the parent's height (for equal-height grids). */
  stretch?: boolean;
}

function Head({ title }: { title: string }) {
  return (
    <div className="px-2.5 py-1.5 border-b border-rule-ink bg-paper-sunken shrink-0">
      <h3 className="ba-board-title">{title}</h3>
    </div>
  );
}

/** A label/figure list — the two-column cousin of StatBoard. */
export default function StatTable({ rows, title, stretch = false }: Props) {
  if (stretch) {
    return (
      <div className="ba-card p-0 overflow-hidden flex flex-col h-full">
        {title && <Head title={title} />}
        <div className="flex flex-col flex-1">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-4 px-2.5 flex-1 min-h-[26px] ${
                i < rows.length - 1 ? 'border-b border-rule' : ''
              }`}
            >
              <span className="ba-cell text-ink-2">{r.label}</span>
              <span className="ba-figure">{r.value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ba-card p-0 overflow-hidden">
      {title && <Head title={title} />}
      <table className="ba-table ba-table-dense min-w-full">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="ba-cell text-ink-2">{r.label}</td>
              <td className="num">
                <span className="ba-figure">{r.value ?? '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
