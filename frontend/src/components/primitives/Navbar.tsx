import { useEffect, useMemo, useRef } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const links = [
  { to: '/', label: 'Home' },
  { to: '/versus', label: 'Versus' },
  { to: '/player', label: 'Player' },
  { to: '/tournament', label: 'Tournament' },
  { to: '/records', label: 'Records' },
  { to: '/search', label: 'Search' },
];

/**
 * Two rows: an identity row that scrolls away, and a sticky section bar.
 *
 * The section bar is one line at every width — it wraps once there is room
 * for six sections and scrolls sideways under the thumb below that, which
 * keeps the sticky chrome to a single row on a phone instead of eating three
 * lines of a 640px-tall screen.
 */
export default function Navbar() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();

  const tour = params.get('tour') ?? 'M';
  const navSearch = useMemo(() => `?tour=${tour}`, [tour]);

  // When the bar is scrolling (phones), centre the section you are on rather
  // than leaving it off the right edge. Set scrollLeft directly instead of
  // scrollIntoView, which would also scroll the page.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const active = list.querySelector<HTMLElement>('.is-active');
    if (!active) return;
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  // The nameplate is established on arrival and shrinks after that: on every
  // other page the data is the point.
  const isFront = pathname === '/';

  return (
    <header className="bg-paper">
      <div className="ba-canvas flex items-center justify-between gap-[var(--space-sm)] py-[var(--space-sm)]">
        <div className="min-w-0 flex flex-wrap items-baseline gap-x-[var(--space-sm)] gap-y-1">
          <NavLink
            to={{ pathname: '/', search: navSearch }}
            className="inline-flex items-baseline gap-2 whitespace-nowrap hover:no-underline"
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-clay shrink-0" />
            <span className={`ba-masthead ${isFront ? '' : 'ba-masthead-sm'}`}>courtvision</span>
          </NavLink>

          {/* Says what the site is, once. Counts belong to the home ledger and
              the currency date to the footer. */}
          <p className="ba-dateline hidden sm:flex">Professional tennis match archive</p>
        </div>

        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      <nav aria-label="Sections" className="ba-nav">
        <div className="ba-canvas">
          <ul ref={listRef} className="ba-nav-list">
            {links.map(l => (
              <li key={l.to}>
                <NavLink
                  to={{ pathname: l.to, search: navSearch }}
                  end={l.to === '/'}
                  className={({ isActive }) => `ba-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
