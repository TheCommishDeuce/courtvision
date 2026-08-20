import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useYearRange } from '../hooks';
import SectionHeader from '../components/primitives/SectionHeader';
import TourToggle from '../components/filters/TourToggle';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import YearRangeSlider from '../components/filters/YearRangeSlider';
import PlayersTab from '../components/sections/records/PlayersTab';
import MatchesTab from '../components/sections/records/MatchesTab';
import AnalysisTab from '../components/sections/records/AnalysisTab';
import { useUrlFilters } from '../state/useUrlFilters';
import { recordsFilterSchema, defaultRecordsFilters } from '../components/sections/records/filters';

const TABS = [
  { id: 'players', label: 'Players', kicker: 'Career and season leaderboards' },
  { id: 'matches', label: 'Matches', kicker: 'Single-match extremes, metric scatter, nationalities' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const DEFAULT_LEVEL = 'All Tour';

export default function RecordsPage() {
  const [searchParams] = useSearchParams();
  const { data: yr } = useYearRange();

  const [filters, setFilters] = useUrlFilters(recordsFilterSchema, defaultRecordsFilters);

  const tab = (TABS.some(t => t.id === filters.tab) ? filters.tab : 'players') as TabId;
  const tour = filters.tour;
  const surface = filters.surface ?? 'All';
  const level = filters.level ?? DEFAULT_LEVEL;
  const board = filters.board ?? null;

  const currentYear = yr?.year_max ?? 2026;

  const activeYearRange = useMemo<[number, number]>(
    () => [filters.y0 ?? currentYear, filters.y1 ?? currentYear],
    [filters.y0, filters.y1, currentYear],
  );

  const childFilters = useMemo(
    () => ({ tour, surface, level, yearRange: activeYearRange }),
    [tour, surface, level, activeYearRange],
  );

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

      <div className="flex items-stretch border-b border-rule -mt-2">
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setFilters({ tab: t.id, board: '' });
              }}
              aria-current={active ? 'page' : undefined}
              className={`ba-tab ${active ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <section className="ba-well px-3 py-2.5">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <TourToggle
            value={tour}
            onChange={v => {
              setFilters({
                tour: v as 'M'|'F',
                level: DEFAULT_LEVEL,
                surface: 'All',
                y0: currentYear,
                y1: currentYear,
              });
            }}
          />
          <SurfaceSelect value={surface} onChange={v => setFilters({ surface: v })} />
          <LevelSelect tour={tour} value={level} onChange={v => setFilters({ level: v })} />
          {yr && (
            <YearRangeSlider
              key={`records-${activeYearRange[0]}-${activeYearRange[1]}-${yr.year_min}-${yr.year_max}`}
              min={yr.year_min}
              max={yr.year_max}
              value={activeYearRange}
              onChange={([y0, y1]) => setFilters({ y0, y1 })}
            />
          )}
          <p className="ba-kicker ml-auto self-center">{activeTab.kicker}</p>
        </div>
      </section>

      {tab === 'players' && (
        <PlayersTab
          filters={childFilters}
          board={board}
          boardHref={id => hrefWith({ board: id })}
          backHref={hrefWith({ board: null })}
        />
      )}
      {tab === 'matches' && (
        <div className="space-y-8">
          <MatchesTab filters={childFilters} />
          <AnalysisTab filters={childFilters} />
        </div>
      )}
    </div>
  );
}
