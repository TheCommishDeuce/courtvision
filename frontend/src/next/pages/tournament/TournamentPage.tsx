/**
 * Tournament: /tournament (browse) and /tournament/:slug/:year (one edition).
 * Brief 03-screens/tournament.md; prototype/Tournament.dc.html.
 * URL state: ?tour=M|F, ?qualifying=1, ?round=QF.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get } from '../../../api/http';
import type { DrawStrengthRow, RecentChampion, TournamentRecap, TournamentStatsLeader } from '../../../types/tennis';
import { resolveTournament } from '../../api/directory';
import MatchList from '../../components/MatchRow';
import SearchBox from '../../components/SearchBox';
import Section from '../../components/Section';
import { BlockError, EmptyState, Skeleton, SkeletonRows } from '../../components/States';
import { SurfaceTag, TourTag } from '../../components/Tags';
import type { Tour } from '../../lib/filters';
import { fmtDate, fmtDayMonth, fmtDuration, fmtInt, fmtRankParen, roundName, tourLabel } from '../../lib/format';
import { fromWinnerLoser } from '../../lib/matches';
import { playerPath, tournamentPath } from '../../lib/slug';
import { championPath, isQualifying, nearestYears, roundTabs } from '../../lib/tournament';
import NotFoundPage from '../NotFoundPage';
import './tournament.css';

const asTour = (v: string | null): Tour | undefined => (v === 'M' || v === 'F' ? v : undefined);
const statusOf = (e: unknown) => (e as { response?: { status?: number } } | null)?.response?.status;
const lastName = (n: string) => n.split(' ').slice(-1)[0];

/** Patch the query string in place (replace, not push). */
function useQueryState() {
  const [params, setParams] = useSearchParams();
  const set = (patch: Record<string, string | null>) =>
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  return [params, set] as const;
}

function TourToggle({ tour, onChange, big = false, available = ['M', 'F'] }: {
  tour: Tour; onChange: (t: Tour) => void; big?: boolean; available?: Tour[];
}) {
  return (
    <div role="group" aria-label="Tour" className="cv-seg cv-seg--bold">
      {(['M', 'F'] as const).map(t => (
        <button
          key={t}
          type="button"
          aria-pressed={tour === t}
          disabled={!available.includes(t)}
          style={big ? { minHeight: 52, padding: '0 18px' } : undefined}
          onClick={() => onChange(t)}
        >
          {tourLabel(t)}
        </button>
      ))}
    </div>
  );
}

// ── Browse ───────────────────────────────────────────────────────────────────

function Browse() {
  const [params, set] = useQueryState();
  const tour = asTour(params.get('tour')) ?? 'M';
  const q = useQuery({
    queryKey: ['champions', 'recent', tour, 20],
    queryFn: () => get<RecentChampion[]>('/tournament/recent-champions', { tour, limit: 20, span: 'recent' }),
  });
  return (
    <main className="cv-main">
      <section className="tn-browse">
        <h1 className="cv-h1">Tournaments</h1>
        <p className="cv-lede" style={{ margin: '6px 0 20px', fontSize: 17 }}>Pick an event to see who won, how, and what happened along the way.</p>
        <div className="tn-browse-row">
          <div className="tn-browse-search">
            <SearchBox kind="tournaments" tour={tour} placeholder="Search tournaments" label="Search tournaments" />
          </div>
          <TourToggle tour={tour} big onChange={t => set({ tour: t === 'M' ? null : t })} />
        </div>
      </section>
      <section className="cv-section" style={{ paddingTop: 32 }}>
        <h2 className="cv-h2" style={{ marginBottom: 14 }}>Latest {tourLabel(tour)} champions</h2>
        {q.isPending && <SkeletonRows rows={8} />}
        {q.isError && <BlockError message="Champions didn’t load." onRetry={() => q.refetch()} />}
        {q.data?.map(c => (
          <Link key={`${c.tournament}${c.year}`} to={tournamentPath(c.tournament, c.year, tour)} className="tn-champ">
            <span style={{ flex: '1 1 220px', fontSize: 17, fontWeight: 600 }}>{c.tournament}</span>
            <span style={{ flex: '2 1 280px', fontSize: 15 }}>
              <strong style={{ fontWeight: 650 }}>{c.winner_name}</strong> <span className="cv-muted">d.</span> {c.loser_name}
            </span>
            <span className="cv-muted" style={{ fontSize: 13, display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <span>{c.level_name}</span><SurfaceTag surface={c.surface} /><span>{fmtDayMonth(c.date)} {c.year}</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}

// ── One edition ──────────────────────────────────────────────────────────────

function Storylines({ recap, strength, scope }: { recap: TournamentRecap; strength: DrawStrengthRow[] | undefined; scope: string }) {
  const runs = (strength ?? []).filter(r => r.matches_played >= 3).slice(0, 5);
  return (
    <Section id="story" title="Storylines" question={scope}>
      <div className="tn-stories">
        <div>
          <h3 className="cv-h3">Biggest upsets</h3>
          {recap.biggest_upsets.length ? recap.biggest_upsets.map(u => {
            const r = u as Record<string, string | number | null>;
            return (
              <div key={`${r.round}${r.winner_name}`} className="tn-story">
                <span className="tn-story-fig">+{Math.round(Number(r.rank_diff))}</span>
                <div style={{ fontSize: 14, minWidth: 0 }}>
                  <div>
                    <Link to={playerPath(String(r.winner_name))} style={{ fontWeight: 650 }}>{r.winner_name}</Link>{' '}
                    <span className="cv-muted">{fmtRankParen(r.winner_rank as number)} d.</span>{' '}
                    <Link to={playerPath(String(r.loser_name))}>{r.loser_name}</Link>{' '}
                    <span className="cv-muted">{fmtRankParen(r.loser_rank as number)}</span>
                  </div>
                  <div className="tn-story-sub">{r.round} · {r.score}</div>
                </div>
              </div>
            );
          }) : <p className="cv-muted">No ranked upsets.</p>}
        </div>
        <div>
          <h3 className="cv-h3">
            Longest matches
            <abbr className="tn-caveat" title="Some recorded durations are implausible; check before quoting.">durations can be wrong</abbr>
          </h3>
          {recap.longest_matches.length ? recap.longest_matches.map(x => {
            const r = x as Record<string, string | number | null>;
            return (
              <div key={`${r.round}${r.winner_name}`} className="tn-story">
                <span className="tn-story-fig">{fmtDuration(r.time as number)}</span>
                <div style={{ fontSize: 14, minWidth: 0 }}>
                  <div>
                    <Link to={playerPath(String(r.winner_name))} style={{ fontWeight: 650 }}>{r.winner_name}</Link>{' '}
                    <span className="cv-muted">d.</span> <Link to={playerPath(String(r.loser_name))}>{r.loser_name}</Link>
                  </div>
                  <div className="tn-story-sub">{r.round} · {r.score}</div>
                </div>
              </div>
            );
          }) : <p className="cv-muted">No match durations recorded.</p>}
        </div>
        <div>
          <h3 className="cv-h3">
            Toughest runs <span className="cv-muted" style={{ fontWeight: 400, fontSize: 13 }}>· average rank of opponents faced, lower = tougher</span>
          </h3>
          {runs.length ? runs.map(r => (
            <div key={r.player_name} className="tn-story">
              <span className="tn-story-fig">{r.avg_opp_rank.toFixed(1)}</span>
              <div style={{ fontSize: 14, minWidth: 0 }}>
                <Link to={playerPath(r.player_name)} style={{ fontWeight: 650 }}>{r.player_name}</Link>
                <div className="cv-muted" style={{ fontSize: 13 }}>
                  {r.matches_played} matches · best opponent #{Math.round(r.best_opp_rank)}
                </div>
              </div>
            </div>
          )) : <p className="cv-muted">No player with three ranked opponents.</p>}
        </div>
      </div>
    </Section>
  );
}

const LEADER_BOARDS: { key: keyof TournamentRecap['stats']; title: string; pct: boolean }[] = [
  { key: 'aces', title: 'Aces', pct: false },
  { key: 'dfs', title: 'Double faults', pct: false },
  { key: 'first_serve_won_pct', title: '1st serve won', pct: true },
  { key: 'second_serve_won_pct', title: '2nd serve won', pct: true },
  { key: 'return_win_pct', title: 'Return points won', pct: true },
  { key: 'bp_saved', title: 'Break points saved', pct: false },
];

function StatLeaders({ recap, scope }: { recap: TournamentRecap; scope: string }) {
  const empty = LEADER_BOARDS.every(b => !recap.stats[b.key]?.length);
  return (
    <Section id="lead" title="Stat leaders" question={scope}>
      {empty ? <p className="cv-muted">No point statistics for this event.</p> : (
        <div className="tn-leaders">
          {LEADER_BOARDS.map(b => (
            <div key={b.key}>
              <h3 className="tn-leader-h">{b.title}</h3>
              {(recap.stats[b.key] ?? []).map((r: TournamentStatsLeader, i) => {
                const v = Number(r[b.key]);
                return (
                  <div key={r.player} className="tn-leader">
                    <span className="cv-muted" style={{ width: 16, fontSize: 12 }}>{i + 1}</span>
                    <Link to={playerPath(r.player)}>{r.player}</Link>
                    <span style={{ fontWeight: 700 }}>{b.pct ? `${v.toFixed(1)}%` : fmtInt(v)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Edition({ name, tour, year, years, tours }: { name: string; tour: Tour; year: number; years: number[]; tours: Tour[] }) {
  const navigate = useNavigate();
  const [params, set] = useQueryState();
  const showQ = params.get('qualifying') === '1';
  const recapQ = useQuery({
    queryKey: ['recap', name, year, tour, showQ],
    queryFn: () => get<TournamentRecap>('/tournament/recap', { tournament: name, year, tour, main_draw_only: !showQ }),
  });
  const strengthQ = useQuery({
    queryKey: ['draw-strength', name, year, tour, showQ],
    queryFn: () => get<DrawStrengthRow[]>('/tournament/draw-strength', { tournament: name, year, tour, main_draw_only: !showQ }),
  });
  const held = years.includes(year);
  const idx = years.indexOf(year);
  const prev = held ? years[idx - 1] : years.filter(y => y < year).at(-1);
  const next = held ? years[idx + 1] : years.find(y => y > year);
  const goYear = (y: number) => navigate(tournamentPath(name, y, tour) + (showQ ? '&qualifying=1' : ''));

  const recap = recapQ.data;
  const groups = recap?.matches_by_round ?? [];
  const final = groups.find(g => g.round === 'F')?.matches[0];
  const champion = final?.winner_name;
  const tabs = roundTabs(groups, showQ);
  const round = params.get('round');
  const current = round && tabs.includes(round) ? round : tabs[0];
  const path = champion ? championPath(groups, champion) : [];
  const matches = (groups.find(g => g.round === current)?.matches ?? []).map(r => fromWinnerLoser(
    { ...r, date: r.date ?? recap?.meta.date ?? '', tournament: name, tour, year, surface: recap?.meta.surface },
    undefined,
    champion && r.winner_name === champion ? { mark: { glyph: '◆', label: `${champion}’s match` } } : undefined,
  ));
  const qCount = recap?.meta.qualifying_matches ?? 0;
  const scope = showQ
    ? 'Main draw and qualifying · qualifiers who played extra rounds can top the counting lists'
    : 'Main draw only · rates need 2+ matches with point data';

  return (
    <main className="cv-main">
      <section className="tn-top">
        <div className="tn-nav">
          <Link to={`/tournament${tour === 'F' ? '?tour=F' : ''}`} style={{ fontSize: 14 }}>← All tournaments</Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {tours.length > 1 && (
              <TourToggle tour={tour} available={tours} onChange={t => navigate(tournamentPath(name, year, t))} />
            )}
            <div className="tn-years">
              <button type="button" aria-label={prev ? `Previous edition: ${name} ${prev}` : 'No earlier edition'} disabled={!prev} onClick={() => prev && goYear(prev)}>‹</button>
              <select aria-label="Jump to year" value={held ? year : ''} onChange={e => goYear(Number(e.target.value))}>
                {!held && <option value="">{year}</option>}
                {[...years].reverse().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" aria-label={next ? `Next edition: ${name} ${next}` : 'Latest edition'} disabled={!next} onClick={() => next && goYear(next)}>›</button>
            </div>
          </div>
        </div>
        <div className="tn-meta">
          <TourTag tour={tour} />
          {recap?.meta.level_name && <span>{recap.meta.level_name}</span>}
          {recap?.meta.surface && <SurfaceTag surface={recap.meta.surface} />}
          {recap && held && recap.meta.total_matches > 0 && (
            <span>Starts {fmtDate(recap.meta.date)} · {recap.meta.main_draw_matches ?? recap.meta.total_matches} main-draw matches</span>
          )}
        </div>
        <h1 className="tn-title">{name} {year}</h1>
        {final && (
          <div className="tn-final">
            <div className="cv-eyebrow">Final</div>
            <div className="tn-final-line">
              <span className="tn-final-names">
                <Link to={playerPath(final.winner_name)}>{final.winner_name}</Link>{' '}
                <span className="tn-final-rank">{fmtRankParen(final.winner_rank)}</span>{' '}
                <span style={{ fontWeight: 400, color: 'var(--ink2)' }}>d.</span>{' '}
                <Link to={playerPath(final.loser_name)} style={{ fontWeight: 600 }}>{final.loser_name}</Link>{' '}
                <span className="tn-final-rank">{fmtRankParen(final.loser_rank)}</span>
              </span>
              <span className="tn-final-score">{final.score}</span>
              {final.time ? <span className="cv-muted" style={{ fontSize: 14 }}>{fmtDuration(final.time)}</span> : null}
            </div>
          </div>
        )}
      </section>

      {!held && (
        <EmptyState
          title={`No ${year} edition`}
          action={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {nearestYears(years, year).map(y => (
                <button key={y} type="button" className="cv-btn" onClick={() => goYear(y)}>{name} {y}</button>
              ))}
            </div>
          }
        >
          {name} wasn’t held in {year}, or isn’t in the data. The nearest editions:
        </EmptyState>
      )}

      {held && recapQ.isPending && <SkeletonRows rows={8} />}
      {held && recapQ.isError && <BlockError message="This recap didn’t load." onRetry={() => recapQ.refetch()} />}
      {held && recap && (
        <>
          <Section id="draw" title="The draw" question={champion ? `Round by round. ${lastName(champion)}’s matches are marked ◆.` : 'Round by round.'} first
            note={qCount > 0 ? (
              <label className="tn-check">
                <input type="checkbox" checked={showQ} onChange={e => set({ qualifying: e.target.checked ? '1' : null, round: null })} />
                Show qualifying ({qCount} matches)
              </label>
            ) : undefined}
          >
            {champion && path.length > 0 && (
              <div className="tn-path">
                <span style={{ fontWeight: 700 }}>{lastName(champion)}’s path</span>
                <span className="tn-path-steps">
                  {path.map(p => (
                    <button key={p.round} type="button" onClick={() => set({ round: p.round })}>
                      <span className="cv-mono cv-muted">{p.round}</span> d. {lastName(p.opponent)}
                    </button>
                  ))}
                </span>
              </div>
            )}
            <div role="tablist" aria-label="Round" className="tn-tabs">
              {tabs.map(r => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={r === current}
                  title={roundName(r)}
                  className="tn-tab"
                  onClick={() => set({ round: r === tabs[0] ? null : r })}
                >
                  {r}
                </button>
              ))}
            </div>
            {current && (
              <div role="tabpanel" aria-label={roundName(current)}>
                <p style={{ margin: '8px 0 6px', fontSize: 15, fontWeight: 600 }}>
                  {roundName(current)} <span className="cv-muted" style={{ fontWeight: 400, fontSize: 14 }}>· {matches.length} match{matches.length === 1 ? '' : 'es'}{isQualifying(current) ? ' · qualifying' : ''}</span>
                </p>
                <MatchList matches={matches} />
              </div>
            )}
          </Section>
          {strengthQ.isError
            ? <BlockError message="Storylines didn’t load." onRetry={() => strengthQ.refetch()} />
            : <Storylines recap={recap} strength={strengthQ.data} scope={scope} />}
          <StatLeaders recap={recap} scope={scope} />
        </>
      )}
      {held && !recapQ.isPending && !recap && !recapQ.isError && <Skeleton><div /></Skeleton>}
    </main>
  );
}

function EditionRoute() {
  const { slug = '', year = '' } = useParams();
  const [params] = useSearchParams();
  const tour = asTour(params.get('tour'));
  const q = useQuery({ queryKey: ['resolveTournament', slug], queryFn: () => resolveTournament(slug), retry: false });
  const y = Number(year);

  if (q.isPending) return <main className="cv-main" style={{ paddingTop: 48 }}><SkeletonRows rows={4} /></main>;
  if (q.isError) {
    if (statusOf(q.error) === 404) return <NotFoundPage />;
    return <main className="cv-main" style={{ paddingTop: 48 }}><BlockError message="This tournament didn’t load." onRetry={() => q.refetch()} /></main>;
  }
  if (!Number.isInteger(y)) return <NotFoundPage />;
  const all = q.data.tournaments;
  // Prefer the requested tour; else the tour that held this year; else the first.
  const t = (tour && all.find(x => x.tour === tour)) || all.find(x => x.years.includes(y)) || all[0];
  return <Edition key={`${t.tour}:${t.name}:${y}`} name={t.name} tour={t.tour} year={y} years={t.years} tours={all.map(x => x.tour)} />;
}

export default function TournamentPage() {
  const { slug } = useParams();
  return slug ? <EditionRoute /> : <Browse />;
}
