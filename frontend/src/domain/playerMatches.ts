import { roundRank, normalizeRound } from '../domain/rounds';
import type { PlayerMatchRow } from '../types/tennis';

export function hasRetirement(score?: string | null): boolean {
  return (score ?? '').toLowerCase().includes('ret');
}

export function hasWalkover(score?: string | null): boolean {
  const s = (score ?? '').toLowerCase();
  return s.includes('w/o') || s.includes('wo');
}

export function weekDate(dateStr?: string | null): string {
  return dateStr?.slice(0, 10) ?? '—';
}

/**
 * Best stage reached in a tournament run: 'W' for winning the final,
 * otherwise the latest round played, suffixed with (w/o)/(ret.) when the
 * decisive match ended that way. Ties on round are broken by latest date.
 */
export function stageResult(matches: PlayerMatchRow[]): string {
  if (!matches.length) return '—';
  let best = matches[0];
  for (const m of matches) {
    const bestRank = roundRank(best.round);
    const thisRank = roundRank(m.round);
    if (thisRank > bestRank) {
      best = m;
      continue;
    }
    if (thisRank === bestRank) {
      const bestDate = best.date ?? '';
      const thisDate = m.date ?? '';
      if (thisDate > bestDate) best = m;
    }
  }

  const bestRound = normalizeRound(best.round);
  const base = bestRound === 'F' && best.result === 'W' ? 'W' : (bestRound || '—');
  if (hasWalkover(best.score)) return `${base} (w/o)`;
  if (hasRetirement(best.score)) return `${base} (ret.)`;
  return base;
}

export interface TournamentGroup {
  key: string;
  tournament: string;
  year: string;
  matches: PlayerMatchRow[];
  latestDate: string | null;
  earliestDate: string | null;
  result: string;
  week: string;
}

/** Group a recent-matches list into tournament runs, preserving input order. */
export function groupMatchesByTournament(recentMatches: PlayerMatchRow[]): TournamentGroup[] {
  if (!recentMatches.length) return [];
  const grouped: TournamentGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const m of recentMatches) {
    const year = m.date?.slice(0, 4) ?? '—';
    const key = `${m.tournament}|${year}`;
    const idx = indexByKey.get(key);
    if (idx == null) {
      indexByKey.set(key, grouped.length);
      grouped.push({ key, tournament: m.tournament, year, matches: [m], latestDate: m.date ?? null, earliestDate: m.date ?? null, result: '—', week: '—' });
    } else {
      const g = grouped[idx];
      g.matches.push(m);
      if (m.date && (!g.latestDate || m.date > g.latestDate)) g.latestDate = m.date;
      if (m.date && (!g.earliestDate || m.date < g.earliestDate)) g.earliestDate = m.date;
    }
  }

  for (const g of grouped) {
    g.result = stageResult(g.matches);
    g.week = weekDate(g.earliestDate);
  }

  return grouped;
}
