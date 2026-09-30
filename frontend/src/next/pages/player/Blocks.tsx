/** The smaller Player sections: record vs ranked opponents, serve and return, milestones, recent matches. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlayerFilterParams } from '../../api/player';
import MatchList from '../../components/MatchRow';
import Section from '../../components/Section';
import { BlockError, Skeleton, SkeletonRows } from '../../components/States';
import type { Filters } from '../../lib/filters';
import { fmtDate, fmtInt, fmtPct } from '../../lib/format';
import { labHref, playerMatchesSql } from '../../lib/labSql';
import { fromPlayerRow } from '../../lib/matches';
import { ordinal } from '../../lib/playerCharts';
import {
  useCareerSummary, useMilestones, useRecentMatches, useReturn, useReturnPct, useServe, useServePct, useTopN, type Who,
} from './data';

export function TopN({ params, surname, scope }: { params: PlayerFilterParams; surname: string; scope: string }) {
  const q = useTopN(params);
  return (
    <Section id="topn" title="Record against ranked opponents" question={`How does ${surname} do against the best?`} note={scope}>
      {q.isPending && <Skeleton><div className="cv-block-skel" style={{ height: 110 }} /></Skeleton>}
      {q.isError && <BlockError message="This record didn’t load." onRetry={() => q.refetch()} />}
      {q.data && (
        <div className="pl-topn">
          {([5, 10, 20, 50, 100] as const).map(n => {
            const r = q.data[`top${n}`];
            const [w, l] = (r?.['W-L'] ?? '0-0').split('-').map(Number);
            const total = w + l;
            return (
              <div key={n}>
                <div className="cv-muted" style={{ fontSize: 14 }}>vs top {n}</div>
                <div className="pl-topn-pct" style={total < 10 ? { color: 'var(--ink2)' } : undefined}>{total ? fmtPct(r?.['win%']) : '—'}</div>
                <div className="pl-meter" aria-hidden="true"><span style={{ width: `${total ? r?.['win%'] ?? 0 : 0}%` }} /></div>
                <div className="cv-muted" style={{ fontSize: 14 }}>
                  {w}–{l}{total > 0 && total < 10 && <> · <abbr className="cv-low-sample" title={`Only ${total} matches`}>low sample</abbr></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

interface SRRow {
  label: string;
  value: number | null | undefined;
  pct?: number | null;
  noPct?: boolean;
}

function SRTable({ title, rows }: { title: string; rows: SRRow[] }) {
  return (
    <div role="table" aria-label={title}>
      <div role="row" className="pl-sr-row pl-sr-row--head">
        <span role="columnheader" className="pl-sr-title">{title}</span>
        <span role="columnheader" style={{ textAlign: 'right' }}>Value</span>
        <span role="columnheader">Percentile</span>
        <span role="columnheader"><span className="cv-visually-hidden">Rank</span></span>
      </div>
      {rows.map(r => (
        <div role="row" key={r.label} className="pl-sr-row">
          <span role="rowheader">{r.label}</span>
          <span role="cell" className="pl-sr-value">{fmtPct(r.value)}</span>
          <span role="cell" className="pl-pctl" aria-label={r.pct == null ? 'No percentile' : `${ordinal(r.pct)} percentile`}>
            <span className="pl-pctl-median" />
            {r.pct != null && <span className="pl-pctl-fill" style={{ width: `${r.pct}%` }} />}
          </span>
          <span role="cell" className="pl-ord">{r.pct == null ? '—' : ordinal(r.pct)}</span>
        </div>
      ))}
    </div>
  );
}

export function ServeReturn({ who, params, scope }: { who: Who; params: PlayerFilterParams; scope: string }) {
  const serve = useServe(params);
  const ret = useReturn(params);
  const sp = useServePct(who);
  const rp = useReturnPct(who);
  const summary = useCareerSummary(who);
  const tourName = who.tour === 'F' ? 'WTA' : 'ATP';
  const pending = serve.isPending || ret.isPending;
  const n = serve.data?.matches_with_stats ?? 0;

  return (
    <Section id="serve" title="Serve and return" question="How strong is the serve, and the return, compared with the rest of the tour?">
      {pending && <Skeleton><div className="cv-block-skel" style={{ height: 340 }} /></Skeleton>}
      {(serve.isError || ret.isError) && (
        <BlockError message="Serve and return figures didn’t load." onRetry={() => { void serve.refetch(); void ret.refetch(); }} />
      )}
      {serve.data && ret.data && n === 0 && (
        <div className="pl-nostats">
          <p style={{ fontSize: 16, fontWeight: 600 }}>No point statistics for these matches</p>
          <p className="cv-muted" style={{ marginTop: 6, maxWidth: '62ch' }}>
            Aces, serve points and break points are recorded mainly for tour-level matches from the 1990s onwards. Scores and records above are complete.
          </p>
        </div>
      )}
      {serve.data && ret.data && n > 0 && (
        <>
          <p className="cv-muted" style={{ margin: '0 0 20px', fontSize: 14 }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {fmtInt(n)}{summary.data ? ` of ${fmtInt(summary.data.total)}` : ''} matches have point statistics
            </strong>
            {' '}· figures: {scope} · percentiles: career vs {sp.data?.tour_size ? `${fmtInt(sp.data.tour_size)} ${tourName} players` : `the ${tourName}`}, not filtered
          </p>
          <div className="pl-sr">
            <SRTable title="Serve" rows={[
              { label: 'Ace %', value: serve.data['ace%'], pct: sp.data?.['ace%'] },
              { label: 'Double-fault %', value: serve.data['df%'], noPct: true },
              { label: '1st serve in', value: serve.data['1st_in%'], pct: sp.data?.['1st_in%'] },
              { label: '1st serve won', value: serve.data['1st_win%'], pct: sp.data?.['1st_win%'] },
              { label: '2nd serve won', value: serve.data['2nd_win%'], pct: sp.data?.['2nd_win%'] },
              { label: 'Break points saved', value: serve.data['bp_saved%'], pct: sp.data?.['bp_saved%'] },
              { label: `Tiebreaks · ${serve.data.tb_won}–${serve.data.tb_lost}`, value: serve.data['tb_win%'], pct: sp.data?.['tb_win%'] },
            ]} />
            <SRTable title="Return" rows={[
              { label: '1st-serve return won', value: ret.data['1st_return_win%'], pct: rp.data?.['1st_return_win%'] },
              { label: '2nd-serve return won', value: ret.data['2nd_return_win%'], pct: rp.data?.['2nd_return_win%'] },
              { label: 'Break points converted', value: ret.data['bp_converted%'], pct: rp.data?.['bp_converted%'] },
            ]} />
          </div>
          <p className="pl-small-note">
            Percentile: share of {tourName} players with enough matches that this figure beats. The tick marks the median. Double-fault rate has no percentile.
          </p>
        </>
      )}
    </Section>
  );
}

export function Milestones({ who, surname }: { who: Who; surname: string }) {
  const q = useMilestones(who);
  const m = q.data;
  const items: [string, string | null | undefined, string?][] = m ? [
    ['First top 100', m.first_top100],
    ['First top 50', m.first_top50],
    ['First top 20', m.first_top20],
    ['First top 10', m.first_top10],
    ['First title', m.first_title_date, m.first_title_tournament ?? undefined],
    ['First tour-level title', m.first_tour_title_date, m.first_tour_title_tournament ?? undefined],
  ] : [];
  return (
    <Section id="miles" title="Milestones" question={`When did ${surname} first reach each level?`} note="Career · not filtered">
      {q.isPending && <Skeleton><div className="cv-block-skel" style={{ height: 90 }} /></Skeleton>}
      {q.isError && <BlockError message="Milestones didn’t load." onRetry={() => q.refetch()} />}
      {m && (
        <ol className="pl-miles">
          {items.map(([label, date, event]) => (
            <li key={label}>
              <div className="cv-figure-label-sm">{label}</div>
              <div className="pl-mile-date">{date ? fmtDate(date) : 'Not reached'}</div>
              {event && <div className="cv-muted" style={{ fontSize: 14 }}>{event}</div>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

const SHOWN = 10;

export function RecentMatches({ who, params, filters, scope }: { who: Who; params: PlayerFilterParams; filters: Filters; scope: string }) {
  const q = useRecentMatches(params);
  const [all, setAll] = useState(false);
  const rows = (q.data?.recent52w ?? []).map(fromPlayerRow);
  return (
    <Section id="matches" title="Recent matches" question="The last 52 weeks, most recent first. Open a row for the match statistics." note={scope}>
      {q.isPending && <SkeletonRows rows={8} />}
      {q.isError && <BlockError message="Recent matches didn’t load." onRetry={() => q.refetch()} />}
      {q.data && !rows.length && <p className="cv-muted">No matches in the 52 weeks before the latest one.</p>}
      {rows.length > 0 && <MatchList matches={all ? rows : rows.slice(0, SHOWN)} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 16 }}>
        {rows.length > SHOWN && (
          <button type="button" className="cv-btn" onClick={() => setAll(a => !a)}>
            {all ? 'Show fewer' : `Show all ${rows.length}`}
          </button>
        )}
        <Link to={labHref(playerMatchesSql(who.player, who.tour, filters))} style={{ fontWeight: 600 }}>All matches in the Lab →</Link>
      </div>
      {q.data && (
        <p className="pl-small-note">
          Latest match on record: {rows[0] ? fmtDate(rows[0].date) : '—'}.
        </p>
      )}
    </Section>
  );
}
