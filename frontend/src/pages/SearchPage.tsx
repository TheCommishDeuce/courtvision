import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TourToggle from '../components/filters/TourToggle';
import FilterPanel from '../components/ui/FilterPanel';
import RelationalSearch from '../components/sections/RelationalSearch';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');

  const changeTour = (v: string) => {
    setTour(v);
    const next = new URLSearchParams(searchParams);
    next.set('tour', v);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-10">
      {/* ============ PAGE HEADER ============ */}
      <header className="border-b border-[var(--rule)] pb-4">
        <div className="ba-kicker text-[10px] mb-2">Match · Finder</div>
        <h1 className="ba-display">
          Match <span className="text-[var(--clay)]">Search</span>
        </h1>
      </header>

      <FilterPanel kicker="Search filters" summary={tour === 'M' ? 'ATP' : 'WTA'}>
        <TourToggle value={tour} onChange={changeTour} />
      </FilterPanel>

      {/* ============ RELATIONAL (PLAYER VS COHORT) ============ */}
      <RelationalSearch tour={tour} />
    </div>
  );
}
