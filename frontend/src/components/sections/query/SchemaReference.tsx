import { useState } from 'react';
import type { QuerySchema } from '../../../api/client';

/**
 * The columns you can query, on the page rather than in a doc. Clicking a
 * column name adds it to the SELECT list, so the reference is also the picker.
 */
export default function SchemaReference({
  schema,
  activeRelation,
  onPickColumn,
}: {
  schema?: QuerySchema;
  activeRelation: string;
  onPickColumn: (column: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(activeRelation);

  if (!schema) return null;

  return (
    <section>
      <div className="ba-label border-b border-[var(--ink)] pb-1 mb-1.5">
        Schema · click a column to add it to SELECT
      </div>

      <div className="border border-[var(--rule)] divide-y divide-[var(--rule)]">
        {schema.relations.map(rel => {
          const isOpen = open === rel.name;
          const isActive = rel.name === activeRelation;
          return (
            <div key={rel.name}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : rel.name)}
                aria-expanded={isOpen}
                className={`w-full flex items-baseline gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  isOpen ? 'bg-[var(--clay-wash)]' : 'hover:bg-[var(--paper-sunken)]'
                }`}
              >
                <span className="ba-mono text-[9px] text-[var(--mute)] w-2">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span
                  className={`ba-mono text-[11.5px] font-semibold ${
                    isActive ? 'text-[var(--clay)]' : 'text-[var(--ink)]'
                  }`}
                >
                  {rel.name}
                </span>
                <span className="ba-mono text-[10px] text-[var(--mute)] ml-auto">
                  {rel.rows.toLocaleString()} rows · {rel.columns.length} cols
                </span>
              </button>

              {isOpen && (
                <div className="px-2.5 pb-2 pt-0.5 bg-[var(--paper-sunken)]">
                  <div className="flex flex-wrap gap-1">
                    {rel.columns.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => onPickColumn(c.name)}
                        title={`${c.name} · ${c.type}`}
                        className="ba-mono text-[10px] px-1.5 py-[1px] border border-[var(--rule-mid)]
                                   bg-[var(--paper-raised)] text-[var(--ink-2)]
                                   hover:border-[var(--clay)] hover:text-[var(--clay-deep)] transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="ba-kicker mt-1.5">
        Read-only. Up to {schema.limits.display_rows.toLocaleString()} rows shown,{' '}
        {schema.limits.csv_rows.toLocaleString()} in a CSV, {schema.limits.timeout_seconds}s per query.
      </p>
    </section>
  );
}
