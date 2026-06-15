import { useMemo } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useMetaStats } from '../../hooks';

const links = [
  { to: '/', label: 'home' },
  { to: '/h2h', label: 'h2h' },
  { to: '/player', label: 'player' },
  { to: '/compare', label: 'compare' },
  { to: '/tournament', label: 'tournament' },
  { to: '/leaders', label: 'leaders' },
  { to: '/records', label: 'records' },
  { to: '/search', label: 'search' },
];

function linkClass(isActive: boolean) {
  const base =
    'inline-flex items-center py-1 text-[13px] lowercase tracking-wide border-b-2 transition-colors ba-mono';
  return isActive
    ? `${base} text-[var(--ink)] border-[var(--clay)]`
    : `${base} text-[var(--ink-2)] border-transparent hover:text-[var(--ink)] hover:border-[var(--clay)]`;
}

export default function Navbar() {
  const [params] = useSearchParams();
  const { data: stats } = useMetaStats();

  const tour = params.get('tour') ?? 'M';
  const navSearch = useMemo(() => `?tour=${tour}`, [tour]);
  const dataThrough = stats?.data_through ? stats.data_through.slice(0, 10) : '—';

  return (
    <nav className="bg-[var(--bone)] border-b border-[var(--rule)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <NavLink to={{ pathname: '/', search: navSearch }} className="whitespace-nowrap">
            <span className="ba-display text-[26px] leading-none tracking-tight">
              courtvision
            </span>
          </NavLink>
          <div className="flex items-center gap-x-5 gap-y-1 flex-wrap">
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

        <div className="ba-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--mute)] flex items-center gap-4 whitespace-nowrap">
          <NavLink
            to={{ pathname: '/docs', search: navSearch }}
            className={({ isActive }) => linkClass(isActive)}
          >
            API
          </NavLink>
          <div className="flex items-center gap-2">
            <span>Data Through</span>
            <span className="text-[var(--ink-2)]">{dataThrough}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
