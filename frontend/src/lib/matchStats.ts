/**
 * Extended per-match stat math — single source of truth for the breakdown
 * shown wherever a match row expands (Search, H2H, Player recent matches,
 * Records superlatives).
 *
 * Return%/Total% require BOTH players' serve lines, so callers must pass the
 * focal player's stats (`a`) and the opponent's (`b`).
 */
export interface SideStats {
  aces: number | null;
  dfs: number | null;
  pts: number | null;      // service points played
  firsts: number | null;   // first serves in
  fwon: number | null;     // first-serve points won
  swon: number | null;     // second-serve points won
  saved: number | null;    // break points saved
  chances: number | null;  // break points faced
}

const pct = (n: number | null, d: number | null) =>
  n != null && d != null && d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—';

const num = (v: number | null) => (v == null ? '—' : String(v));

// Service points won by the OTHER player on their serve = fwon + swon.
// Return points won by `self` = opponent's serve points lost.
const servePtsWon = (s: SideStats) =>
  s.fwon != null && s.swon != null ? s.fwon + s.swon : null;

const returnPct = (opp: SideStats) => {
  const oppWon = servePtsWon(opp);
  return oppWon != null && opp.pts != null && opp.pts > 0
    ? `${(((opp.pts - oppWon) / opp.pts) * 100).toFixed(1)}%`
    : '—';
};

// Total points WON by `self` = own service points won + own return points won.
const totalWon = (self: SideStats, opp: SideStats) => {
  const selfServe = servePtsWon(self);
  const oppServe = servePtsWon(opp);
  if (selfServe == null || oppServe == null || opp.pts == null) return '—';
  return String(selfServe + (opp.pts - oppServe));
};

const second = (s: SideStats) => (s.pts != null && s.firsts != null ? s.pts - s.firsts : null);

export function hasStats(s: SideStats): boolean {
  return s.pts != null;
}

export function matchStatRows(a: SideStats, b: SideStats): { label: string; va: string; vb: string }[] {
  return [
    { label: 'Aces',            va: num(a.aces), vb: num(b.aces) },
    { label: 'Double Faults',   va: num(a.dfs),  vb: num(b.dfs) },
    { label: '1st In%',         va: pct(a.firsts, a.pts),        vb: pct(b.firsts, b.pts) },
    { label: '1st Won%',        va: pct(a.fwon, a.firsts),       vb: pct(b.fwon, b.firsts) },
    { label: '2nd Won%',        va: pct(a.swon, second(a)),      vb: pct(b.swon, second(b)) },
    { label: 'Return Pts Won%', va: returnPct(b),                vb: returnPct(a) },
    { label: 'Total Pts Won',   va: totalWon(a, b),              vb: totalWon(b, a) },
    { label: 'BP Saved',        va: `${num(a.saved)}/${num(a.chances)}`, vb: `${num(b.saved)}/${num(b.chances)}` },
  ];
}
