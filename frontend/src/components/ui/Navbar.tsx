import { useMemo } from 'react';
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

export default function Navbar() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();

  const tour = params.get('tour') ?? 'M';
  const navSearch = useMemo(() => `?tour=${tour}`, [tour]);

  // The nameplate runs full size on the front page and drops to a lockup
  // everywhere else: it is established on arrival, and after that the data is
  // the point.
  const isFront = pathname === '/';

  return (
    <header className="bg-[var(--paper)]">
      {/* Masthead. A broadsheet nameplate over its dateline, above the
          section bar. */}
      <div
        className={`ba-canvas flex flex-wrap items-end justify-between gap-x-6 gap-y-2 ${
          isFront ? 'pt-[var(--space-md)] pb-[var(--space-xs)]' : 'pt-[var(--space-sm)] pb-[var(--space-2xs)]'
        }`}
      >
        <div className="min-w-0">
          <NavLink
            to={{ pathname: '/', search: navSearch }}
            className="ba-masthead-link inline-flex items-end whitespace-nowrap hover:no-underline"
          >
            <span className={`ba-masthead ${isFront ? '' : 'ba-masthead-sm'}`}>courtvision</span>
          </NavLink>

          {/* The dateline says what the paper is, and nothing else. The counts
              belong to the front-page ledger and the currency date to the
              footer's provenance block; repeating either here put the same
              figure on screen twice. */}
          <p className="ba-dateline mt-[var(--space-2xs)]">Professional tennis match archive</p>
        </div>

        <div className="shrink-0 pb-[2px]">
          <ThemeToggle />
        </div>
      </div>

      {/* Section bar. Sticks, so the index survives a long Records page.
          It wraps rather than scrolling sideways: six sections is an index,
          not a menu, and a wrapped index keeps every section reachable
          without a horizontal drag that hides half of them off-screen. */}
      <nav aria-label="Sections" className="ba-nav ba-double-rule border-t border-[var(--rule-ink)]">
        <div className="ba-canvas">
          <ul className="flex flex-wrap items-stretch border-l border-[var(--rule)]">
            {links.map(l => (
              <li key={l.to} className="border-r border-[var(--rule)]">
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
