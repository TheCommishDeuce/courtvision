import TourToggle from '../components/filters/TourToggle';
import SectionHeader from '../components/primitives/SectionHeader';
import QueryBuilder from '../components/sections/query/QueryBuilder';
import RelationalSearch from '../components/sections/RelationalSearch';

/**
 * Two ways to ask a question of the data: write one yourself against the
 * tables, or use the pre-built player-versus-cohort lookup, which encodes
 * joins (opponent hand, nationality, age, match situation) that would be
 * tedious to write by hand.
 */
import { useUrlFilters } from '../state/useUrlFilters';
import { searchFilterSchema, defaultSearchFilters } from '../components/sections/query/filters';

const TABS = [
  { id: 'query', label: 'Build a query', kicker: 'Filters, editable SQL, CSV' },
  { id: 'cohort', label: 'Player vs cohort', kicker: 'How a player fares against a group' },
] as const;

export default function SearchPage() {
  const [filters, setFilters] = useUrlFilters(searchFilterSchema, defaultSearchFilters);

  const tab = filters.tab ?? 'query';
  const tour = filters.tour ?? 'M';

  const active = TABS.find(t => t.id === tab)!;

  return (
    <div className="space-y-5">
      <SectionHeader
        level="page"
        eyebrow="Search"
        title="Ask the database directly"
        kicker={active.kicker}
      />

      <div className="flex items-stretch border-b border-rule -mt-2">
        {TABS.map(t => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilters({ tab: t.id })}
              aria-current={isActive ? 'page' : undefined}
              className={`ba-tab ${isActive ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'query' && <QueryBuilder />}

      {tab === 'cohort' && (
        <div className="space-y-4">
          <section className="ba-well px-3 py-2.5">
            <TourToggle
              value={tour}
              onChange={v => setFilters({ tour: v as 'M'|'F' })}
            />
          </section>
          <RelationalSearch tour={tour} />
        </div>
      )}
    </div>
  );
}
