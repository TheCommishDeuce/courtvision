import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';

export default function NotFoundPage() {
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
