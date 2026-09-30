/** Career shape: win % by year, ranking trajectory, record by surface and level. */
import { useState } from 'react';
import type { WinPctRow } from '../../types/tennis';
import type { PlayerFilterParams } from '../../api/player';
import Section from '../../components/Section';
import { BlockError, Skeleton } from '../../components/States';
import { useIsPhone } from '../../hooks/useViewport';
import { yearBounds, type Filters } from '../../lib/filters';
import { fmtDate, fmtPct, record } from '../../lib/format';
import {
  firstAtOrBetter, heatShare, rankByYear, rankChart, surfaceLevelGrid, type GridCell, type RankScale,
} from '../../lib/playerCharts';
import { SURFACE_STYLE, isSurface } from '../../lib/surface';
import { useHeatmap, useRankHistory, useShapeMatches, type Who } from './data';

/** Past this many years the per-bar labels no longer fit; the table carries them. */
const LABEL_LIMIT = { phone: 9, desk: 16 };

function YearBars({ years, filters }: { years: WinPctRow[]; filters: Filters }) {
  const phone = useIsPhone();
  const [from, to] = yearBounds(filters);
  const labelled = years.length <= (phone ? LABEL_LIMIT.phone : LABEL_LIMIT.desk);
  const step = labelled ? 1 : Math.ceil(years.length / (phone ? 6 : 10));
  return (
    <figure className="pl-figure">
      <figcaption className="pl-figcaption">
        Win % by year <span className="cv-muted" style={{ fontWeight: 400, fontSize: 14 }}>· won–lost under each year</span>
      </figcaption>
      <div className="pl-bars-wrap">
        <div className="pl-bars-axis" aria-hidden="true">
          <span style={{ top: -7 }}>100%</span><span style={{ top: 73 }}>50%</span><span style={{ bottom: -7 }}>0%</span>
        </div>
        <div className="pl-bars">
          <div className="pl-bars-grid" aria-hidden="true" />
          <div className="pl-bars-mid" aria-hidden="true" />
          <ol className="pl-bars-list">
            {years.map((y, i) => {
              const year = y.year ?? 0;
              const inRange = (from == null || year >= from) && (to == null || year <= to);
              const r = record(y.wins, y.total - y.wins);
              return (
                <li
                  key={year}
                  className="pl-bar"
                  style={{ opacity: inRange ? 1 : 0.3 }}
                  aria-label={`${year}: ${fmtPct(y.win_pct)} (${r.wl}, ${y.total} matches)`}
                  title={`${year}: ${fmtPct(y.win_pct)} · ${r.wl}`}
                >
                  <div className="pl-bar-track">
                    <div className="pl-bar-fill" style={{ height: `${y.win_pct}%` }}>
                      {labelled && <span className="pl-bar-pct">{Math.round(y.win_pct)}%</span>}
                    </div>
                  </div>
                  <span className="pl-bar-year" aria-hidden="true">
                    {i % step === 0 ? (phone || !labelled ? `’${String(year).slice(2)}` : year) : ' '}
                  </span>
                  {labelled && <span className="pl-bar-wl" aria-hidden="true">{r.wl}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </figure>
  );
}

function RankTrajectory({ who }: { who: Who }) {
  const q = useRankHistory(who);
  const phone = useIsPhone();
  const [scale, setScale] = useState<RankScale>('log');
  const points = q.data ?? [];
  const chart = rankChart(points, scale, phone);
  const first = points[0];
  const top100 = firstAtOrBetter(points, 100);
  const best = points.length ? Math.min(...points.map(p => p.rank)) : null;
  const reachedBest = best != null ? firstAtOrBetter(points, best) : undefined;
  const last = points[points.length - 1];

  return (
    <figure className="pl-figure">
      <figcaption className="pl-rank-head">
        <span className="pl-figcaption">Ranking trajectory</span>
        <span role="group" aria-label="Scale" className="cv-seg cv-seg--tiny">
          <button type="button" aria-pressed={scale === 'log'} onClick={() => setScale('log')}>All ranks</button>
          <button type="button" aria-pressed={scale === 'top100'} onClick={() => setScale('top100')}>Top 100</button>
        </span>
      </figcaption>
      {q.isPending && <Skeleton><div className="cv-block-skel" style={{ height: 220 }} /></Skeleton>}
      {q.isError && <BlockError message="The ranking history didn’t load." onRetry={() => q.refetch()} />}
      {q.data && !points.length && <p className="cv-muted">No ranking on record.</p>}
      {points.length > 0 && (
        <>
          <div className="pl-rank-plot">
            {chart.gridlines.map(g => (
              <div key={g.label} aria-hidden="true" className="pl-rank-grid" style={{ top: `${g.top}%` }}><span>{g.label}</span></div>
            ))}
            <svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
              <path d={chart.path} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {chart.dot && <div aria-hidden="true" className="pl-rank-dot" style={{ left: `${chart.dot.left}%`, top: `${chart.dot.top}%` }} />}
          </div>
          <div aria-hidden="true" className="pl-rank-x">
            {chart.xTicks.map(x => <span key={x.label} style={{ left: `${x.left}%` }}>{x.label}</span>)}
          </div>
          <p className="pl-caption">
            First ranking #{first.rank.toLocaleString('en-US')} ({fmtDate(first.date)})
            {top100 && top100 !== first && ` · top 100 on ${fmtDate(top100.date)}`}
            {reachedBest && ` · ${best === 1 ? 'No. 1' : `best #${best}`} on ${fmtDate(reachedBest.date)}`}
            {` · #${last.rank.toLocaleString('en-US')} at the last match.`}
            {scale === 'log' ? ' Log scale.' : ' Weeks outside the top 100 are not drawn.'}
            {' '}Ranks are taken at each match.
          </p>
          <details className="cv-disclosure" style={{ marginTop: 8, fontSize: 14 }}>
            <summary>Show as a table</summary>
            <div role="table" className="cv-mini-table" aria-label="Ranking by year">
              <div role="row" className="cv-mini-row cv-mini-row--head">
                <span role="columnheader">Year</span><span role="columnheader">Best rank</span><span role="columnheader">Last rank of year</span>
              </div>
              {rankByYear(points).map(r => (
                <div role="row" key={r.year} className="cv-mini-row">
                  <span role="cell">{r.year}</span><span role="cell">#{r.best.toLocaleString('en-US')}</span><span role="cell">#{r.last.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </figure>
  );
}

function Cell({ c, dim }: { c: GridCell | null; dim: boolean }) {
  if (!c) return <span role="cell" className="pl-cell" title="No matches" />;
  const r = record(c.wins, c.total - c.wins);
  const pct = (c.wins / c.total) * 100;
  return (
    <span
      role="cell"
      className="pl-cell"
      title={`${r.wl} · ${r.pct} · ${c.total} matches${r.low ? ' (low sample)' : ''}`}
      style={{ background: `color-mix(in oklch, var(--acc) ${heatShare(pct).toFixed(0)}%, transparent)`, opacity: dim ? 0.3 : 1 }}
    >
      <span className="pl-cell-pct">{r.pct}</span>
      <span className="pl-cell-wl">{r.wl}</span>
    </span>
  );
}

function SurfaceLevelGrid({ who, filters }: { who: Who; filters: Filters }) {
  const q = useHeatmap(who);
  if (q.isPending) return <Skeleton><div className="cv-block-skel" style={{ height: 280, marginTop: 44 }} /></Skeleton>;
  if (q.isError) return <div style={{ marginTop: 44 }}><BlockError message="The surface grid didn’t load." onRetry={() => q.refetch()} /></div>;
  const g = surfaceLevelGrid(q.data);
  if (!g.rows.length) return null;
  const cols = `minmax(92px, 1.3fr) repeat(${g.surfaces.length + 1}, minmax(0, 1fr))`;
  const levelDim = (level: string) => filters.level !== 'All' && filters.level !== 'All Tour' && filters.level !== level;
  const surfaceDim = (s: string) => filters.surface !== 'All' && filters.surface !== s;
  return (
    <figure className="pl-figure pl-grid-fig">
      <figcaption className="pl-grid-cap">
        <span className="pl-figcaption">Record by surface and level</span>
        <span className="cv-section-note">Career · darker = higher win % · blank = no matches</span>
      </figcaption>
      <div role="table" aria-label="Win percentage by surface and level" className="pl-grid">
        <div role="row" className="pl-grid-row pl-grid-row--head" style={{ gridTemplateColumns: cols }}>
          <span role="columnheader" className="cv-muted" style={{ fontSize: 12 }}>Level</span>
          {g.surfaces.map(s => (
            <span role="columnheader" key={s} className="pl-grid-head">
              {isSurface(s) && <span aria-hidden="true" className="cv-glyph" style={{ color: SURFACE_STYLE[s].color }}>{SURFACE_STYLE[s].glyph}</span>}
              {s}
            </span>
          ))}
          <span role="columnheader" className="pl-grid-head">All</span>
        </div>
        {g.rows.map(row => (
          <div role="row" key={row.level} className="pl-grid-row" style={{ gridTemplateColumns: cols }}>
            <span role="rowheader" className="pl-grid-label">{row.level}</span>
            {row.cells.map((c, i) => <Cell key={g.surfaces[i]} c={c} dim={levelDim(row.level) || surfaceDim(g.surfaces[i])} />)}
            <Cell c={row.all} dim={levelDim(row.level)} />
          </div>
        ))}
        <div role="row" className="pl-grid-row pl-grid-row--total" style={{ gridTemplateColumns: cols }}>
          <span role="rowheader" className="pl-grid-label">All levels</span>
          {g.totals.cells.map((c, i) => <Cell key={g.surfaces[i]} c={c} dim={surfaceDim(g.surfaces[i])} />)}
          <Cell c={g.totals.all} dim={false} />
        </div>
      </div>
    </figure>
  );
}

export default function CareerShape({
  who, params, filters, scope,
}: { who: Who; params: PlayerFilterParams; filters: Filters; scope: string }) {
  const matches = useShapeMatches(params);
  return (
    <Section id="shape" title="Career shape" question="How has the career unfolded, year by year and surface by surface?" note={`${scope} · years narrow the charts`}>
      <div className="pl-charts">
        {matches.isPending && <Skeleton><div className="cv-block-skel" style={{ height: 280 }} /></Skeleton>}
        {matches.isError && <BlockError message="Win % by year didn’t load." onRetry={() => matches.refetch()} />}
        {matches.data && <YearBars years={matches.data.by_year} filters={filters} />}
        <RankTrajectory who={who} />
      </div>
      <SurfaceLevelGrid who={who} filters={filters} />
    </Section>
  );
}
