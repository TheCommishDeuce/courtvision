/**
 * Player: /player/:slug (brief 03-screens/player.md; prototype/Player.dc.html).
 * `?tour=` picks between two players who share a slug; filters are
 * surface / level / from / to in the query string.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchSuggestions, resolvePlayer, type DirectoryPlayer } from '../../api/directory';
import type { PlayerFilterParams } from '../../api/player';
import FilterBar from '../../components/FilterBar';
import SearchBox from '../../components/SearchBox';
import { playerItem } from '../../components/searchItems';
import { BlockError, SkeletonRows } from '../../components/States';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters, type FilterKey } from '../../hooks/useFilters';
import { countActive, describeFilters, LEVELS, toApiParams, type Filters, type Tour } from '../../lib/filters';
import { record } from '../../lib/format';
import CareerShape from './CareerShape';
import { Milestones, RecentMatches, ServeReturn, TopN } from './Blocks';
import { useFilteredSummary } from './data';
import Form from './Form';
import Identity from './Identity';
import Splits from './Splits';
import './player.css';

const FILTER_KEYS: readonly FilterKey[] = ['surface', 'level', 'from', 'to'];
const CURRENT_YEAR = new Date().getFullYear();

const asTour = (v: string | null): Tour | undefined => (v === 'M' || v === 'F' ? v : undefined);
const statusOf = (e: unknown) => (e as { response?: { status?: number } } | null)?.response?.status;

function NotFound({ slug }: { slug: string }) {
  const guess = slug.replace(/-/g, ' ');
  const q = useQuery({ queryKey: ['suggest-nf', guess], queryFn: () => fetchSuggestions({ q: guess, kind: 'players', limit: 5 }) });
  // Try the surname alone too, for typos in the first name.
  const last = guess.split(' ').slice(-1)[0];
  const q2 = useQuery({
    queryKey: ['suggest-nf', last], queryFn: () => fetchSuggestions({ q: last, kind: 'players', limit: 5 }),
    enabled: !!q.data && !q.data.players.length && last !== guess,
  });
  const found = q.data?.players.length ? q.data.players : q2.data?.players ?? [];
  return (
    <main className="cv-main">
      <div className="pl-notfound">
        <p className="cv-eyebrow" style={{ margin: '0 0 8px' }}>Player not found</p>
        <h1>No player called ‘{slug}’</h1>
        {found.length > 0 && (
          <>
            <p className="cv-muted" style={{ margin: '16px 0 8px' }}>Did you mean</p>
            <div style={{ borderTop: '1px solid var(--line)' }}>
              {found.map(p => {
                const item = playerItem(p);
                return (
                  <Link key={item.key} to={item.href} className="pl-suggest">
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span>
                    <span className="cv-muted" style={{ fontSize: 14 }}>{item.tag} · {item.sub}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
        <p className="cv-muted" style={{ margin: '28px 0 10px' }}>Or search again</p>
        <div style={{ height: 52, fontSize: 17 }}><SearchBox /></div>
      </div>
    </main>
  );
}

function PlayerBody({ player, namesakes }: { player: DirectoryPlayer; namesakes: DirectoryPlayer[] }) {
  useDocumentTitle(player.name);
  const who = useMemo(() => ({ player: player.name, tour: player.tour }), [player.name, player.tour]);
  const defaults = useMemo<Filters>(() => ({ tour: player.tour, surface: 'All', level: 'All', from: null, to: null }), [player.tour]);
  const { filters, setFilters, resetFilters } = useFilters(defaults, FILTER_KEYS);
  const active = countActive(filters, defaults);
  const api = toApiParams(filters);
  const params: PlayerFilterParams = useMemo(
    () => ({ player: player.name, tour: player.tour, surface: api.surface, level: api.level, year_min: api.year_min, year_max: api.year_max }),
    [player.name, player.tour, api.surface, api.level, api.year_min, api.year_max],
  );
  const filtered = useFilteredSummary(params, active > 0);
  const surname = player.name.split(' ').slice(-1)[0];
  const span: [number, number] = [player.first_year ?? 1968, player.last_year ?? CURRENT_YEAR];
  const summary = describeFilters(filters, `Whole career (${span[0]}–${span[1]})`, span);
  const scope = [
    filters.surface === 'All' ? 'All surfaces' : filters.surface,
    LEVELS[player.tour].find(l => l.value === filters.level)?.summary || 'All levels',
  ].join(' · ');

  const f = filtered.data;
  const empty = active > 0 && f?.total === 0;
  const detail = active === 0
    ? 'Career figures'
    : f ? (f.total ? `${record(f.wins, f.losses).wl} · ${record(f.wins, f.losses).pct} · ${f.total} matches` : 'No matches') : '…';
  const emptyWhy = filters.surface !== 'All' && filters.level === 'All' && filters.from == null && filters.to == null
    ? `${player.name} has never played a match on ${filters.surface.toLowerCase()}.`
    : `${player.name} has no matches for this combination.`;

  return (
    <main className="cv-main">
      <Identity who={who} namesakes={namesakes} />
      <div className="cv-filterbar--bleed" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <FilterBar
          value={filters}
          onChange={setFilters}
          onReset={resetFilters}
          active={active}
          summary={summary}
          detail={detail}
          yearMin={span[0]}
          yearMax={span[1]}
        />
      </div>
      {filtered.isError && <div style={{ marginTop: 20 }}><BlockError message="The filtered record didn’t load." onRetry={() => filtered.refetch()} /></div>}
      {empty ? (
        <section className="cv-empty" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="cv-h2">No matches for {summary}</h2>
          <p>{emptyWhy} Every filtered block on this page is empty; the milestones below are career figures.</p>
          <button type="button" className="cv-btn cv-btn--primary" onClick={resetFilters}>Reset filters</button>
        </section>
      ) : (
        <>
          <Form params={params} surname={surname} scope={scope} />
          <CareerShape who={who} params={params} filters={filters} scope={scope} />
          <TopN params={params} surname={surname} scope={summary} />
          <Splits params={params} surname={surname} scope={summary} />
          <ServeReturn who={who} params={params} scope={summary} />
        </>
      )}
      <Milestones who={who} surname={surname} />
      {!empty && <RecentMatches who={who} params={params} filters={filters} scope={summary} />}
    </main>
  );
}

export default function PlayerPage() {
  const { slug = '' } = useParams();
  const [search] = useSearchParams();
  const tour = asTour(search.get('tour'));
  const q = useQuery({ queryKey: ['resolvePlayer', slug], queryFn: () => resolvePlayer(slug), retry: false });

  if (q.isPending) return <main className="cv-main" style={{ paddingTop: 48 }}><SkeletonRows rows={4} /></main>;
  if (q.isError) {
    if (statusOf(q.error) === 404) return <NotFound slug={slug} />;
    return <main className="cv-main" style={{ paddingTop: 48 }}><BlockError message="This player didn’t load." onRetry={() => q.refetch()} /></main>;
  }
  const all = q.data.players;
  const player = (tour && all.find(p => p.tour === tour)) || all[0];
  // Re-key on the player so filter state and open rows never leak between players.
  return <PlayerBody key={`${player.tour}:${player.name}`} player={player} namesakes={all.filter(p => p !== player)} />;
}
