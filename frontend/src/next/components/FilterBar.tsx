/**
 * Sticky filter bar (DESIGN.md › Shared patterns › Filter bar). Controlled:
 * the page owns the Filters (usually through useFilters, i.e. the URL) and
 * says what the summary and detail lines read.
 */
import { useState } from 'react';
import { useIsPhone } from '../hooks/useViewport';
import { LEVELS, type Filters, type Tour } from '../lib/filters';
import { SURFACE_STYLE, SURFACES } from '../lib/surface';

export interface FilterBarProps {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  /** How many filters differ from the page's defaults. */
  active: number;
  /** Show the ATP / WTA toggle (Records, Tournament). Elsewhere tour is implied. */
  showTour?: boolean;
  /** The active filters in words, e.g. describeFilters(). */
  summary: string;
  /** A second line: the filtered record or count. */
  detail?: string;
  yearMin: number;
  yearMax: number;
}

const TOUR_LABEL: Record<Tour, string> = { M: 'ATP', F: 'WTA' };

/** The first / last year of the range means "no bound", so the URL stays clean. */
const openBound = (year: number, edge: number): number | null => (year === edge ? null : year);

export default function FilterBar({
  value, onChange, onReset, active, showTour = false, summary, detail, yearMin, yearMax,
}: FilterBarProps) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const years = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMax - i);
  const summaryBlock = (
    <div className="cv-filter-summary" aria-live="polite">
      <strong>{summary}</strong>
      {detail && <div className="cv-muted">{detail}</div>}
    </div>
  );

  return (
    <div className="cv-filterbar">
      {phone && (
        <div className="cv-filterbar-phone">
          <button type="button" className="cv-filterbar-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {active ? `Filters (${active})` : 'Filters'}
          </button>
          {summaryBlock}
        </div>
      )}
      {(!phone || open) && (
        <div className="cv-filterbar-controls">
          {showTour && (
            <div className="cv-field">
              <span id="cv-f-tour">Tour</span>
              <div role="group" aria-labelledby="cv-f-tour" className="cv-seg cv-seg--bold">
                {(['M', 'F'] as const).map(t => (
                  <button key={t} type="button" aria-pressed={value.tour === t} onClick={() => onChange({ tour: t })}>
                    {TOUR_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="cv-field">
            <span id="cv-f-surface">Surface</span>
            <div role="group" aria-labelledby="cv-f-surface" className="cv-seg">
              {(['All', ...SURFACES] as const).map(s => (
                <button key={s} type="button" aria-pressed={value.surface === s} onClick={() => onChange({ surface: s })}>
                  {s !== 'All' && (
                    <span aria-hidden="true" className="cv-glyph" style={{ color: SURFACE_STYLE[s].color }}>
                      {SURFACE_STYLE[s].glyph}
                    </span>
                  )}
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="cv-field">
            Level
            <select className="cv-select" value={value.level} onChange={e => onChange({ level: e.target.value })}>
              {LEVELS[value.tour].map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <div className="cv-years">
            <label className="cv-field">
              From
              <select
                className="cv-select"
                value={value.from ?? yearMin}
                onChange={e => onChange({ from: openBound(Number(e.target.value), yearMin) })}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <span className="cv-years-dash" aria-hidden="true">–</span>
            <label className="cv-field">
              To
              <select
                className="cv-select"
                value={value.to ?? yearMax}
                onChange={e => onChange({ to: openBound(Number(e.target.value), yearMax) })}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          {active > 0 && (
            <button type="button" className="cv-text-btn" onClick={onReset}>Reset filters</button>
          )}
          {!phone && summaryBlock}
        </div>
      )}
    </div>
  );
}
