/** Splits: how the player does by opponent, situation and stage (brief › Player › 5). */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlayerFilterParams, SplitRow } from '../../api/player';
import MatchList from '../../components/MatchRow';
import Section from '../../components/Section';
import { BlockError, Skeleton, SkeletonRows } from '../../components/States';
import { fmtPct, LOW_SAMPLE } from '../../lib/format';
import { labHref } from '../../lib/labSql';
import { fromRelationalRow } from '../../lib/matches';
import { useSplitMatches, useSplits } from './data';

function SplitCell({ wins, losses, pct }: { wins: number; losses: number; pct: number | null }) {
  const total = wins + losses;
  if (!total) {
    return <span className="pl-split-cell"><span className="pl-split-pct cv-muted">—</span><span className="pl-split-wl">0–0</span></span>;
  }
  const low = total < LOW_SAMPLE;
  return (
    <span className={low ? 'pl-split-cell pl-split-cell--low' : 'pl-split-cell'} title={`${wins}–${losses} · ${total} matches${low ? ' · fewer than 10 matches' : ''}`}>
      <span className="pl-split-pct">{fmtPct(pct)}</span>
      <span className="pl-split-wl">{wins}–{losses}</span>
      {low && <span className="cv-low-sample" style={{ fontSize: 11 }}>low sample</span>}
    </span>
  );
}

function SplitMatches({ params, row }: { params: PlayerFilterParams; row: SplitRow }) {
  const q = useSplitMatches(params, row.params, true);
  return (
    <div className="pl-split-open">
      {q.isPending && <SkeletonRows rows={3} />}
      {q.isError && <BlockError message="These matches didn’t load." onRetry={() => q.refetch()} />}
      {q.data && q.data.matches.length > 0 && <MatchList matches={q.data.matches.map(fromRelationalRow)} showHeader={false} />}
      <div className="pl-split-foot">
        <span className="cv-muted">
          {q.data && q.data.matches.length > 0
            ? `Latest ${q.data.matches.length} of ${row.summary.total} matches in this split`
            : q.data ? 'No matches in this split.' : ''}
        </span>
        <Link to={labHref(row.lab_sql)} style={{ fontWeight: 600 }}>Open in Lab →</Link>
      </div>
    </div>
  );
}

export default function Splits({ params, surname, scope }: { params: PlayerFilterParams; surname: string; scope: string }) {
  const q = useSplits(params);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Section id="splits" title="Splits" question={`How does ${surname} do in specific situations? Open a row for the matches behind it.`} note={scope}>
      {q.isPending && <Skeleton><div className="cv-block-skel" style={{ height: 520 }} /></Skeleton>}
      {q.isError && <BlockError message="Splits didn’t load. Other blocks are unaffected." onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="pl-splits-head" aria-hidden="true">
            <span style={{ flex: '1 1 240px' }} />
            <div className="pl-split-cells"><span>Career</span><span>Last 5 years</span><span>Last 52 weeks</span><span /></div>
          </div>
          {q.data.groups.map(g => (
            <div key={g.id} role="group" aria-label={g.title}>
              <div className="pl-split-group">{g.title}</div>
              {g.rows.map(row => {
                const isOpen = open === row.id;
                const s = row.summary;
                const toggle = () => setOpen(isOpen ? null : row.id);
                return (
                  <div key={row.id} className="pl-split">
                    <div className="pl-split-main" onClick={toggle}>
                      <span className="pl-split-label">{row.label}</span>
                      <div className="pl-split-cells">
                        <SplitCell wins={s.wins} losses={s.losses} pct={s.win_pct} />
                        <SplitCell wins={s.y5_wins} losses={s.y5_losses} pct={s.y5_win_pct} />
                        <SplitCell wins={s.w52_wins} losses={s.w52_losses} pct={s.w52_win_pct} />
                        <button
                          type="button"
                          className="pl-icon-toggle"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Hide' : 'Show'} matches ${row.label.toLowerCase()}`}
                          onClick={e => {
                            e.stopPropagation();
                            toggle();
                          }}
                        >
                          {isOpen ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>
                    {isOpen && <SplitMatches params={params} row={row} />}
                  </div>
                );
              })}
            </div>
          ))}
          <p className="pl-small-note">
            Low sample = fewer than 10 matches. Walkovers are excluded; retirements count, except in the set-by-set situations.
            “Last 5 years” and “last 52 weeks” count back from today.
          </p>
        </>
      )}
    </Section>
  );
}
