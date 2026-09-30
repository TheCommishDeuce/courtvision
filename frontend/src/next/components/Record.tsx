/** "64.4% · 67–37", with a low-sample mark under 10 matches (brief principle 2). */
import { record } from '../lib/format';

export default function Record({ wins, losses, inline = true }: { wins: number; losses: number; inline?: boolean }) {
  const r = record(wins, losses);
  return (
    <span className={r.low ? 'cv-record cv-record--low' : 'cv-record'}>
      <span className="cv-record-pct">{r.pct}</span>
      {inline ? ' · ' : <br />}
      <span className="cv-muted">{r.wl}</span>
      {r.low && r.total > 0 && (
        <>
          {' '}
          <abbr className="cv-low-sample" title={`Only ${r.total} match${r.total === 1 ? '' : 'es'}`}>low sample</abbr>
        </>
      )}
    </span>
  );
}
