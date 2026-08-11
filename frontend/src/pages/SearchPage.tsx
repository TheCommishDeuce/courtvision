import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TourToggle from '../components/filters/TourToggle';
import SectionHeader from '../components/ui/SectionHeader';
import QueryBuilder from '../components/sections/query/QueryBuilder';
import RelationalSearch from '../components/sections/RelationalSearch';

/**
 * Two ways to ask a question of the data: write one yourself against the
 * tables, or use the pre-built player-versus-cohort lookup, which encodes
 * joins (opponent hand, nationality, age, match situation) that would be
 * tedious to write by hand.
 */
const TABS = [
  { id: 'query', label: 'Build a query', kicker: 'Filters, editable SQL, CSV' },
  { id: 'cohort', label: 'Player vs cohort', kicker: 'How a player fares against a group' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(
    TABS.some(t => t.id === paramTab) ? (paramTab as TabId) : 'query',
  );
  const [tour, setTour] = useState(searchParams.get('tour') ?? 'M');

  const update = (next: Partial<{ tab: TabId; tour: string }>) => {
    const params = new URLSearchParams(searchParams);
    if (next.tab) params.set('tab', next.tab);
    if (next.tour) params.set('tour', next.tour);
    setSearchParams(params, { replace: true });
  };

  const active = TABS.find(t => t.id === tab)!;

  return (
    <div className="space-y-5">
      <SectionHeader
        level="page"
        eyebrow="Search"
        title="Ask the database directly"
        kicker={active.kicker}
      />

      <div className="flex items-stretch border-b border-[var(--rule)] -mt-2">
        {TABS.map(t => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                update({ tab: t.id });
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`px-3 py-1.5 -mb-px border-b-2 ba-mono text-[11px] font-bold tracking-[0.12em] uppercase transition-colors ${
                isActive
                  ? 'border-[var(--clay)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'query' && <QueryBuilder />}

      {tab === 'cohort' && (
        <div className="space-y-4">
          <section className="ba-well border-t-2 border-t-[var(--ink)] px-3 py-2.5">
            <TourToggle
              value={tour}
              onChange={v => {
                setTour(v);
                update({ tour: v });
              }}
            />
          </section>
          <RelationalSearch tour={tour} />
        </div>
      )}
    </div>
  );
}
