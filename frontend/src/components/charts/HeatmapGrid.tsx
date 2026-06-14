import type { HeatmapCell } from '../../types/tennis';

interface Props {
  data: HeatmapCell[];
  title?: string;
}

function cellClass(pct: number): string {
  if (pct >= 70) return 'ba-heat-5';
  if (pct >= 60) return 'ba-heat-4';
  if (pct >= 50) return 'ba-heat-3';
  if (pct >= 40) return 'ba-heat-2';
  return 'ba-heat-1';
}

const SURFACE_ORDER = ['Hard', 'Clay', 'Grass', 'Carpet'];
const LEVEL_ORDER = [
  'Grand Slam', 'Masters 1000', 'ATP 250/500', 'WTA 500', 'WTA 250',
  'Tour Finals', 'Olympics', 'Davis Cup', 'BJK Cup', 'WTA',
  'Challenger', 'ITF', 'Satellite/ITF',
];

export default function HeatmapGrid({ data, title = 'Win % by Surface & Level' }: Props) {
  if (!data.length) return null;

  const surfaces = [...new Set(data.map(d => d.surface))]
    .sort((a, b) => {
      const ai = SURFACE_ORDER.indexOf(a);
      const bi = SURFACE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const levels = [...new Set(data.map(d => d.level_name))]
    .sort((a, b) => {
      const ai = LEVEL_ORDER.indexOf(a);
      const bi = LEVEL_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const lookup = new Map(data.map(d => [`${d.surface}|${d.level_name}`, d]));

  // Compute row totals (per surface)
  const rowTotals = new Map(surfaces.map(surf => {
    const cells = data.filter(d => d.surface === surf);
    const wins = cells.reduce((s, c) => s + c.wins, 0);
    const total = cells.reduce((s, c) => s + c.total, 0);
    return [surf, { wins, total, pct: total > 0 ? Math.round(wins / total * 100 * 10) / 10 : 0 }];
  }));

  // Compute column totals (per level)
  const colTotals = new Map(levels.map(lev => {
    const cells = data.filter(d => d.level_name === lev);
    const wins = cells.reduce((s, c) => s + c.wins, 0);
    const total = cells.reduce((s, c) => s + c.total, 0);
    return [lev, { wins, total, pct: total > 0 ? Math.round(wins / total * 100 * 10) / 10 : 0 }];
  }));

  const grandWins = data.reduce((s, c) => s + c.wins, 0);
  const grandTotal = data.reduce((s, c) => s + c.total, 0);
  const grandPct = grandTotal > 0 ? Math.round(grandWins / grandTotal * 100 * 10) / 10 : 0;

  return (
    <div>
      <h3 className="ba-h3 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="text-xs border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th className="pr-3 py-1 text-[var(--mute)] font-normal text-right text-[10px] ba-mono">Surf ↓ / Level →</th>
              {levels.map(l => (
                <th key={l} className="px-2 py-1 text-[var(--ink-2)] font-medium text-center whitespace-nowrap min-w-[72px] ba-mono">
                  {l}
                </th>
              ))}
              <th className="px-2 py-1 text-[var(--ink)] font-semibold text-center whitespace-nowrap min-w-[64px] border-l border-[var(--rule)] ba-mono">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map(surf => (
              <tr key={surf}>
                <td className="pr-3 py-1 text-[var(--ink-2)] font-semibold text-right whitespace-nowrap">{surf}</td>
                {levels.map(lev => {
                  const cell = lookup.get(`${surf}|${lev}`);
                  if (!cell) {
                    return (
                      <td key={lev} className="px-2 py-2 text-center text-[var(--mute)] rounded-[2px] bg-[var(--paper-3)] text-[10px]">—</td>
                    );
                  }
                  return (
                    <td key={lev} className={`px-2 py-1.5 text-center rounded-[2px] font-medium ${cellClass(cell.win_pct)}`}>
                      <div className="text-sm font-bold ba-mono">{cell.win_pct}%</div>
                      <div className="text-[10px] opacity-75 ba-mono">{cell.wins}–{cell.total - cell.wins}</div>
                    </td>
                  );
                })}
                {/* Row total */}
                {(() => {
                  const t = rowTotals.get(surf)!;
                  return (
                    <td className={`px-2 py-1.5 text-center rounded-[2px] font-semibold border-l border-[var(--rule)] ${cellClass(t.pct)}`}>
                      <div className="text-sm font-bold ba-mono">{t.pct}%</div>
                      <div className="text-[10px] opacity-75 ba-mono">{t.wins}–{t.total - t.wins}</div>
                    </td>
                  );
                })()}
              </tr>
            ))}
            {/* Column totals row */}
            <tr className="border-t border-[var(--rule)]">
              <td className="pr-3 py-1 text-[var(--ink)] font-semibold text-right whitespace-nowrap ba-mono">Total</td>
              {levels.map(lev => {
                const t = colTotals.get(lev)!;
                return (
                  <td key={lev} className={`px-2 py-1.5 text-center rounded-[2px] font-semibold ${cellClass(t.pct)}`}>
                    <div className="text-sm font-bold ba-mono">{t.pct}%</div>
                    <div className="text-[10px] opacity-75 ba-mono">{t.wins}–{t.total - t.wins}</div>
                  </td>
                );
              })}
              {/* Grand total */}
              <td className={`px-2 py-1.5 text-center rounded-[2px] font-bold border-l border-[var(--rule)] ${cellClass(grandPct)}`}>
                <div className="text-sm font-bold ba-mono">{grandPct}%</div>
                <div className="text-[10px] opacity-75 ba-mono">{grandWins}–{grandTotal - grandWins}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 mt-3 text-[10px] text-[var(--mute)] flex-wrap ba-mono">
        {[
          { cls: 'ba-heat-1', label: '< 40%' },
          { cls: 'ba-heat-2', label: '40–50%' },
          { cls: 'ba-heat-3', label: '50–60%' },
          { cls: 'ba-heat-4', label: '60–70%' },
          { cls: 'ba-heat-5', label: '> 70%' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-[2px] inline-block ${cls}`} />
            {label}
          </span>
        ))}
        <span className="ml-1">(min. 5 matches per cell)</span>
      </div>
    </div>
  );
}
