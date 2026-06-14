import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useYearRange } from '../hooks';
import TourToggle from '../components/filters/TourToggle';
import SurfaceSelect from '../components/filters/SurfaceSelect';
import LevelSelect from '../components/filters/LevelSelect';
import YearRangeSlider from '../components/filters/YearRangeSlider';
import FilterPanel from '../components/ui/FilterPanel';
import SectionHeader from '../components/ui/SectionHeader';
import {
  ActivityTab,
  DrawStrengthTab,
  ReturnTab,
  ServeTab,
  StreaksTab,
  TABS,
  type Tab,
} from '../components/sections/leaders/Leaderboards';
import { parseYearRange } from '../lib/yearRange';

// ============ PAGE ============

export default function LeadersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: yr } = useYearRange();
  const [tab, setTab] = useState<Tab>(() => {
    const paramTab = searchParams.get('tab');
    return TABS.some(t => t.id === paramTab) ? (paramTab as Tab) : 'activity';
  });
  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');
  const [surface, setSurface] = useState(searchParams.get('surface') ?? 'All');
  const [level, setLevel] = useState(searchParams.get('level') ?? '');
  const [yearRange, setYearRange] = useState<[number, number] | null>(() => parseYearRange(searchParams));
  const activeYearRange = yearRange ?? ([yr?.year_max ?? 2026, yr?.year_max ?? 2026] as [number, number]);
  const sharedProps = { tour, surface, level, yearRange: activeYearRange };
  const activeTabDef = TABS.find(t => t.id === tab)!;

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tour', tour);
    next.set('tab', tab);
    if (surface !== 'All') next.set('surface', surface);
    if (level) next.set('level', level);
    next.set('y0', String(activeYearRange[0]));
    next.set('y1', String(activeYearRange[1]));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeYearRange, level, searchParams, setSearchParams, surface, tab, tour]);

  return (
    <div className="space-y-10">
      {/* ============ PAGE HEADER ============ */}
      <header className="border-b border-[var(--rule)] pb-4">
        <div className="ba-kicker text-[10px] mb-2">Leaderboard · Desk</div>
        <h1 className="ba-display">
          Stat <span className="text-[var(--clay)]">Leaders</span>
        </h1>
      </header>

      {/* ============ FILTER PANEL ============ */}
      <FilterPanel
        kicker="Leaderboard filters"
        summary={`${tour === 'M' ? 'ATP' : 'WTA'} · ${surface}${level ? ` · ${level}` : ''} · ${activeYearRange[0]}–${activeYearRange[1]}`}
      >
        <TourToggle value={tour} onChange={v => { setTour(v); setLevel(''); setSurface('All'); }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_auto_minmax(20rem,1fr)] gap-4 items-end">
          <SurfaceSelect value={surface} onChange={setSurface} />
          <LevelSelect tour={tour} value={level} onChange={setLevel} />
          {yr && (
            <YearRangeSlider
              key={`leaders-year-${activeYearRange[0]}-${activeYearRange[1]}-${yr.year_min}-${yr.year_max}`}
              min={yr.year_min}
              max={yr.year_max}
              value={activeYearRange}
              onChange={setYearRange}
            />
          )}
        </div>
      </FilterPanel>

      {/* ============ CATEGORY CHIPS ============ */}
      <section>
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`ba-chip ${tab === t.id ? 'ba-chip-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* ============ ACTIVE TABLE ============ */}
      <section>
        <SectionHeader title={activeTabDef.label} kicker={`${activeTabDef.subtitle} · top 50`} />
        {tab === 'activity' && <ActivityTab {...sharedProps} />}
        {tab === 'serve' && <ServeTab {...sharedProps} />}
        {tab === 'return' && <ReturnTab {...sharedProps} />}
        {tab === 'streaks' && <StreaksTab {...sharedProps} />}
        {tab === 'draw_strength' && <DrawStrengthTab {...sharedProps} />}
      </section>
    </div>
  );
}
