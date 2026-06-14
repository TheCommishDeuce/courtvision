import { lazy, Suspense } from 'react';
import { Link, Route, Routes, useSearchParams } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Spinner from './components/ui/Spinner';
import { useMetaStats } from './hooks';

const HomePage = lazy(() => import('./pages/HomePage'));
const H2HPage = lazy(() => import('./pages/H2HPage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const TournamentPage = lazy(() => import('./pages/TournamentPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const LeadersPage = lazy(() => import('./pages/LeadersPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const DevPortalPage = lazy(() => import('./pages/DevPortalPage'));

function PlayerPageRoute() {
  const [searchParams] = useSearchParams();
  return <PlayerPage key={searchParams.get('p') ?? '__empty__'} />;
}

function Footer() {
  const { data: stats } = useMetaStats();
  return (
    <footer className="border-t-2 border-[var(--ink)] bg-[var(--bone)] mt-12">
      <div className="max-w-7xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--mute)]">
        <span>
          Data sourced from{' '}
          <a href="https://www.tennisabstract.com" target="_blank" rel="noopener noreferrer" className="ba-link font-medium">
            Tennis Abstract
          </a>
          {' '}and{' '}
          <a href="https://github.com/JeffSackmann/tennis_atp" target="_blank" rel="noopener noreferrer" className="ba-link font-medium">
            Jeff Sackmann's match dataset
          </a>
          . All credit for the underlying data goes to him.
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ba-mono text-[10px] text-[var(--ink-2)]">
          <Link to="/docs" className="ba-link">API Docs</Link>
          <Link to="/pricing" className="ba-link">API Access</Link>
          <Link to="/dev" className="ba-link">Developer Portal</Link>
          <span>{stats?.data_through ? `Data through ${stats.data_through.slice(0, 10)}` : 'courtvision'}</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bone)] ba-grain flex flex-col text-[var(--ink)]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        <ErrorBoundary>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"           element={<HomePage />} />
              <Route path="/h2h"        element={<H2HPage />} />
              <Route path="/player"     element={<PlayerPageRoute />} />
              <Route path="/compare"    element={<ComparePage />} />
              <Route path="/tournament" element={<TournamentPage />} />
              <Route path="/leaders"    element={<LeadersPage />} />
              <Route path="/search"     element={<SearchPage />} />
              <Route path="/records"    element={<RecordsPage />} />
              <Route path="/pricing"    element={<PricingPage />} />
              <Route path="/docs"       element={<DocsPage />} />
              <Route path="/dev"        element={<DevPortalPage />} />
              <Route path="*"           element={
                <div className="text-center py-24">
                  <div className="ba-display text-[var(--clay)] mb-4">404</div>
                  <p className="text-[var(--ink-2)] mb-6">Page not found.</p>
                  <a href="/" className="ba-link font-medium">← Back to home</a>
                </div>
              } />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
