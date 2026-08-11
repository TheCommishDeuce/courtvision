import type { ReactNode } from 'react';
import type { PlayerForm, PlayerSummary, TopNRecords } from '../../../types/tennis';

function DossierCell({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="bg-[var(--paper-raised)] px-3 py-2.5 flex flex-col">
      <div className="ba-label mb-1">{label}</div>
      <div className="ba-stat-sm text-[var(--ink)]">{value}</div>
      {sub && <div className="ba-mono text-[10.5px] text-[var(--mute)] mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * The dossier: win rate as the one clay block, then nine figures on a hairline
 * grid. Gaps over a rule-coloured ground make the rules, so the grid stays
 * correct however it wraps.
 */
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
  const titleBreakdown =
    [
      summary.gs_titles > 0 ? `${summary.gs_titles} GS` : null,
      summary.tour_titles > 0 ? `${summary.tour_titles} tour` : null,
      summary.challenger_titles > 0 ? `${summary.challenger_titles} ch` : null,
      summary.itf_titles > 0 ? `${summary.itf_titles} ITF` : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--rule)] border-t-2 border-[var(--ink)] border-b border-[var(--rule)]">
      <div className="col-span-2 lg:col-span-1 lg:row-span-2 ba-kpi px-4 py-4 flex flex-col justify-center">
        <div className="ba-label text-[var(--on-clay-soft)] mb-1.5">Win rate</div>
        <div className="ba-stat text-[var(--on-clay)]">{filteredWinPct}%</div>
        <div className="ba-mono text-[12px] text-[var(--on-clay-soft)] mt-1.5">
          {filteredWins}W – {filteredLosses}L
        </div>
      </div>

      <DossierCell
        label="Peak rank"
        value={summary.career_high_rank ? `#${summary.career_high_rank}` : '—'}
      />
      <DossierCell
        label="Titles"
        value={String(
          summary.gs_titles + summary.tour_titles + summary.challenger_titles + summary.itf_titles,
        )}
        sub={titleBreakdown}
      />
      <DossierCell
        label="vs top 10"
        value={topN?.top10?.['W-L'] ?? '—'}
        sub={topN?.top10 ? `${topN.top10['win%']}%` : undefined}
      />
      <DossierCell
        label="vs top 50"
        value={topN?.top50?.['W-L'] ?? '—'}
        sub={topN?.top50 ? `${topN.top50['win%']}%` : undefined}
      />
      <DossierCell
        label="Last 10"
        value={playerForm ? `${playerForm.last10.wins}–${playerForm.last10.losses}` : '—'}
      />
      <DossierCell
        label="Last 20"
        value={playerForm ? `${playerForm.last20.wins}–${playerForm.last20.losses}` : '—'}
      />
      <DossierCell
        label="52 weeks"
        value={playerForm ? `${playerForm.last52w.wins}–${playerForm.last52w.losses}` : '—'}
        sub={playerForm?.last52w.win_pct != null ? `${playerForm.last52w.win_pct}%` : undefined}
      />
      <DossierCell label="Matches" value={summary.total.toLocaleString()} />
    </section>
  );
}
