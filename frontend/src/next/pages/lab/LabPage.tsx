/**
 * Lab: /lab (brief 03-screens/lab.md; prototype/Lab.dc.html). Example
 * questions load and run their SQL; the builder writes SQL into the editor;
 * results sort client-side and download as CSV. URL: ?example=<id> or
 * ?sql=<encoded>. The server's containment (api/routers/query.py) is the
 * real guard; the checks here only give faster, plainer messages.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { downloadQueryCsv, fetchQuerySchema, runQuery, type QueryResult, type QuerySchema } from '../../../api/client';
import CopyButton from '../../components/CopyButton';
import { BlockError, SkeletonRows } from '../../components/States';
import { useIsPhone } from '../../hooks/useViewport';
import { buildSql, RELATIONS, type BuilderState, type Relation } from '../../lab/builder';
import { LAB_EXAMPLES, labExample } from '../../lab/examples';
import { columnMeaning, NAME_COLUMNS, RELATION_TEXT } from '../../lab/schemaText';
import { MAX_SQL, precheck, tokenize } from '../../lab/sqlText';
import { LEVELS } from '../../lib/filters';
import { fmtInt } from '../../lib/format';
import { playerPath } from '../../lib/slug';
import { SURFACES } from '../../lib/surface';
import './lab.css';

const DEFAULT_EXAMPLE = 'teens-beat-no1';
const SEASON = new Date().getFullYear();
type Cell = string | number | boolean | null;

const errorText = (e: unknown): string => {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail instanceof Blob) return 'The query failed.';
  return 'The query didn’t run. Check your connection and try again.';
};

function Highlighted({ sql }: { sql: string }) {
  return (
    <pre aria-hidden="true">
      {tokenize(sql).map((t, i) => (t.kind ? <span key={i} className={`tk-${t.kind}`}>{t.text}</span> : t.text))}
      {'\n'}
    </pre>
  );
}

function Builder({ onWrite }: { onWrite: (sql: string) => void }) {
  const [s, setS] = useState<BuilderState>({
    relation: 'player_match_view', tour: 'M', surface: 'All', level: 'All', from: SEASON - 5, to: SEASON,
    player: '', order: 'newest', limit: 100,
  });
  const set = (patch: Partial<BuilderState>) => setS(prev => ({ ...prev, ...patch }));
  const years = Array.from({ length: SEASON - 1968 + 1 }, (_, i) => SEASON - i);
  const matches = s.relation !== 'players';
  return (
    <details className="lab-builder">
      <summary>Build a query</summary>
      <div className="lab-builder-grid">
        <label className="cv-field">Relation
          <select className="cv-select" value={s.relation} onChange={e => set({ relation: e.target.value as Relation })}>
            {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="cv-field">Tour
          <select className="cv-select" value={s.tour} onChange={e => set({ tour: e.target.value as 'M' | 'F', level: 'All' })}>
            <option value="M">ATP</option><option value="F">WTA</option>
          </select>
        </label>
        {matches && (
          <>
            <label className="cv-field">Surface
              <select className="cv-select" value={s.surface} onChange={e => set({ surface: e.target.value as BuilderState['surface'] })}>
                {['All', ...SURFACES].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="cv-field">Level
              <select className="cv-select" value={s.level} onChange={e => set({ level: e.target.value })}>
                {LEVELS[s.tour].map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>
            <label className="cv-field">From
              <select className="cv-select" value={s.from ?? ''} onChange={e => set({ from: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Any</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="cv-field">To
              <select className="cv-select" value={s.to ?? ''} onChange={e => set({ to: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Any</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="cv-field">Order
              <select className="cv-select" value={s.order} onChange={e => set({ order: e.target.value as BuilderState['order'] })}>
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              </select>
            </label>
          </>
        )}
        <label className="cv-field">Player name
          <input className="lab-input" value={s.player} placeholder="e.g. Iga Swiatek" onChange={e => set({ player: e.target.value })} />
        </label>
        <label className="cv-field">Limit
          <select className="cv-select" value={s.limit} onChange={e => set({ limit: Number(e.target.value) })}>
            {[50, 100, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" className="cv-btn" onClick={() => onWrite(buildSql(s))}>Write SQL ↓</button>
      </div>
    </details>
  );
}

function Schema({ schema, onInsert }: { schema: QuerySchema; onInsert: (text: string) => void }) {
  return (
    <div>
      <h2 className="cv-h3" style={{ fontSize: 18 }}>Schema</h2>
      <p className="cv-muted" style={{ margin: '0 0 8px', fontSize: 13 }}>Select a column to insert it at the cursor.</p>
      {schema.relations.map((r, i) => (
        <details key={r.name} open={i === 0}>
          <summary>
            <span className="cv-mono" style={{ fontWeight: 600 }}>{r.name}</span>
            <span className="cv-muted" style={{ fontSize: 12 }}>{fmtInt(r.rows)} rows</span>
            <span className="cv-muted" style={{ fontSize: 12, flexBasis: '100%' }}>{RELATION_TEXT[r.name]}</span>
          </summary>
          {r.columns.map(c => (
            <button key={c.name} type="button" className="lab-col" onClick={() => onInsert(c.name)} aria-label={`Insert ${c.name}: ${columnMeaning(c.name)}`}>
              <span className="lab-col-name">{c.name}</span><span className="lab-col-type">{c.type}</span>
              <span className="lab-col-mean">{columnMeaning(c.name)}</span>
            </button>
          ))}
        </details>
      ))}
    </div>
  );
}

function Results({ result }: { result: QueryResult }) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const rows = sort
    ? [...result.rows].sort((a, b) => {
      const x = a[sort.col];
      const y = b[sort.col];
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir;
    })
    : result.rows;
  const numeric = result.columns.map((_, i) => result.rows.some(r => typeof r[i] === 'number'));
  const cell = (v: Cell, col: string) => {
    if (v == null) return <span className="lab-null">—</span>;
    if (NAME_COLUMNS.has(col) && typeof v === 'string') return <Link to={playerPath(v)}>{v}</Link>;
    if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-US') : String(Math.round(v * 1000) / 1000);
    return String(v);
  };
  return (
    <div className="lab-results">
      <table>
        <thead>
          <tr>
            {result.columns.map((c, i) => {
              const on = sort?.col === i;
              return (
                <th key={`${c}${i}`} scope="col" aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'} style={{ textAlign: numeric[i] ? 'right' : 'left' }}>
                  <button type="button" onClick={() => setSort(on ? { col: i, dir: sort!.dir === 1 ? -1 : 1 } : { col: i, dir: numeric[i] ? -1 : 1 })}>
                    {c}{on ? (sort!.dir === 1 ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j} className={result.columns[j] === 'score' ? 'cv-mono' : undefined} style={{ textAlign: numeric[j] ? 'right' : 'left' }}>
                  {cell(v, result.columns[j])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LabPage() {
  const [params, setParams] = useSearchParams();
  const phone = useIsPhone();
  const initial = labExample(params.get('example')) ?? (params.get('sql') ? null : labExample(DEFAULT_EXAMPLE));
  const [sql, setSql] = useState(() => initial?.sql ?? params.get('sql') ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const schema = useQuery({ queryKey: ['query-schema'], queryFn: fetchQuerySchema, staleTime: Infinity });
  const run = useMutation({ mutationFn: (text: string) => runQuery(text) });
  const csv = useMutation({ mutationFn: (text: string) => downloadQueryCsv(text) });
  const activeExample = LAB_EXAMPLES.find(e => e.sql === sql.trim());

  const execute = (text: string, fromUser = true) => {
    const why = precheck(text);
    setNotice(why);
    setCsvError(null);
    if (why) {
      run.reset();
      return;
    }
    run.mutate(text);
    if (fromUser) {
      const ex = LAB_EXAMPLES.find(e => e.sql === text.trim());
      setParams(ex ? { example: ex.id } : { sql: text }, { replace: true });
    }
  };

  // Run what the URL (or the default example) loaded, once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !sql.trim()) return;
    started.current = true;
    execute(sql, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first load only
  }, []);

  const insert = (text: string) => {
    const el = ref.current;
    const a = el?.selectionStart ?? sql.length;
    const b = el?.selectionEnd ?? sql.length;
    setSql(sql.slice(0, a) + text + sql.slice(b));
    setSchemaOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + text.length, a + text.length);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      execute(sql);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insert('  ');
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  const result = run.data;
  const lines = sql.split('\n').length;

  return (
    <main className="cv-main cv-main--wide">
      <section className="lab-top">
        <h1 className="cv-h1">Lab</h1>
        <p className="cv-lede" style={{ margin: '6px 0 0', fontSize: 17 }}>Ask the database anything. Start from a question, or write your own SQL.</p>
        <div className="lab-examples" role="group" aria-label="Example questions">
          {LAB_EXAMPLES.map(e => (
            <button key={e.id} type="button" className="lab-example" aria-pressed={activeExample?.id === e.id}
              onClick={() => { setSql(e.sql); execute(e.sql); }}>
              {e.question}
            </button>
          ))}
        </div>
      </section>

      <div className="lab-layout">
        <div style={{ minWidth: 0 }}>
          <Builder onWrite={text => { setSql(text); ref.current?.focus(); }} />
          <label htmlFor="lab-sql" className="cv-visually-hidden">SQL</label>
          <div className="lab-editor-wrap">
            <div className="lab-editor">
              <Highlighted sql={sql} />
              <textarea
                id="lab-sql"
                ref={ref}
                value={sql}
                rows={Math.max(9, lines + 1)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                aria-describedby="lab-keys"
                onChange={e => setSql(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
          </div>
          <div className="lab-bar">
            <button type="button" className="cv-btn cv-btn--primary" onClick={() => execute(sql)} disabled={run.isPending}>
              {run.isPending ? 'Running…' : 'Run'}
            </button>
            <span id="lab-keys" className="cv-muted">⌘ / Ctrl + Enter to run · Tab indents · Esc leaves the editor</span>
            <span className={sql.length > MAX_SQL ? 'lab-count--over' : 'cv-muted'} style={{ marginLeft: 'auto' }}>
              {fmtInt(sql.length)} / {fmtInt(MAX_SQL)}
            </span>
            <CopyButton />
            {phone && <button type="button" className="cv-btn" onClick={() => setSchemaOpen(true)}>Schema</button>}
          </div>

          {notice && (
            <div className="lab-error" role="alert"><strong>Query not allowed</strong><pre>{notice}</pre></div>
          )}
          {run.isError && (
            <div className="lab-error" role="alert"><strong>The database returned an error</strong><pre>{errorText(run.error)}</pre></div>
          )}
          {run.isPending && <div style={{ marginTop: 22 }}><SkeletonRows rows={6} height={36} /></div>}
          {result && !run.isPending && (
            <>
              <div className="lab-status" aria-live="polite">
                <span>
                  <strong>{fmtInt(result.row_count)} row{result.row_count === 1 ? '' : 's'}</strong> · {fmtInt(Math.round(result.elapsed_ms))} ms
                  {result.truncated && <span className="cv-muted"> · showing the first {fmtInt(result.limit)}: download CSV for up to 50,000</span>}
                </span>
                <button type="button" className="cv-btn" disabled={csv.isPending || !result.row_count}
                  onClick={() => csv.mutate(sql, { onError: e => setCsvError(errorText(e)) })}>
                  {csv.isPending ? 'Preparing CSV…' : 'Download CSV'}
                </button>
              </div>
              {csvError && <BlockError message={csvError} />}
              {result.row_count > 0 ? <Results key={`${sql}|${result.elapsed_ms}`} result={result} /> : <p className="cv-muted">No rows.</p>}
            </>
          )}
          <p className="lab-limits">
            Limits: {fmtInt(schema.data?.limits.display_rows ?? 1000)} rows on screen · {fmtInt(schema.data?.limits.csv_rows ?? 50000)} rows per CSV ·
            {' '}{schema.data?.limits.timeout_seconds ?? 20} s per query · {fmtInt(MAX_SQL)} characters of SQL.
          </p>
        </div>

        {!phone && (
          <aside className="lab-schema" aria-label="Schema">
            {schema.isPending && <SkeletonRows rows={6} height={32} />}
            {schema.isError && <BlockError message="The schema didn’t load." onRetry={() => schema.refetch()} />}
            {schema.data && <Schema schema={schema.data} onInsert={insert} />}
          </aside>
        )}
      </div>

      {phone && schemaOpen && (
        <div className="lab-drawer" role="dialog" aria-modal="true" aria-label="Schema">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button type="button" className="cv-btn" onClick={() => setSchemaOpen(false)}>Done</button>
          </div>
          {schema.data ? <Schema schema={schema.data} onInsert={insert} /> : <SkeletonRows rows={6} />}
        </div>
      )}
    </main>
  );
}
