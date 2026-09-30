import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <main className="cv-main">
      <EmptyState
        title="That address isn’t part of courtvision"
        action={<Link to="/" className="cv-btn">Go to the home page</Link>}
      >
        Check the link, or search for a player or tournament above.
      </EmptyState>
    </main>
  );
}
