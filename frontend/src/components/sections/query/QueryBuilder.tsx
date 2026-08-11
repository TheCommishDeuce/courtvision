import { useCallback, useMemo, useState } from 'react';
import { useQuerySchema } from '../../../hooks';
import { downloadQueryCsv, runQuery, type QueryResult } from '../../../api/client';
import AdaptiveTable, { type Column } from '../../tables/AdaptiveTable';
import SectionHeader from '../../ui/SectionHeader';
import Spinner from '../../ui/Spinner';
import SchemaReference from './SchemaReference';
import {
  RELATIONS,
  buildSql,
  relationByName,
  type FilterDef,
  type FilterValues,
  type RelationName,
} from './builderConfig';

type Row = (string | number | boolean | null)[];

/** One filter control, shaped by its kind. */
function FilterControl({
  def,
  value,
  onChange,
}: {
  def: FilterDef;
  value: FilterValues[string] | undefined;
  onChange: (next: FilterValues[string]) => void;
}) {
  if (def.kind === 'bool') {
    return (
      <label className="flex items-center gap-1.5 pb-1.5">
        <input
          type="checkbox"
          checked={Boolean(value?.on)}
          onChange={e => onChange({ on: e.target.checked })}
          className="accent-[var(--clay)]"
        />
        <span className="ba-label">{def.label}</span>
      </label>
    );
  }

  if (def.kind === 'select') {
    return (
      <label className="flex flex-col gap-0.5">
        <span className="ba-label">{def.label}</span>
        <select
          value={value?.select ?? ''}
          onChange={e => onChange({ select: e.target.value })}
          className="ba-select w-full"
        >
          {def.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (def.kind === 'text') {
    return (
      <label className="flex flex-col gap-0.5">
        <span className="ba-label">{def.label}</span>
        <input
          value={value?.text ?? ''}
          onChange={e => onChange({ text: e.target.value })}
          placeholder={def.hint}
          className="ba-input w-full"
        />
      </label>
    );
  }

  // yearRange and numberRange share one two-input control.
  return (
    <div className="flex flex-col gap-0.5">
      <span className="ba-label">{def.label}</span>
      <div className="flex items-center gap-1.5">
        <input
          value={value?.min ?? ''}
          onChange={e => onChange({ ...value, min: e.target.value })}
          placeholder="min"
          inputMode="numeric"
          aria-label={`${def.label} minimum`}
          className="ba-input w-[5.5rem]"
        />
        <span className="ba-mono text-[10px] text-[var(--mute)]">to</span>
        <input
          value={value?.max ?? ''}
          onChange={e => onChange({ ...value, max: e.target.value })}
          placeholder="max"
          inputMode="numeric"
          aria-label={`${def.label} maximum`}
          className="ba-input w-[5.5rem]"
        />
      </div>
    </div>
  );
}

export default function QueryBuilder() {
  const { data: schema } = useQuerySchema();

  const [relationName, setRelationName] = useState<RelationName>('matches_main');
  const relation = relationByName(relationName);

  const [values, setValues] = useState<FilterValues>({});
  const [columns, setColumns] = useState<string[]>(relation.defaultColumns);
  const [orderBy, setOrderBy] = useState(relation.defaultOrderBy);
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('DESC');
  const [limit, setLimit] = useState(200);

  // SQL is generated from the controls until you edit it. After that the
  // textarea is the source of truth and the builder stops overwriting your work.
  const [editedSql, setEditedSql] = useState<string | null>(null);

  const generatedSql = useMemo(
    () => buildSql({ relation, values, columns, orderBy, orderDir, limit }),
    [relation, values, columns, orderBy, orderDir, limit],
  );
  const sql = editedSql ?? generatedSql;
  const isEdited = editedSql !== null;
  const driftsFromFilters = isEdited && editedSql !== generatedSql;

  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const switchRelation = (name: RelationName) => {
    const next = relationByName(name);
    setRelationName(name);
    setValues({});
    setColumns(next.defaultColumns);
    setOrderBy(next.defaultOrderBy);
    setEditedSql(null);
    setResult(null);
    setError(null);
  };

  const setFilter = (id: string, next: FilterValues[string]) =>
    setValues(prev => ({ ...prev, [id]: next }));

  const addColumn = useCallback((column: string) => {
    setColumns(prev => (prev.includes(column) ? prev : [...prev, column]));
  }, []);

  const errorText = (e: unknown): string => {
    const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => String((d as { msg?: string }).msg ?? d)).join('; ');
    return e instanceof Error ? e.message : 'The query failed.';
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await runQuery(sql));
    } catch (e) {
      setResult(null);
      setError(errorText(e));
    } finally {
      setRunning(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadQueryCsv(sql);
    } catch {
      setError('The CSV download failed. Run the query first to check it works.');
    } finally {
      setDownloading(false);
    }
  };

  const resultColumns: Column<Row>[] = useMemo(
    () =>
      (result?.columns ?? []).map((name, i) => ({
        key: `${name}-${i}`,
        header: name,
        cardLabel: name,
        num: result?.rows.some(r => typeof r[i] === 'number') ?? false,
        cell: (row: Row) => {
          const v = row[i];
          if (v === null) return <span className="text-[var(--rule-mid)]">null</span>;
          if (typeof v === 'boolean') return <span className="ba-mono text-[11px]">{String(v)}</span>;
          if (typeof v === 'number') return <span className="ba-mono">{v.toLocaleString()}</span>;
          return <span className="whitespace-nowrap">{v}</span>;
        },
      })),
    [result],
  );

  const columnOptions = schema?.relations.find(r => r.name === relationName)?.columns ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        {/* Relation */}
        <section className="ba-well border-t-2 border-t-[var(--ink)] px-3 py-2.5">
          <div className="ba-label mb-1.5">Table</div>
          <div className="flex flex-wrap gap-1.5">
            {RELATIONS.map(r => (
              <button
                key={r.name}
                type="button"
                onClick={() => switchRelation(r.name)}
                className={`ba-chip ${r.name === relationName ? 'ba-chip-active' : ''}`}
              >
                {r.name}
              </button>
            ))}
          </div>
          <p className="ba-kicker mt-1.5">{relation.grain}</p>
        </section>

        {/* Filters */}
        <section>
          <SectionHeader level="sub" title="Filters" kicker="Each one becomes a WHERE clause" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-2.5 items-end">
            {relation.filters.map(f => (
              <FilterControl
                key={f.id}
                def={f}
                value={values[f.id]}
                onChange={next => setFilter(f.id, next)}
              />
            ))}
          </div>
        </section>

        {/* Shape */}
        <section>
          <SectionHeader level="sub" title="Columns and order" />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 items-center">
              {columns.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColumns(prev => prev.filter(x => x !== c))}
                  title={`Remove ${c}`}
                  className="ba-mono text-[10.5px] px-1.5 py-[2px] border border-[var(--ink)]
                             bg-[var(--paper-raised)] hover:border-[var(--clay)] hover:text-[var(--clay-deep)]"
                >
                  {c} <span className="text-[var(--mute)]">×</span>
                </button>
              ))}
              {columns.length === 0 && <span className="ba-kicker">All columns (*)</span>}
              {columns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setColumns([])}
                  className="ba-mono text-[10px] text-[var(--mute)] hover:text-[var(--clay)] ml-1"
                >
                  clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-0.5">
                <span className="ba-label">Order by</span>
                <select
                  value={orderBy}
                  onChange={e => setOrderBy(e.target.value)}
                  className="ba-select"
                >
                  <option value="">Nothing</option>
                  {columnOptions.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="ba-label">Direction</span>
                <select
                  value={orderDir}
                  onChange={e => setOrderDir(e.target.value as 'ASC' | 'DESC')}
                  className="ba-select"
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="ba-label">Row limit</span>
                <input
                  value={limit}
                  onChange={e => setLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                  inputMode="numeric"
                  className="ba-input w-24"
                />
              </label>
            </div>
          </div>
        </section>

        {/* SQL */}
        <section>
          <SectionHeader
            level="sub"
            title="The SQL"
            action={
              driftsFromFilters ? (
                <button
                  type="button"
                  onClick={() => setEditedSql(null)}
                  className="ba-kicker ba-link"
                >
                  Rebuild from filters
                </button>
              ) : (
                <span className="ba-kicker">Editable</span>
              )
            }
          />
          <textarea
            value={sql}
            onChange={e => setEditedSql(e.target.value)}
            spellCheck={false}
            rows={Math.min(16, Math.max(7, sql.split('\n').length + 1))}
            aria-label="SQL query"
            className="ba-input w-full ba-mono text-[12.5px] leading-relaxed resize-y"
          />
          {driftsFromFilters && (
            <p className="ba-kicker mt-1">
              You've edited the SQL, so the filters above no longer drive it.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              onClick={run}
              disabled={running || !sql.trim()}
              className="ba-btn ba-btn-primary"
            >
              {running ? 'Running…' : 'Run query'}
            </button>
            <button
              type="button"
              onClick={download}
              disabled={downloading || !sql.trim()}
              className="ba-btn ba-btn-ghost"
            >
              {downloading ? 'Preparing…' : 'Download CSV'}
            </button>
            {result && !error && (
              <span className="ba-kicker">
                {result.row_count.toLocaleString()} rows in {result.elapsed_ms} ms
                {result.truncated && ` · capped at ${result.limit.toLocaleString()}`}
              </span>
            )}
          </div>
        </section>

        {/* Results */}
        <section>
          {error && (
            <div className="ba-card-flat border-t-2 border-t-[var(--clay)] px-3 py-2.5">
              <div className="ba-eyebrow mb-1">Query error</div>
              <pre className="ba-mono text-[12px] text-[var(--ink)] whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {running && <Spinner />}

          {!running && !error && result && (
            <>
              <SectionHeader
                level="sub"
                title="Results"
                kicker={result.truncated ? `First ${result.limit.toLocaleString()} rows` : 'Complete'}
              />
              {result.row_count === 0 ? (
                <p className="ba-kicker py-5 text-center">
                  The query ran and returned no rows. Loosen a filter.
                </p>
              ) : (
                <AdaptiveTable
                  rows={result.rows}
                  columns={resultColumns}
                  rowKey={(_r, i) => String(i)}
                  density="agate"
                  cardTitle={r => String(r[0] ?? '—')}
                  pageSize={100}
                  unit="rows"
                />
              )}
            </>
          )}

          {!running && !error && !result && (
            <p className="ba-kicker py-5 text-center">
              Set some filters, then run the query. Nothing has been sent yet.
            </p>
          )}
        </section>
      </div>

      {/* Schema reference — the sidebar doubles as the column picker. */}
      <div className="lg:sticky lg:top-3">
        <SchemaReference schema={schema} activeRelation={relationName} onPickColumn={addColumn} />
      </div>
    </div>
  );
}
