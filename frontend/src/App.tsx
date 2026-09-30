/** courtvision v1 shell and routes (BUILD.md › Routes). */
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { SkeletonRows } from './components/States';
import { legacyRedirect } from './lib/legacy';
import NotFoundPage from './pages/NotFoundPage';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const PlayerPage = lazy(() => import('./pages/player/PlayerPage'));
const VersusPage = lazy(() => import('./pages/versus/VersusPage'));
const TournamentPage = lazy(() => import('./pages/tournament/TournamentPage'));
const RecordsPage = lazy(() => import('./pages/records/RecordsPage'));
const LabPage = lazy(() => import('./pages/lab/LabPage'));
const TournamentLatestPage = lazy(() => import('./pages/TournamentLatestPage'));

/** Old links (query-string entity pages, y0/y1) go to their v1 address. */
function LegacyRedirects() {
  const { pathname, search } = useLocation();
  const target = legacyRedirect(pathname, search);
  return target ? <Navigate replace to={target} /> : null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="cv-app">
      <LegacyRedirects />
      <ScrollToTop />
      {/* Home's hero search owns `/` there. */}
      <SiteHeader pageOwnsSlash={pathname === '/'} />
      <Suspense fallback={<main className="cv-main" style={{ paddingTop: 40 }}><SkeletonRows /></main>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/player/:slug" element={<PlayerPage />} />
          <Route path="/versus" element={<VersusPage />} />
          <Route path="/versus/:a/:b" element={<VersusPage />} />
          <Route path="/tournament" element={<TournamentPage />} />
          <Route path="/tournament/:slug" element={<TournamentLatestPage />} />
          <Route path="/tournament/:slug/:year" element={<TournamentPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="/about" element={<AboutPage />} />
          {/* Retired paths: LegacyRedirects moves them; these keep them off the 404 meanwhile. */}
          <Route path="/player" element={null} />
          <Route path="/search" element={null} />
          <Route path="/leaders" element={null} />
          <Route path="/h2h" element={null} />
          <Route path="/compare" element={null} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <SiteFooter />
    </div>
  );
}
