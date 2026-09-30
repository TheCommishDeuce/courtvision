/** Pure helpers for the Player page charts (DESIGN.md › Player › Career shape). */
import type { HeatmapCell, RankHistoryPoint } from '../../types/tennis';

export const ordinal = (n: number): string => {
  const r = Math.floor(n);
  const s = r % 100 >= 11 && r % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[r % 10] ?? 'th';
  return `${r}${s}`;
};

/** Heat tint for a win %: color-mix share of the accent, 4–42%. */
export const heatShare = (winPct: number): number => Math.max(4, Math.min(42, (winPct - 40) * 0.8));

// ── Ranking trajectory ─────────────────────────────────────────────────────

export type RankScale = 'log' | 'top100';

const W = 1000;
const H = 200;
const t = (iso: string) => Date.parse(iso.slice(0, 10));

export interface RankChart {
  path: string;
  gridlines: { label: string; top: number }[]; // top: 0–100 (%)
  xTicks: { label: string; left: number }[]; // left: 0–100 (%)
  dot: { left: number; top: number } | null;
}

export function rankChart(points: RankHistoryPoint[], scale: RankScale, shortYears = false): RankChart {
  const pts = points.filter(p => p.rank > 0 && Number.isFinite(t(p.date)));
  if (!pts.length) return { path: '', gridlines: [], xTicks: [], dot: null };
  const t0 = t(pts[0].date);
  const t1 = Math.max(t(pts[pts.length - 1].date), t0 + 1);
  const x = (iso: string) => ((t(iso) - t0) / (t1 - t0)) * W;

  const worst = Math.max(...pts.map(p => p.rank));
  const ceiling = Math.max(10, 10 ** Math.ceil(Math.log10(Math.max(worst, 2))));
  const y = scale === 'log'
    ? (r: number) => (Math.log10(r) / Math.log10(ceiling)) * H
    : (r: number) => ((r - 1) / 99) * H;

  let path = '';
  let pen = false;
  for (const p of pts) {
    if (scale === 'top100' && p.rank > 100) {
      pen = false;
      continue;
    }
    path += `${pen ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.rank).toFixed(1)} `;
    pen = true;
  }

  const levels = scale === 'log'
    ? [1, 10, 100, 1000, 10000].filter(v => v <= ceiling)
    : [1, 25, 50, 75, 100];
  const gridlines = levels.map(v => ({ label: v === 1 ? '#1' : v.toLocaleString('en-US'), top: (y(v) / H) * 100 }));

  const y0 = new Date(t0).getUTCFullYear();
  const y1 = new Date(t1).getUTCFullYear();
  const span = y1 - y0 + 1;
  const step = span > 20 ? 5 : span > 10 ? 2 : 1;
  const xTicks: { label: string; left: number }[] = [];
  for (let yr = y0; yr <= y1; yr += step) {
    const left = ((Date.UTC(yr, 6, 1) - t0) / (t1 - t0)) * 100;
    if (left >= -2 && left <= 102) {
      xTicks.push({ label: shortYears ? `’${String(yr).slice(2)}` : String(yr), left: Math.min(100, Math.max(0, left)) });
    }
  }

  const last = pts[pts.length - 1];
  const dot = scale === 'top100' && last.rank > 100 ? null : { left: (x(last.date) / W) * 100, top: (y(last.rank) / H) * 100 };
  return { path: path.trim(), gridlines, xTicks, dot };
}

/** Best and last rank per year, for the chart's table alternative. */
export function rankByYear(points: RankHistoryPoint[]): { year: string; best: number; last: number }[] {
  const out = new Map<string, { best: number; last: number }>();
  for (const p of points) {
    const year = p.date.slice(0, 4);
    const e = out.get(year) ?? { best: Infinity, last: p.rank };
    out.set(year, { best: Math.min(e.best, p.rank), last: p.rank });
  }
  return [...out].map(([year, v]) => ({ year, ...v }));
}

export const firstAtOrBetter = (points: RankHistoryPoint[], rank: number): RankHistoryPoint | undefined =>
  points.find(p => p.rank > 0 && p.rank <= rank);

// ── Surface × level grid ───────────────────────────────────────────────────

/** Level rows, biggest events first. Levels not listed sort after, alphabetically. */
const LEVEL_ORDER = [
  'Grand Slam', 'Tour Finals', 'Olympics', 'Masters 1000', 'ATP 250/500', 'WTA 500', 'WTA 250', 'WTA',
  'Davis Cup', 'BJK Cup', 'Challenger', 'ITF',
];
const SURFACE_ORDER = ['Hard', 'Clay', 'Grass', 'Carpet'];

export interface GridCell {
  wins: number;
  total: number;
}

export interface Grid {
  surfaces: string[];
  rows: { level: string; cells: (GridCell | null)[]; all: GridCell }[];
  totals: { cells: (GridCell | null)[]; all: GridCell };
}

export function surfaceLevelGrid(cells: HeatmapCell[]): Grid {
  const has = (s: string) => cells.some(c => c.surface === s && c.total > 0);
  // Hard, clay and grass always; carpet only for careers that include it.
  const surfaces = SURFACE_ORDER.filter(s => s !== 'Carpet' || has('Carpet'));
  const levels = [...new Set(cells.filter(c => c.total > 0).map(c => c.level_name))].sort((a, b) => {
    const ia = LEVEL_ORDER.indexOf(a);
    const ib = LEVEL_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const sum = (list: HeatmapCell[]): GridCell => ({
    wins: list.reduce((a, c) => a + c.wins, 0),
    total: list.reduce((a, c) => a + c.total, 0),
  });
  const pick = (surface: string, level: string) => {
    const c = sum(cells.filter(x => x.surface === surface && x.level_name === level));
    return c.total ? c : null;
  };
  return {
    surfaces,
    rows: levels.map(level => ({
      level,
      cells: surfaces.map(s => pick(s, level)),
      all: sum(cells.filter(c => c.level_name === level)),
    })),
    totals: {
      cells: surfaces.map(s => {
        const c = sum(cells.filter(x => x.surface === s));
        return c.total ? c : null;
      }),
      all: sum(cells),
    },
  };
}
