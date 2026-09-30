/**
 * Global search (DESIGN.md › Global search; brief 02-shell.md). One component,
 * three uses:
 * - kind 'all': header, phone sheet and Home hero; picking navigates.
 * - kind 'players' + tour + exclude + onPick: the Matchup pair picker.
 * - kind 'tournaments': the Tournament browse screen.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSuggestions } from '../api/directory';
import { useDebounced } from '../hooks/useDebounced';
import type { Tour } from '../lib/filters';
import { onSearchFill } from '../lib/searchBus';
import { groupSuggestions, readRecent, rememberRecent, type SearchGroup, type SearchItem, type SearchKind } from './searchItems';

export interface SearchBoxProps {
  kind?: SearchKind;
  tour?: Tour;
  exclude?: string;
  /** Take the picked item instead of navigating to it. */
  onPick?: (item: SearchItem) => void;
  placeholder?: string;
  /** This instance owns the `/` shortcut. Only one per page should. */
  slashFocus?: boolean;
  autoFocus?: boolean;
  initialQuery?: string;
  /** Listen for fillSearch(channel, q). */
  channel?: string;
  onEscape?: () => void;
  label?: string;
}

const isTyping = (el: Element | null) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

export function MagnifierIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="10.8" y1="10.8" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchBox({
  kind = 'all', tour, exclude, onPick, placeholder = 'Search players, tournaments, matchups',
  slashFocus = false, autoFocus = false, initialQuery = '', channel, onEscape,
  label = 'Search players and tournaments',
}: SearchBoxProps) {
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(!!initialQuery);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const listId = useId();

  const trimmed = q.trim();
  const settled = useDebounced(trimmed, 120);
  const query = useQuery({
    queryKey: ['suggest', settled, kind, tour, exclude],
    queryFn: () => fetchSuggestions({ q: settled, kind, tour, exclude, limit: 10 }),
    enabled: settled.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const groups: SearchGroup[] = useMemo(() => {
    if (!trimmed) {
      const recent = onPick ? [] : readRecent();
      return recent.length ? [{ title: 'Recent searches', items: recent }] : [];
    }
    return query.data && settled ? groupSuggestions(query.data, kind) : [];
    // readRecent is read when the list opens; `open` re-evaluates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, query.data, settled, kind, onPick, open]);

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);
  const waiting = !!trimmed && (settled !== trimmed || query.isFetching) && !flat.length;

  const focusWith = useCallback((text: string) => {
    setQ(text);
    setOpen(true);
    setActive(0);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(text.length, text.length);
      }
    });
  }, []);

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => inputRef.current?.focus());
  }, [autoFocus]);

  useEffect(() => {
    if (!slashFocus) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashFocus]);

  useEffect(() => {
    if (!channel) return;
    return onSearchFill(fill => {
      if (fill.channel === channel) focusWith(fill.q);
    });
  }, [channel, focusWith]);

  const go = (item: SearchItem) => {
    setOpen(false);
    if (onPick) {
      setQ('');
      onPick(item);
      return;
    }
    rememberRecent(item);
    setQ('');
    inputRef.current?.blur();
    navigate(item.href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(a => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      const item = flat[active];
      if (item) {
        e.preventDefault();
        go(item);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.currentTarget.blur();
      onEscape?.();
    }
  };

  let index = 0;
  const optionId = (i: number) => `${listId}-o${i}`;

  return (
    <div className="cv-search">
      <label className="cv-search-field">
        <MagnifierIcon />
        <span className="cv-visually-hidden">{label}</span>
        <input
          ref={inputRef}
          value={q}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {slashFocus && !q && <kbd className="cv-kbd" aria-hidden="true">/</kbd>}
      </label>
      {open && (
        <div className="cv-search-list" id={listId} role="listbox" aria-label="Suggestions">
          {groups.map(g => (
            <div key={g.title} role="group" aria-label={g.title}>
              <div className="cv-search-group" aria-hidden="true">{g.title}</div>
              {g.items.map(it => {
                const i = index++;
                return (
                  <a
                    key={it.key}
                    id={optionId(i)}
                    href={it.href}
                    role="option"
                    aria-selected={i === active}
                    className="cv-search-item"
                    // mousedown, not click: runs before the input's blur closes the list.
                    onMouseDown={e => {
                      e.preventDefault();
                      go(it);
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className={it.strong ? 'cv-search-item-label cv-search-item-label--strong' : 'cv-search-item-label'}>
                      {it.label}
                    </span>
                    {it.tag && <span className="cv-tour-tag">{it.tag}</span>}
                    {it.sub && <span className="cv-search-item-sub">{it.sub}</span>}
                  </a>
                );
              })}
            </div>
          ))}
          {waiting && <div className="cv-search-hint">Searching…</div>}
          {query.isError && trimmed && <div className="cv-search-hint">Search is unavailable right now.</div>}
          {!!trimmed && !waiting && !query.isError && !flat.length && (
            <div className="cv-search-note">
              No player or tournament matches “{trimmed}” —{' '}
              <Link to="/lab" onMouseDown={e => e.preventDefault()} onClick={() => setOpen(false)}>
                try asking the Lab
              </Link>
            </div>
          )}
          {!trimmed && !flat.length && (
            <div className="cv-search-hint">
              {kind === 'players' ? 'Type a player’s name.' : kind === 'tournaments'
                ? 'Type a tournament.'
                : 'Type a player, a tournament, or two names for a matchup.'}
            </div>
          )}
          <div className="cv-search-keys" aria-hidden="true">
            <span>↑ ↓ move</span>
            <span>Enter open</span>
            <span>Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
