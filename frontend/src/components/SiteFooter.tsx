/** Site footer: freshness, scale, credit (DESIGN.md › Shell › Footer). */
import { Link } from 'react-router-dom';
import { useMetaStats } from '../hooks';
import { fmtDate, fmtInt } from '../lib/format';

export default function SiteFooter() {
  const { data } = useMetaStats();
  return (
    <footer className="cv-footer">
      <div className="cv-footer-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="cv-footer-fresh">
            {data?.data_through ? `Data through ${fmtDate(data.data_through)}` : 'courtvision'}
          </div>
          {data && (
            <div className="cv-footer-scale">
              {fmtInt(data.total_matches)} matches · {data.year_min}–{data.year_max} · ATP &amp; WTA
            </div>
          )}
        </div>
        <div className="cv-footer-links">
          <span>
            Match data from{' '}
            <a className="cv-ink-link" href="https://www.tennisabstract.com" target="_blank" rel="noopener noreferrer">
              Tennis Abstract / Jeff Sackmann
            </a>
          </span>
          <Link to="/about">About the data</Link>
        </div>
      </div>
    </footer>
  );
}
