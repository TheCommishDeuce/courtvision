/** A page section: H2, the question it answers, and a scope note on the right. */
import type { ReactNode } from 'react';

export default function Section({
  id, title, question, note, children, first = false,
}: { id: string; title: string; question?: string; note?: ReactNode; children: ReactNode; first?: boolean }) {
  return (
    <section aria-labelledby={`${id}-h`} className="cv-page-section" style={first ? { borderTop: 0 } : undefined}>
      <div className="cv-section-head" style={{ marginBottom: 20 }}>
        <div>
          <h2 id={`${id}-h`} className="cv-h2">{title}</h2>
          {question && <p className="cv-question">{question}</p>}
        </div>
        {note && <span className="cv-section-note">{note}</span>}
      </div>
      {children}
    </section>
  );
}
