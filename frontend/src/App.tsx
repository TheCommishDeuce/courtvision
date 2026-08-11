import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Spinner from './components/ui/Spinner';
import { useMetaStats } from './hooks';

const HomePage = lazy(() => import('./pages/HomePage'));
const VersusPage = lazy(() => import('./pages/VersusPage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const TournamentPage = lazy(() => import('./pages/TournamentPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
/** Unlisted design-system specimen — see pages/SpecimenPage.tsx. */
const SpecimenPage = lazy(() => import('./pages/SpecimenPage'));

function PlayerPageRoute() {
  const [searchParams] = useSearchParams();
  return <PlayerPage key={searchParams.get('p') ?? '__empty__'} />;
}

/** Keeps the query string when a merged page replaces an old route. */
function RedirectTo({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function Footer() {
  const { data: stats } = useMetaStats();
  return (
    <footer className="border-t border-[var(--rule-ink)] bg-[var(--paper)] mt-[var(--space-xl)]">
      <div className="ba-canvas py-[var(--space-sm)] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="ba-cell text-[var(--ink-2)] max-w-2xl">
          Match data from Jeff Sackmann's{' '}
          <a href="https://www.tennisabstract.com" target="_blank" rel="noopener noreferrer" className="ba-link font-medium">
            Tennis Abstract
          </a>
          {' '}and{' '}
          <a href="https://github.com/JeffSackmann/tennis_atp" target="_blank" rel="noopener noreferrer" className="ba-link font-medium">
            public datasets
          </a>
          — all credit for the underlying data is theirs.
        </p>
        <span className="ba-label">
          {stats?.data_through ? `Data through ${stats.data_through.slice(0, 10)}` : 'courtvision'}
        </span>
      </div>
    </footer>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="ba-eyebrow mb-2">No such page</div>
      <h1 className="ba-h2 mb-1">That address isn't part of this site</h1>
      <p className="ba-body mb-5 max-w-md mx-auto">
        Check the link, or start from the home page and pick a section.
      </p>
      <a href="/" className="ba-btn ba-btn-ghost">Go to home</a>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh bg-[var(--paper)] flex flex-col text-[var(--ink)]">
      <Navbar />
      <main className="ba-canvas py-[var(--space-md)] w-full flex-1">
        <ErrorBoundary>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"           element={<HomePage />} />
              <Route path="/versus"     element={<VersusPage />} />
              <Route path="/player"     element={<PlayerPageRoute />} />
              <Route path="/tournament" element={<TournamentPage />} />
              <Route path="/records"    element={<RecordsPage />} />
              <Route path="/search"     element={<SearchPage />} />
              <Route path="/_specimen"  element={<SpecimenPage />} />

              {/* Old routes, kept so existing links and bookmarks resolve. */}
              <Route path="/leaders"    element={<RedirectTo to="/records" />} />
              <Route path="/h2h"        element={<RedirectTo to="/versus" />} />
              <Route path="/compare"    element={<RedirectTo to="/versus" />} />

              <Route path="*"           element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
