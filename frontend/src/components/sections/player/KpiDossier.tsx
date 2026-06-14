import type { ReactNode } from 'react';
import type { PlayerForm, PlayerSummary, TopNRecords } from '../../../types/tennis';

function DossierCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="bg-[var(--bone-2)] px-4 py-4 flex flex-col justify-start min-h-[112px]">
      <div className="ba-mono text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--mute)] mb-2">{label}</div>
      <div className="ba-stat-sm text-[var(--ink)]">{value}</div>
      {sub && <div className="ba-mono text-[11px] text-[var(--ink-2)] mt-1.5">{sub}</div>}
    </div>
  );
}

export function KpiDossier({
  filteredWins,
  filteredLosses,
  filteredWinPct,
  summary,
  topN,
  playerForm,
}: {
  filteredWins: number;
  filteredLosses: number;
  filteredWinPct: string;
  summary: PlayerSummary;
  topN?: TopNRecords;
  playerForm?: PlayerForm;
}) {
  return (
    <section className="border border-[var(--rule)] border-t-2 border-t-[var(--ink)] overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-5 bg-[var(--rule)] gap-px">
        <div className="col-span-2 lg:col-span-1 lg:row-span-2 ba-kpi px-6 py-6 flex flex-col justify-center">
          <div className="ba-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--bone)]/80 mb-3">Win Rate</div>
          <div className="ba-stat text-[var(--bone)]">{filteredWinPct}%</div>
          <div className="ba-mono text-[12px] text-[var(--bone)]/70 mt-3">{filteredWins}W – {filteredLosses}L</div>
        </div>
        <DossierCell label="Peak Rank" value={summary.career_high_rank ? `#${summary.career_high_rank}` : '—'} />
        <DossierCell
          label="Titles"
          value={String(summary.gs_titles + summary.tour_titles + summary.challenger_titles + summary.itf_titles)}
          sub={[
            summary.gs_titles > 0 ? `${summary.gs_titles} GS` : null,
            summary.tour_titles > 0 ? `${summary.tour_titles} Tour` : null,
            summary.challenger_titles > 0 ? `${summary.challenger_titles} Chall` : null,
            summary.itf_titles > 0 ? `${summary.itf_titles} ITF` : null,
          ].filter(Boolean).join(' · ') || undefined}
        />
        <DossierCell label="vs Top 10" value={topN?.top10?.['W-L'] ?? '—'} sub={topN?.top10 ? `${topN.top10['win%']}%` : undefined} />
        <DossierCell label="vs Top 50" value={topN?.top50?.['W-L'] ?? '—'} sub={topN?.top50 ? `${topN.top50['win%']}%` : undefined} />
        <DossierCell label="Last 10" value={playerForm ? `${playerForm.last10.wins}–${playerForm.last10.losses}` : '—'} />
        <DossierCell label="Last 20" value={playerForm ? `${playerForm.last20.wins}–${playerForm.last20.losses}` : '—'} />
        <DossierCell label="52 Weeks" value={playerForm ? `${playerForm.last52w.wins}–${playerForm.last52w.losses}` : '—'} sub={playerForm?.last52w.win_pct != null ? `${playerForm.last52w.win_pct}%` : undefined} />
        <DossierCell label="Matches" value={summary.total.toLocaleString()} />
      </div>
    </section>
  );
}
