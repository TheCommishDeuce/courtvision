import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useYearRange } from '../hooks';
import SectionHeader from '../components/ui/SectionHeader';
import TourToggle from '../components/filters/TourToggle';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import YearRangeSlider from '../components/filters/YearRangeSlider';
import PlayersTab from '../components/sections/records/PlayersTab';
import MatchesTab from '../components/sections/records/MatchesTab';
import AnalysisTab from '../components/sections/records/AnalysisTab';
import type { RecordsFilters } from '../components/sections/records/sources';
import { parseYearRange } from '../lib/yearRange';

const TABS = [
  { id: 'players', label: 'Players', kicker: 'Career and season leaderboards' },
  { id: 'matches', label: 'Matches', kicker: 'Single-match extremes, metric scatter, nationalities' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * The leaderboards open on this season's main tour, which is what people
 * actually come to look at — the all-time view is one control away. `All Tour`
 * is the level code the API uses for "all ATP" / "all WTA".
 */
const DEFAULT_LEVEL = 'All Tour';

export default function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: yr } = useYearRange();

  const paramTab = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(
    TABS.some(t => t.id === paramTab) ? (paramTab as TabId) : 'players',
  );

  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [surface, setSurface] = useState(searchParams.get('surface') ?? 'All');
  const [level, setLevel] = useState(searchParams.get('level') ?? DEFAULT_LEVEL);
  const [yearRange, setYearRange] = useState<[number, number] | null>(() =>
    parseYearRange(searchParams),
  );

  const board = searchParams.get('board');

  // The latest season with data, which is what "current year" means here — the
  // calendar year could be ahead of the last scrape.
  const currentYear = yr?.year_max;

  const activeYearRange = useMemo<[number, number]>(
    () => yearRange ?? [currentYear ?? 2026, currentYear ?? 2026],
    [yearRange, currentYear],
  );

  const filters: RecordsFilters = useMemo(
    () => ({ tour, surface, level, yearRange: activeYearRange }),
    [tour, surface, level, activeYearRange],
  );

  // The URL is the source of truth for shareability: every filter, the tab, and
  // the focused board all live in the query string.
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tab', tab);
    next.set('tour', tour);
    if (surface !== 'All') next.set('surface', surface);
    if (level) next.set('level', level);
    next.set('y0', String(activeYearRange[0]));
    next.set('y1', String(activeYearRange[1]));
    if (board) next.set('board', board);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeYearRange, board, level, searchParams, setSearchParams, surface, tab, tour]);

  const hrefWith = useCallback(
    (overrides: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(overrides)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      return `/records?${next.toString()}`;
    },
    [searchParams],
  );

  const activeTab = TABS.find(t => t.id === tab)!;
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
        eyebrow="Records"
        title="Who leads, and by how much"
        kicker={summary}
      />

      {/* Tabs. Switching tabs keeps the filters — that is the point of putting
          the filter bar above them rather than inside each one. */}
      <div className="flex items-stretch border-b border-[var(--rule)] -mt-2">
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (board) setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete('board');
                  return next;
                }, { replace: true });
              }}
              aria-current={active ? 'page' : undefined}
              className={`ba-tab ${active ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Global filter bar — one set of controls for both tabs. */}
      <section className="ba-well border-t-2 border-t-[var(--rule-ink)] px-3 py-2.5">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <TourToggle
            value={tour}
            onChange={v => {
              // Level codes differ per tour, so switching resets to that tour's
              // own default view: all of its main tour, this season.
              setTour(v);
              setLevel(DEFAULT_LEVEL);
              setSurface('All');
              setYearRange(currentYear ? [currentYear, currentYear] : null);
            }}
          />
          <SurfaceSelect value={surface} onChange={setSurface} />
          <LevelSelect tour={tour} value={level} onChange={setLevel} />
          {yr && (
            <YearRangeSlider
              key={`records-${activeYearRange[0]}-${activeYearRange[1]}-${yr.year_min}-${yr.year_max}`}
              min={yr.year_min}
              max={yr.year_max}
              value={activeYearRange}
              onChange={setYearRange}
            />
          )}
          <p className="ba-kicker ml-auto self-center">{activeTab.kicker}</p>
        </div>
      </section>

      {tab === 'players' && (
        <PlayersTab
          filters={filters}
          board={board}
          boardHref={id => hrefWith({ board: id })}
          backHref={hrefWith({ board: null })}
        />
      )}
      {tab === 'matches' && (
        <div className="space-y-8">
          <MatchesTab filters={filters} />
          <AnalysisTab filters={filters} />
        </div>
      )}
    </div>
  );
}
