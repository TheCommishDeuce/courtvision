import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlayers, useYearRange } from '../hooks';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import TourToggle from '../components/filters/TourToggle';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import YearRangeSlider from '../components/filters/YearRangeSlider';
import PlayerAutocomplete from '../components/filters/PlayerAutocomplete';
import H2HSection from '../components/sections/versus/H2HSection';
import CareerSection from '../components/sections/versus/CareerSection';
import type { VersusFilters } from '../components/sections/versus/filters';
import { parseYearRange, DEFAULT_YEAR_RANGE } from '../lib/yearRange';

export default function VersusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: yr } = useYearRange();

  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [playerA, setPlayerA] = useState(searchParams.get('a') ?? '');
  const [playerB, setPlayerB] = useState(searchParams.get('b') ?? '');
  const [surface, setSurface] = useState(searchParams.get('surface') ?? 'All');
  const [level, setLevel] = useState(searchParams.get('level') ?? '');
  const [yearRange, setYearRange] = useState<[number, number] | null>(() =>
    parseYearRange(searchParams),
  );
  const [submitted, setSubmitted] = useState(
    Boolean(searchParams.get('a') && searchParams.get('b')),
  );

  const { data: players } = usePlayers(tour);

  const activeYearRange = useMemo<[number, number]>(
    () => yearRange ?? (yr ? ([yr.year_min, yr.year_max] as [number, number]) : DEFAULT_YEAR_RANGE),
    [yearRange, yr],
  );

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tour', tour);
    if (playerA) next.set('a', playerA);
    if (playerB) next.set('b', playerB);
    if (surface !== 'All') next.set('surface', surface);
    if (level) next.set('level', level);
    next.set('y0', String(activeYearRange[0]));
    next.set('y1', String(activeYearRange[1]));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeYearRange, level, playerA, playerB, searchParams, setSearchParams, surface, tour]);

  const filters: VersusFilters = {
    tour,
    playerA,
    playerB,
    surface,
    level,
    yearRange: activeYearRange,
    enabled: submitted && Boolean(playerA) && Boolean(playerB),
  };

  const canSubmit = Boolean(playerA) && Boolean(playerB);
  const summary = [
    tour === 'M' ? 'ATP' : 'WTA',
    surface === 'All' ? 'all surfaces' : surface,
    level || 'all levels',
    `${activeYearRange[0]}–${activeYearRange[1]}`,
  ].join(' · ');

  return (
    <div className="space-y-5">
      <SectionHeader
        level="page"
        eyebrow="Versus"
        title="Two players, end to end"
        kicker={filters.enabled ? summary : 'Pick two players'}
      />

      {/* Pair picker. Everything below reads from this one block, so the page is
          a single scroll: the rivalry first, then the two careers behind it. */}
      <section className="ba-well border-t-2 border-t-[var(--rule-ink)] px-3 py-3 space-y-3">
        {/* A face-off, not two fields in a row. The "v" is this page's whole
            identity, so it holds the centre of the picker at every width
            rather than disappearing below the tablet breakpoint. */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-[var(--space-sm)] gap-y-[var(--space-xs)] items-end">
          <PlayerAutocomplete
            label="Player A"
            value={playerA}
            onChange={v => {
              setPlayerA(v);
              setSubmitted(false);
            }}
            players={players ?? []}
            width="w-full"
          />
          <span
            aria-hidden="true"
            className="ba-display text-[length:var(--step-3)] leading-none text-[var(--clay)] pb-0.5 select-none"
          >
            v
          </span>
          <PlayerAutocomplete
            label="Player B"
            value={playerB}
            onChange={v => {
              setPlayerB(v);
              setSubmitted(false);
            }}
            players={players ?? []}
            width="w-full"
          />
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 pt-2.5 border-t border-[var(--rule)]">
          <TourToggle
            value={tour}
            onChange={v => {
              setTour(v);
              setLevel('');
              setSurface('All');
              setSubmitted(false);
            }}
          />
          <SurfaceSelect value={surface} onChange={setSurface} />
          <LevelSelect tour={tour} value={level} onChange={setLevel} />
          {yr && (
            <YearRangeSlider
              key={`versus-${activeYearRange[0]}-${activeYearRange[1]}-${yr.year_min}-${yr.year_max}`}
              min={yr.year_min}
              max={yr.year_max}
              value={activeYearRange}
              onChange={setYearRange}
            />
          )}
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!canSubmit}
            className="ba-btn ba-btn-primary ml-auto"
          >
            Show the rivalry
          </button>
        </div>
      </section>

      {!filters.enabled ? (
        <EmptyState
          title="Pick two players"
          message="Choose a name in each field, then select Show the rivalry. You'll get their head-to-head record and match list, with both full careers below it."
        />
      ) : (
        <>
          {/* A contents line: this page is long by design, so say what's on it. */}
          <nav aria-label="On this page" className="flex gap-4 border-b border-[var(--rule)] pb-1.5">
            <a href="#h2h" className="ba-label ba-touch hover:text-[var(--clay)]">Head to head</a>
            <a href="#careers" className="ba-label ba-touch hover:text-[var(--clay)]">The two careers</a>
          </nav>

          <H2HSection f={filters} />
          <CareerSection f={filters} />
        </>
      )}
    </div>
  );
}
