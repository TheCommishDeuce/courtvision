import { useMemo } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useMetaStats } from '../../hooks';

const links = [
  { to: '/', label: 'Home' },
  { to: '/versus', label: 'Versus' },
  { to: '/player', label: 'Player' },
  { to: '/tournament', label: 'Tournament' },
  { to: '/records', label: 'Records' },
  { to: '/search', label: 'Search' },
];

function linkClass(isActive: boolean) {
  const base =
    'inline-flex items-center h-8 px-3 ba-mono text-[10.5px] font-semibold tracking-[0.13em] uppercase ' +
    'whitespace-nowrap border-b-2 transition-colors';
  return isActive
    ? `${base} text-[var(--ink)] border-[var(--clay)] bg-[var(--clay-wash)]`
    : `${base} text-[var(--ink-2)] border-transparent hover:text-[var(--ink)] hover:bg-[var(--paper-sunken)]`;
}

export default function Navbar() {
  const [params] = useSearchParams();
  const { data: stats } = useMetaStats();

  const tour = params.get('tour') ?? 'M';
  const navSearch = useMemo(() => `?tour=${tour}`, [tour]);
  const dataThrough = stats?.data_through ? stats.data_through.slice(0, 10) : '—';

  return (
    <header className="bg-[var(--paper)]">
      {/* Masthead: wordmark and dateline, the way a broadsheet nameplate sits
          above the section bar. */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-1.5 flex items-end justify-between gap-4">
        <NavLink to={{ pathname: '/', search: navSearch }} className="whitespace-nowrap">
          <span className="ba-display text-[30px] sm:text-[34px] leading-none tracking-[-0.02em]">
            courtvision
          </span>
        </NavLink>
        <dl className="hidden sm:block text-right">
          <dt className="ba-label">Data through</dt>
          <dd className="ba-mono text-[11px] text-[var(--ink)]">{dataThrough}</dd>
        </dl>
      </div>

      {/* Section bar. Scrolls sideways on narrow screens rather than
          collapsing behind a menu — eight sections is an index, not a menu. */}
      <nav aria-label="Sections" className="ba-double-rule border-t border-[var(--ink)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="ba-scroller -mx-1">
            <div className="flex items-stretch divide-x divide-[var(--rule)]">
              {links.map(l => (
                <NavLink
                  key={l.to}
                  to={{ pathname: l.to, search: navSearch }}
                  end={l.to === '/'}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
