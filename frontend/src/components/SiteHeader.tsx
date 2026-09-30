/** Site header (DESIGN.md › Shell › Header). */
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useIsPhone } from '../hooks/useViewport';
import { THEME_LABEL, THEMES, useTheme } from '../hooks/useTheme';
import { onSearchFill } from '../lib/searchBus';
import SearchBox, { MagnifierIcon } from './SearchBox';

const NAV = [
  { to: '/records', label: 'Records' },
  { to: '/tournament', label: 'Tournaments' },
  { to: '/lab', label: 'Lab' },
];

function Nav({ phone }: { phone: boolean }) {
  return (
    <nav aria-label="Main" className={phone ? 'cv-nav cv-nav--phone' : 'cv-nav'}>
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to}>{n.label}</NavLink>
      ))}
    </nav>
  );
}

export interface SiteHeaderProps {
  /** The page has its own search that owns `/` (Home's hero). */
  pageOwnsSlash?: boolean;
}

export default function SiteHeader({ pageOwnsSlash = false }: SiteHeaderProps) {
  const phone = useIsPhone();
  const [theme, setTheme] = useTheme();
  const [sheet, setSheet] = useState<{ q: string } | null>(null);

  // A page asking to fill the header search opens the sheet on phones.
  useEffect(() => onSearchFill(fill => {
    if (fill.channel === 'header' && phone) setSheet({ q: fill.q });
  }), [phone]);

  // On phones `/` opens the sheet (the header has no inline box to focus).
  useEffect(() => {
    if (!phone || pageOwnsSlash) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (e.key === '/' && !(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) {
        e.preventDefault();
        setSheet({ q: '' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phone, pageOwnsSlash]);

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  return (
    <header className="cv-header">
      <div className="cv-header-row">
        <Link to="/" className="cv-wordmark" aria-label="courtvision home">courtvision</Link>
        {!phone && (
          <>
            <div className="cv-header-search">
              <SearchBox channel="header" slashFocus={!pageOwnsSlash} />
            </div>
            <Nav phone={false} />
            <div role="group" aria-label="Theme" className="cv-seg cv-seg--small" style={{ flex: 'none' }}>
              {THEMES.map(t => (
                <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
                  {THEME_LABEL[t]}
                </button>
              ))}
            </div>
          </>
        )}
        {phone && (
          <div className="cv-phone-actions">
            <button type="button" className="cv-icon-btn" aria-label="Search" onClick={() => setSheet({ q: '' })}>
              <MagnifierIcon size={20} />
            </button>
            <button
              type="button"
              className="cv-theme-cycle"
              aria-label={`Theme: ${THEME_LABEL[theme]}. Change to ${THEME_LABEL[next]}`}
              onClick={() => setTheme(next)}
            >
              {THEME_LABEL[theme]}
            </button>
          </div>
        )}
      </div>
      {phone && <Nav phone />}
      {phone && sheet && (
        <div role="dialog" aria-modal="true" aria-label="Search" className="cv-sheet">
          <div className="cv-sheet-row">
            <div className="cv-sheet-search">
              <SearchBox autoFocus initialQuery={sheet.q} onEscape={() => setSheet(null)} />
            </div>
            <button type="button" className="cv-sheet-cancel" onClick={() => setSheet(null)}>Cancel</button>
          </div>
        </div>
      )}
    </header>
  );
}
