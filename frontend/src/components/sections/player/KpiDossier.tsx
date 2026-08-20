import type { ReactNode } from 'react';
import type { PlayerForm, PlayerSummary, TopNRecords } from '../../../types/tennis';

function DossierCell({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="bg-paper-raised px-[var(--space-sm)] py-[var(--space-xs)] flex flex-col">
      <div className="ba-label mb-1">{label}</div>
      <div className="ba-stat-sm text-ink">{value}</div>
      {sub && <div className="ba-mono ba-agate text-mute mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * The dossier: win rate as a full-bleed clay panel, then the supporting
 * figures on a hairline grid beneath it.
 *
 * The win rate used to be one cell among five, which made a page of eight
 * equally sized numbers and no way to tell which one answered the question
 * the reader arrived with. Giving it the full measure and the hero figure size
 * is the scale contrast the rest of the page reads against.
 *
 * Gaps over a rule-coloured ground make the rules, so the grid stays correct
 * however it wraps.
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
  /** Already formatted, sign included — "83.0%" or "—". */
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
    <section>
      {/* The figure the reader came for, at the size that says so. */}
      <div className="ba-kpi ba-kpi-hero flex flex-wrap items-end justify-between gap-x-[var(--space-lg)] gap-y-[var(--space-xs)]">
        <div>
          <div className="ba-label text-on-clay-soft mb-1.5">Win rate</div>
          <div className="ba-stat-hero text-spark">{filteredWinPct}</div>
        </div>
        <div className="ba-mono ba-cell text-on-clay-soft pb-1">
          {filteredWins}W – {filteredLosses}L
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border-b border-rule">
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
      </div>
    </section>
  );
}
