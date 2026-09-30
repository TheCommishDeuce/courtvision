/** /tournament/:slug with no year: go to the latest edition. */
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { resolveTournament } from '../api/directory';
import { BlockError, SkeletonRows } from '../components/States';
import type { Tour } from '../lib/filters';
import { tournamentPath } from '../lib/slug';
import NotFoundPage from './NotFoundPage';

export default function TournamentLatestPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const tourParam = params.get('tour');
  const tour: Tour | undefined = tourParam === 'M' || tourParam === 'F' ? tourParam : undefined;
  const q = useQuery({ queryKey: ['resolveTournament', slug, tour], queryFn: () => resolveTournament(slug, tour), retry: false });

  if (q.isPending) return <main className="cv-main" style={{ paddingTop: 40 }}><SkeletonRows rows={3} /></main>;
  if (q.isError) {
    const status = (q.error as { response?: { status?: number } }).response?.status;
    if (status === 404) return <NotFoundPage />;
    return <main className="cv-main" style={{ paddingTop: 40 }}><BlockError onRetry={() => q.refetch()} /></main>;
  }
  const t = q.data.tournaments[0];
  return <Navigate replace to={tournamentPath(t.name, t.last_year ?? '', t.tour)} />;
}
