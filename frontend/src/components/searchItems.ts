/** Turn /api/directory/suggest results into the grouped list SearchBox renders. */
import type { DirectoryPlayer, DirectoryTournament, Suggestions } from '../api/directory';
import { tourLabel } from '../lib/format';
import { playerPath, tournamentPath, versusPath } from '../lib/slug';

export interface SearchItem {
  key: string;
  label: string;
  /** Matchup and tournament-year rows are set in a heavier weight. */
  strong?: boolean;
  tag?: string;
  sub: string;
  href: string;
  /** Set on player rows, for pickers that take a player rather than navigate. */
  player?: DirectoryPlayer;
}

export interface SearchGroup {
  title: string;
  items: SearchItem[];
}

export type SearchKind = 'all' | 'players' | 'tournaments';

const lastName = (name: string) => name.split(' ').slice(-1)[0];

function span(first: number | null, last: number | null): string {
  if (first == null || last == null) return '';
  return first === last ? String(first) : `${first}–${last}`;
}

export function playerItem(p: DirectoryPlayer): SearchItem {
  const sub = [p.country, span(p.first_year, p.last_year), p.career_high ? `career high #${p.career_high}` : '']
    .filter(Boolean)
    .join(' · ');
  return {
    key: `p:${p.tour}:${p.name}`, label: p.name, tag: tourLabel(p.tour), sub,
    href: playerPath(p.name), player: p,
  };
}

function tournamentItem(t: DirectoryTournament): SearchItem {
  return {
    key: `t:${t.tour}:${t.name}`, label: t.name, tag: tourLabel(t.tour),
    sub: [t.level_name, span(t.first_year, t.last_year)].filter(Boolean).join(' · '),
    href: tournamentPath(t.name, t.last_year ?? '', t.tour),
  };
}

const PLAYER_LIMIT = 5;
const TOURNAMENT_LIMIT = 4;

export function groupSuggestions(s: Suggestions, kind: SearchKind): SearchGroup[] {
  const groups: SearchGroup[] = [];

  if (kind === 'all' && s.matchup) {
    const { a, b, tour } = s.matchup;
    groups.push({
      title: 'Matchup',
      items: [{
        key: `m:${a.name}:${b.name}`, label: `${lastName(a.name)} vs ${lastName(b.name)}`, strong: true,
        tag: tourLabel(tour), sub: `${a.name} and ${b.name} · head-to-head`, href: versusPath(a.name, b.name),
      }],
    });
  }

  if (kind !== 'players' && s.tournament_years.length) {
    groups.push({
      title: 'Tournament',
      items: s.tournament_years.map(t => ({
        key: `ty:${t.tour}:${t.name}:${t.year}`, label: `${t.name} ${t.year}`, strong: true,
        tag: tourLabel(t.tour), sub: t.level_name ?? '', href: tournamentPath(t.name, t.year, t.tour),
      })),
    });
  }

  if (kind !== 'tournaments' && !s.matchup) {
    const atp = s.players.filter(p => p.tour === 'M').slice(0, PLAYER_LIMIT);
    const wta = s.players.filter(p => p.tour === 'F').slice(0, PLAYER_LIMIT);
    if (atp.length) groups.push({ title: 'ATP players', items: atp.map(playerItem) });
    if (wta.length) groups.push({ title: 'WTA players', items: wta.map(playerItem) });
  }

  if (kind !== 'players' && !s.matchup && !s.tournament_years.length) {
    const events = s.tournaments.slice(0, kind === 'tournaments' ? 8 : TOURNAMENT_LIMIT);
    if (events.length) groups.push({ title: 'Tournaments', items: events.map(tournamentItem) });
  }

  return groups;
}

// ── Recent searches (this browser only) ────────────────────────────────────

const RECENT_KEY = 'cv-recent';
const RECENT_MAX = 5;

type Recent = Pick<SearchItem, 'key' | 'label' | 'sub' | 'href' | 'tag'>;

export function readRecent(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(r => r && typeof r.href === 'string' && typeof r.label === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberRecent(item: SearchItem): void {
  const entry: Recent = { key: item.key, label: item.label, sub: item.sub, href: item.href, tag: item.tag };
  const next = [entry, ...readRecent().filter(r => r.href !== item.href)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode: nothing to remember */
  }
}
