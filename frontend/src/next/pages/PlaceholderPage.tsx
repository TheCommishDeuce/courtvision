/** Stands in for screens built in later phases (docs/design-handoff/BUILD.md › Build order). */
import { useLocation, useParams } from 'react-router-dom';
import { EmptyState } from '../components/States';

export default function PlaceholderPage({ title, phase }: { title: string; phase: number }) {
  const params = useParams();
  const { search } = useLocation();
  const detail = [...Object.entries(params).map(([k, v]) => `${k}: ${v}`), search].filter(Boolean).join(' · ');
  return (
    <main className="cv-main">
      <EmptyState title={title}>
        Built in phase {phase} of the rebuild.{detail && <><br /><span className="cv-mono">{detail}</span></>}
      </EmptyState>
    </main>
  );
}
