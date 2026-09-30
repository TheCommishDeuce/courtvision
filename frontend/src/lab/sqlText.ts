/** Client-side SQL helpers for the Lab editor. The server is the real guard (api/routers/query.py). */

export const MAX_SQL = 20_000;

export type Token = { text: string; kind?: 'kw' | 'str' | 'num' | 'fn' | 'comment' };

const KEYWORDS = new Set((
  'SELECT FROM WHERE AND OR NOT AS ORDER BY GROUP LIMIT WITH JOIN LEFT RIGHT INNER OUTER FULL ON DESC ASC CAST ' +
  'IN LIKE ILIKE IS NULL CASE WHEN THEN ELSE END HAVING DISTINCT UNION ALL OVER PARTITION BETWEEN TRUE FALSE ' +
  'QUALIFY NULLS FIRST LAST FILTER USING EXISTS INTERVAL'
).split(' '));
const FUNCTIONS = /^(count|sum|avg|min|max|floor|ceil|round|date_diff|date_part|extract|string_split|split_part|regexp_replace|regexp_extract|regexp_matches|list_contains|list_filter|list_transform|len|length|coalesce|row_number|rank|dense_rank|abs|lower|upper|trim|try_cast|strftime|any_value|arg_max|arg_min|string_agg|nullif|greatest|least)$/i;

/** Split SQL into highlightable tokens. Concatenating the texts gives the input back. */
export function tokenize(sql: string): Token[] {
  const out: Token[] = [];
  const re = /(--[^\n]*)|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const text = m[0];
    if (m[1]) out.push({ text, kind: 'comment' });
    else if (m[2]) out.push({ text, kind: 'str' });
    else if (m[3]) out.push({ text, kind: 'num' });
    else if (m[4] && KEYWORDS.has(text.toUpperCase())) out.push({ text, kind: 'kw' });
    else if (m[4] && FUNCTIONS.test(text)) out.push({ text, kind: 'fn' });
    else out.push({ text });
  }
  return out;
}

/** SQL with comments and string literals blanked out, for structural checks. */
function skeleton(sql: string): string {
  return tokenize(sql).map(t => (t.kind === 'comment' || t.kind === 'str' ? ' '.repeat(t.text.length) : t.text)).join('');
}

/** Why this can't run, in plain words, or null if it may go to the server. */
export function precheck(sql: string): string | null {
  const s = skeleton(sql).trim();
  if (!s) return 'Enter a query to run.';
  if (sql.length > MAX_SQL) return `Query is too long (${sql.length.toLocaleString('en-US')} characters). The limit is ${MAX_SQL.toLocaleString('en-US')}.`;
  if (!/^(select|with)\b/i.test(s)) return 'Only a single read-only SELECT or WITH query can run in the Lab.';
  if (/;\s*\S/.test(s)) return 'Run one statement at a time.';
  return null;
}
