/**
 * /_kit — every shared component with live data, for checking against
 * docs/design-handoff/prototype. Unlisted; delete with its route when the
 * screens themselves cover everything.
 */
import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/http';
import type { H2HResponse } from '../../types/tennis';
import CopyButton from '../components/CopyButton';
import FilterBar from '../components/FilterBar';
import MatchList from '../components/MatchRow';
import Record from '../components/Record';
import { BlockError, EmptyState, SkeletonRows } from '../components/States';
import { SurfaceTag, TourTag, UpsetTag } from '../components/Tags';
import { useFilters } from '../hooks/useFilters';
import { countActive, describeFilters, toApiParams, type Filters } from '../lib/filters';
import { fromWinnerLoser } from '../lib/matches';

const DEFAULTS: Filters = { tour: 'M', surface: 'All', level: 'All', from: null, to: null };

export default function KitPage() {
  const { filters, setFilters, resetFilters } = useFilters(DEFAULTS);
  const api = toApiParams(filters);
  const h2h = useQuery({
    queryKey: ['kit-h2h', api],
    queryFn: () => get<H2HResponse>('/h2h', {
      player_a: 'Jannik Sinner', player_b: 'Carlos Alcaraz', tour: 'M',
      surface: api.surface, level: api.level, year_min: api.year_min, year_max: api.year_max,
    }),
  });
  const matches = (h2h.data?.matches ?? []).map(r => fromWinnerLoser(r, 'Jannik Sinner'));
  const noStats = matches[0] && {
    ...matches[0], key: 'no-stats', winner: { ...matches[0].winner, pts: null }, loser: { ...matches[0].loser, pts: null },
  };

  return (
    <main className="cv-main" style={{ paddingTop: 32 }}>
      <h1 className="cv-h1">Component kit</h1>
      <p className="cv-lede">Shared components with live data. Compare with docs/design-handoff/prototype.</p>

      <section className="cv-section" style={{ marginTop: 32 }}>
        <div className="cv-section-head"><h2 className="cv-h2">Tags, records, actions</h2></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <TourTag tour="M" /> <TourTag tour="F" />
          <SurfaceTag surface="Hard" /> <SurfaceTag surface="Clay" /> <SurfaceTag surface="Grass" /> <SurfaceTag surface="Carpet" />
          <UpsetTag />
          <Record wins={67} losses={37} />
          <Record wins={3} losses={2} />
          <CopyButton /> <CopyButton what="citation" />
        </div>
      </section>

      <section className="cv-section" aria-label="Filter bar and match rows">
        <div className="cv-section-head">
          <h2 className="cv-h2">Filter bar + match rows</h2>
          <span className="cv-muted">Sinner vs Alcaraz, live from /api/h2h</span>
        </div>
        <FilterBar
          value={filters}
          onChange={setFilters}
          onReset={resetFilters}
          active={countActive(filters, DEFAULTS)}
          showTour
          summary={describeFilters(filters, 'All meetings')}
          detail={h2h.data ? `${h2h.data.summary.wins_a}–${h2h.data.summary.wins_b} Sinner` : undefined}
          yearMin={2018}
          yearMax={2026}
        />
        <div style={{ marginTop: 16 }}>
          {h2h.isPending && <SkeletonRows rows={4} />}
          {h2h.isError && <BlockError onRetry={() => h2h.refetch()} />}
          {h2h.data && !matches.length && (
            <EmptyState title="Sinner and Alcaraz never met under these filters" action={
              <button type="button" className="cv-btn" onClick={resetFilters}>Clear filters</button>
            } />
          )}
          {!!matches.length && <MatchList matches={noStats ? [...matches, noStats] : matches} />}
        </div>
      </section>

      <section className="cv-section">
        <div className="cv-section-head"><h2 className="cv-h2">States</h2></div>
        <SkeletonRows rows={3} />
        <div style={{ marginTop: 16 }}><BlockError message="The splits didn’t load." onRetry={() => undefined} /></div>
        <EmptyState title="Sinner has never played a match on carpet." action={<button type="button" className="cv-btn">Reset filters</button>} />
      </section>
    </main>
  );
}
