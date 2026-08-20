import { useState } from 'react';
import { usePlayers, useYearRange } from '../hooks';
import SectionHeader from '../components/primitives/SectionHeader';
import EmptyState from '../components/primitives/EmptyState';
import TourToggle from '../components/filters/TourToggle';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import YearRangeSlider from '../components/filters/YearRangeSlider';
import PlayerAutocomplete from '../components/filters/PlayerAutocomplete';
import H2HSection from '../components/sections/versus/H2HSection';
import CareerSection from '../components/sections/versus/CareerSection';
import { useUrlFilters } from '../state/useUrlFilters';
import { versusFilterSchema, defaultVersusFilters } from '../components/sections/versus/filters';

export default function VersusPage() {
  const [filters, setFilters] = useUrlFilters(versusFilterSchema, defaultVersusFilters);
  const { data: yr } = useYearRange();
  
  // Submit state is page-level, not URL-level
  const [isSubmitted, setIsSubmitted] = useState(
    Boolean(filters.a && filters.b)
  );

  const { data: players } = usePlayers(filters.tour);

  const globalMin = yr?.year_min ?? 1990;
  const globalMax = yr?.year_max ?? new Date().getFullYear();

  const canSubmit = Boolean(filters.a) && Boolean(filters.b);
  const summary = [
    filters.tour === 'M' ? 'ATP' : 'WTA',
    filters.surface === 'All' ? 'all surfaces' : filters.surface,
    filters.level || 'all levels',
    `${filters.y0 ?? globalMin}–${filters.y1 ?? globalMax}`,
  ].join(' · ');

  return (
    <div className="space-y-5">
      <SectionHeader
        level="page"
        eyebrow="Versus"
        title="Two players, end to end"
        kicker={isSubmitted ? summary : 'No pair selected'}
      />

      <section className="ba-well px-3 py-3 space-y-3">
        {/* Stacked on a phone: two autocompletes side by side at 360px leaves
            neither wide enough to read a full name. */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-x-[var(--space-sm)] gap-y-[var(--space-xs)] items-end">
          <PlayerAutocomplete
            label="Player A"
            value={filters.a ?? ''}
            onChange={v => { setFilters({ a: v }); setIsSubmitted(false); }}
            players={players ?? []}
            width="w-full"
          />
          <span
            aria-hidden="true"
            className="ba-display hidden sm:block text-[length:var(--step-3)] leading-none text-clay pb-0.5 select-none"
          >
            v
          </span>
          <PlayerAutocomplete
            label="Player B"
            value={filters.b ?? ''}
            onChange={v => { setFilters({ b: v }); setIsSubmitted(false); }}
            players={players ?? []}
            width="w-full"
          />
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 pt-2.5 border-t border-rule">
          <TourToggle
            value={filters.tour}
            onChange={v => setFilters({ tour: v as 'M'|'F', level: 'All Tour', surface: 'All' })}
          />
          <SurfaceSelect value={filters.surface} onChange={v => setFilters({ surface: v })} />
          <LevelSelect tour={filters.tour} value={filters.level} onChange={v => setFilters({ level: v })} />
          {yr && (
            <YearRangeSlider
              key={`versus-${filters.y0}-${filters.y1}-${yr.year_min}-${yr.year_max}`}
              min={globalMin}
              max={globalMax}
              value={[filters.y0 ?? globalMin, filters.y1 ?? globalMax]}
              onChange={([y0, y1]) => setFilters({ y0, y1 })}
            />
          )}
          <button
            type="button"
            onClick={() => setIsSubmitted(true)}
            disabled={!canSubmit}
            className="ba-btn ba-btn-primary w-full sm:w-auto sm:ml-auto"
          >
            Show the rivalry
          </button>
        </div>
      </section>

      {!isSubmitted ? (
        <EmptyState
          eyebrow="Start here"
          title="Pick two players"
          message="Choose a name in each field, then select Show the rivalry — you'll get their head-to-head and both careers."
        />
      ) : (
        <>
          <nav aria-label="On this page" className="flex gap-4 border-b border-rule pb-1.5">
            <a href="#h2h" className="ba-label ba-touch hover:text-clay">Head to head</a>
            <a href="#careers" className="ba-label ba-touch hover:text-clay">The two careers</a>
          </nav>

          <H2HSection f={{ ...filters, enabled: isSubmitted }} />
          <CareerSection f={{ ...filters, enabled: isSubmitted }} />
        </>
      )}
    </div>
  );
}
