/**
 * Links to the pre-v1 site must keep working (BUILD.md › Legacy redirects).
 * Returns where an old URL now lives, or null if it is already current.
 */
import { slugify } from './slug';

const RENAMED: Record<string, string> = { y0: 'from', y1: 'to' };
const DROPPED = new Set(['tab', 'p', 'a', 'b', 't', 'year', 'enabled']);

function carry(params: URLSearchParams, drop: Iterable<string> = DROPPED): string {
  const out = new URLSearchParams();
  const skip = new Set(drop);
  params.forEach((value, key) => {
    if (skip.has(key) || value === '') return;
    out.set(RENAMED[key] ?? key, value);
  });
  const s = out.toString();
  return s ? `?${s}` : '';
}

export function legacyRedirect(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search);
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/search') return `/lab${carry(params)}`;
  if (path === '/leaders') return `/records${carry(params)}`;
  if (path === '/h2h' || path === '/compare') return legacyRedirect('/versus', search) ?? `/versus${carry(params)}`;

  if (path === '/player') {
    const p = params.get('p');
    return p ? `/player/${slugify(p)}${carry(params)}` : '/';
  }
  if (path === '/versus') {
    const a = params.get('a');
    const b = params.get('b');
    if (a && b) return `/versus/${slugify(a)}/${slugify(b)}${carry(params)}`;
  }
  if (path === '/tournament') {
    const t = params.get('t');
    if (t) {
      const year = params.get('year');
      return `/tournament/${slugify(t)}${year ? `/${year}` : ''}${carry(params)}`;
    }
  }

  // Current path, old parameter names.
  const keys = [...params.keys()];
  if (keys.some(k => k in RENAMED || k === 'tab')) return `${path}${carry(params, ['tab'])}`;
  return null;
}
