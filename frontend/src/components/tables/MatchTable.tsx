import { useState } from 'react';
import type { MatchRow } from '../../types/tennis';
import { fmtTime, surfaceClass } from '../../utils';

const STAT_META: Record<string, { label: string; unit: string }> = {
  w_aces:           { label: 'W Aces',      unit: '' },
  l_aces:           { label: 'L Aces',      unit: '' },
  w_dfs:            { label: 'W DFs',       unit: '' },
  l_dfs:            { label: 'L DFs',       unit: '' },
  w_first_in_pct:   { label: 'W 1st In%',   unit: '%' },
  l_first_in_pct:   { label: 'L 1st In%',   unit: '%' },
  w_first_won_pct:  { label: 'W 1st W%',    unit: '%' },
  l_first_won_pct:  { label: 'L 1st W%',    unit: '%' },
  w_second_won_pct: { label: 'W 2nd W%',    unit: '%' },
  l_second_won_pct: { label: 'L 2nd W%',    unit: '%' },
  w_bp_saved_pct:   { label: 'W BP Sv%',    unit: '%' },
  l_bp_saved_pct:   { label: 'L BP Sv%',    unit: '%' },
};

function fmtStat(val: number | null | undefined, unit: string): string {
  if (val == null) return '—';
  return unit ? `${val}${unit}` : String(val);
}

interface Props {
  matches: MatchRow[];
  pageSize?: number;
  visibleStats?: string[];
}

export default function MatchTable({ matches, pageSize = 50, visibleStats = [] }: Props) {
  const [page, setPage] = useState(0);
  const total = matches.length;
  const pages = Math.ceil(total / pageSize);
  const slice = matches.slice(page * pageSize, (page + 1) * pageSize);

  const statCols = visibleStats.filter(k => k in STAT_META);

  return (
    <div>
      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {slice.map((m, i) => (
          <div
            key={i}
            className={`border p-3 text-sm ${m.is_upset ? 'bg-[color-mix(in_oklab,var(--clay)_6%,transparent)] border-l-[3px] border-l-[var(--clay)] border-t-[var(--rule)] border-r-[var(--rule)] border-b-[var(--rule)]' : 'bg-[var(--bone-2)] border-[var(--rule)]'}`}
          >
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <span className={`font-semibold truncate ${m.is_upset ? 'text-[var(--clay)]' : 'text-[var(--ink)]'}`}>{m.winner_name}</span>
              {m.winner_rank && <span className="text-[var(--mute)] ba-mono text-[11px] shrink-0">#{m.winner_rank}</span>}
            </div>
            <div className="text-[12px] text-[var(--ink-2)] mb-1">
              <span className="ba-mono text-[var(--mute)] text-[11px] mr-1">def</span>
              {m.loser_name}{m.loser_rank ? <span className="ba-mono text-[var(--mute)] text-[11px] ml-1">#{m.loser_rank}</span> : ''}
            </div>
            <div className="ba-mono text-[12px] text-[var(--ink)] mb-2">{m.score}</div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[var(--mute)] ba-mono items-center">
              <span>{m.date?.slice(0, 10)}</span>
              <span className="text-[var(--rule)]">·</span>
              <span className="truncate max-w-[180px]">{m.tournament}</span>
              <span className="text-[var(--rule)]">·</span>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${surfaceClass(m.surface)}`}>{m.surface}</span>
              <span className="text-[var(--rule)]">·</span>
              <span>{m.round}</span>
              {m.time ? <><span className="text-[var(--rule)]">·</span><span>{fmtTime(m.time)}</span></> : null}
            </div>
            {statCols.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--rule)] grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px]">
                {statCols.map(key => {
                  const meta = STAT_META[key];
                  const val = (m as unknown as Record<string, unknown>)[key] as number | null | undefined;
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-[var(--mute)]">{meta.label}</span>
                      <span className="ba-mono text-[var(--ink-2)]">{fmtStat(val, meta.unit)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block ba-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--rule)] bg-[var(--bone-2)]">
                {['Date', 'Tournament', 'Surf', 'Level', 'Rnd', 'Winner', 'WR', 'Loser', 'LR', 'Score', 'Time'].map(h => (
                  <th key={h} className="px-3 py-2 ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--ink)] text-left whitespace-nowrap">{h}</th>
                ))}
                {statCols.map(key => (
                  <th key={key} className="px-2 py-2 ba-mono text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--clay)] text-left whitespace-nowrap">
                    {STAT_META[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((m, i) => (
                <tr
                  key={i}
                  className={`border-b border-[var(--rule)] last:border-b-0 ${m.is_upset ? 'bg-[color-mix(in_oklab,var(--clay)_6%,transparent)]' : ''}`}
                >
                  <td className="px-3 py-1.5 whitespace-nowrap text-[var(--mute)] ba-mono text-[11px]">{m.date?.slice(0, 10)}</td>
                  <td className="px-3 py-1.5 max-w-[200px] truncate text-[12.5px] text-[var(--ink)]">{m.tournament}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 ba-mono text-[9.5px] font-bold uppercase tracking-[0.12em] ${surfaceClass(m.surface)}`}>
                      {m.surface}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-[11.5px] text-[var(--ink-2)]">{m.level_name}</td>
                  <td className="px-3 py-1.5 ba-mono text-[11px] text-[var(--ink-2)]">{m.round}</td>
                  <td className={`px-3 py-1.5 font-semibold whitespace-nowrap text-[12.5px] ${m.is_upset ? 'text-[var(--clay)]' : 'text-[var(--ink)]'}`}>{m.winner_name}</td>
                  <td className="px-3 py-1.5 text-[var(--mute)] ba-mono text-[11px]">{m.winner_rank ?? '—'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-[12.5px] text-[var(--ink-2)]">{m.loser_name}</td>
                  <td className="px-3 py-1.5 text-[var(--mute)] ba-mono text-[11px]">{m.loser_rank ?? '—'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap ba-mono text-[11.5px] text-[var(--ink)]">{m.score}</td>
                  <td className="px-3 py-1.5 text-[var(--mute)] ba-mono text-[11px]">{fmtTime(m.time)}</td>
                  {statCols.map(key => {
                    const meta = STAT_META[key];
                    const val = (m as unknown as Record<string, unknown>)[key] as number | null | undefined;
                    return (
                      <td key={key} className="px-2 py-1.5 ba-mono text-[11px] text-[var(--ink-2)] whitespace-nowrap">
                        {fmtStat(val, meta.unit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pages > 1 && (
        <div className="flex gap-3 items-center mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="ba-btn ba-btn-ghost disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="ba-mono text-[11px] text-[var(--mute)]">Page {page + 1} / {pages} · {total} matches</span>
          <button
            disabled={page === pages - 1}
            onClick={() => setPage(p => p + 1)}
            className="ba-btn ba-btn-ghost disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
