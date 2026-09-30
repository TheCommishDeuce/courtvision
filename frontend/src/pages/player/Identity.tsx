/** Identity header: always the whole career (brief 03-screens/player.md › 1). */
import { Link } from 'react-router-dom';
import type { DirectoryPlayer } from '../../api/directory';
import CopyButton from '../../components/CopyButton';
import { SkelBar, Skeleton } from '../../components/States';
import { TourTag } from '../../components/Tags';
import { countryName } from '../../lib/country';
import { fmtDate, fmtRank, record } from '../../lib/format';
import { firstAtOrBetter } from '../../lib/playerCharts';
import { fillSearch } from '../../lib/searchBus';
import { playerPath } from '../../lib/slug';
import { useCareerSummary, useRankHistory, type Who } from './data';

const HAND: Record<string, string> = { R: 'right-handed', L: 'left-handed' };

function IdentitySkeleton() {
  return (
    <Skeleton label="Loading player">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SkelBar width={90} height={14} />
        <SkelBar width="min(420px, 80%)" height={52} />
        <SkelBar width="min(520px, 90%)" height={16} />
        <div className="pl-figures" style={{ borderTop: 0 }}>
          {[0, 1, 2, 3].map(i => <SkelBar key={i} height={64} />)}
        </div>
      </div>
    </Skeleton>
  );
}

export default function Identity({ who, namesakes }: { who: Who; namesakes: DirectoryPlayer[] }) {
  const summary = useCareerSummary(who);
  const ranks = useRankHistory(who);

  if (summary.isPending) return <section className="pl-identity"><IdentitySkeleton /></section>;
  const s = summary.data;
  const rec = s ? record(s.wins, s.losses) : null;
  const history = ranks.data ?? [];
  const current = history[history.length - 1];
  const high = s?.career_high_rank ?? null;
  const reachedHigh = high != null ? firstAtOrBetter(history, high) : undefined;

  return (
    <section className="pl-identity" aria-label="Player">
      <div className="pl-kicker">
        <TourTag tour={who.tour} />
        {s?.country && <span>{countryName(s.country)}</span>}
      </div>
      <h1 className="pl-name">{who.player}</h1>
      {s && (
        <div className="pl-facts">
          {s.age != null && s.birthdate && <span>Age {s.age} (born {fmtDate(s.birthdate)})</span>}
          {s.hand && HAND[s.hand] && <span>Plays {HAND[s.hand]}</span>}
          {s.height ? <span>{Math.round(s.height)} cm</span> : null}
        </div>
      )}
      {s && rec && (
        <div className="pl-figures">
          <div>
            <div className="pl-fig-label">Career record</div>
            <div className="pl-fig-value">{rec.pct}</div>
            <div className="pl-fig-sub">{rec.wl} · {s.total.toLocaleString('en-US')} matches</div>
          </div>
          <div>
            <div className="pl-fig-label">Latest rank</div>
            <div className="pl-fig-value">{current ? fmtRank(current.rank) : '—'}</div>
            <div className="pl-fig-sub">{current ? `at their last match, ${fmtDate(current.date)}` : 'no ranking on record'}</div>
          </div>
          <div>
            <div className="pl-fig-label">Career high</div>
            <div className="pl-fig-value">{fmtRank(high)}</div>
            <div className="pl-fig-sub">{reachedHigh ? `first reached ${fmtDate(reachedHigh.date)}` : '—'}</div>
          </div>
          <div>
            <div className="pl-fig-label">Titles</div>
            <div className="pl-fig-value">{s.gs_titles} · {s.tour_titles} · {s.challenger_titles} · {s.itf_titles}</div>
            <div className="pl-fig-sub">Slams · tour · Challenger · ITF</div>
          </div>
        </div>
      )}
      {summary.isError && <p className="cv-muted">The career summary didn’t load.</p>}
      <div className="pl-actions">
        <button type="button" className="cv-btn cv-btn--primary" onClick={() => fillSearch('header', `${who.player} vs `)}>
          Compare with…
        </button>
        <CopyButton />
        <CopyButton what="citation" />
      </div>
      {namesakes.length > 0 && (
        <p className="pl-namesake">
          Also on record under this name:{' '}
          {namesakes.map((n, i) => (
            <span key={n.tour}>
              {i > 0 && ', '}
              <Link to={playerPath(n.name, n.tour)}>{n.name} ({n.tour === 'F' ? 'WTA' : 'ATP'})</Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
