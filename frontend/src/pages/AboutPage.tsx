/** About the data (About.dc.html; brief 04-data-dictionary.md). */
import { useMetaStats } from '../hooks';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fmtDate, fmtInt } from '../lib/format';
import { MIN_RATE_MATCHES } from '../lib/constants';

const CAVEATS: [string, string][] = [
  ['Match durations', 'Some are implausible, such as multi-hour straight-sets Challengers. About 19 bad rows sort above Isner–Mahut, so every “longest” list carries a caveat.'],
  ['Missing ranks', 'Many older and lower-tier matches have no rank. Unranked is shown as —, never 0, and affects upsets, rank gaps and records against the top N.'],
  ['Implausible ace counts', 'Some lower-tier and WTA stat lines hold impossible ace totals. Single-match ace lists are limited to ATP tour level.'],
  ['Qualifying inside events', 'Qualifying rounds are stored with their tournament. Tournament pages default to the main draw; qualifying is behind a toggle.'],
  ['Event names', 'Spellings of one event are merged (’s-Hertogenbosch, Stuttgart), but real renames are not: an event that changed its name appears under each name.'],
  ['Thin samples', `Leaderboards need at least 10 matches (counting boards) or ${MIN_RATE_MATCHES} matches with point data (rate boards). Any record under 10 matches is marked “low sample”.`],
];

const TERMS: [string, string][] = [
  ['Tour level', 'Every main-tour event, main draw only. Excludes Challenger and ITF.'],
  ['Rank', 'The official ranking at the time of the match. Lower is better.'],
  ['Upset', 'The winner was ranked lower than the loser. Only defined when both ranks are known.'],
  ['Retirement / walkover', 'Retirements (RET) count in records. Walkovers (W/O) were never played and are excluded.'],
  ['Deciding set', 'The 3rd set in best-of-3, the 5th in best-of-5.'],
  ['Bagel / breadstick', 'A 6–0 / 6–1 set. “Given” means won by the player; “received” means lost.'],
  ['Draw strength', 'Average rank of the opponents a player beat at one event. Lower is tougher.'],
  ['Percentile vs tour', 'Where a career figure ranks among players on the same tour with enough matches (about 2,500 ATP). 99 = better than 99%.'],
  ['Serve and return figures', 'Computed only over matches with point statistics; that match count is shown next to them.'],
];

export default function AboutPage() {
  useDocumentTitle('About the data');
  const { data } = useMetaStats();
  return (
    <main className="cv-main cv-main--narrow" style={{ paddingTop: 'clamp(28px, 5vw, 56px)' }}>
      <h1 className="cv-h1">About the data</h1>
      <p className="cv-lede">What the figures cover, what they mean, and where they can mislead.</p>

      <section className="cv-prose-section cv-prose-section--first" aria-labelledby="about-coverage">
        <h2 id="about-coverage">Coverage</h2>
        <div className="cv-figures">
          <div>
            <div className="cv-figure-value">{data ? fmtInt(data.total_matches) : '—'}</div>
            <div className="cv-figure-label">
              matches
              {data?.total_matches_atp != null && ` · ATP ${fmtInt(data.total_matches_atp)} · WTA ${fmtInt(data.total_matches_wta)}`}
            </div>
          </div>
          <div>
            <div className="cv-figure-value">{data ? `${data.year_min}–${data.year_max}` : '—'}</div>
            <div className="cv-figure-label">dense from the Open era (1968) on</div>
          </div>
          <div>
            <div className="cv-figure-value">{data?.data_through ? fmtDate(data.data_through) : '—'}</div>
            <div className="cv-figure-label">latest match date in the data</div>
          </div>
        </div>
        <p style={{ margin: '18px 0 0', lineHeight: 1.6 }}>
          About {data ? fmtInt(Math.round(data.total_players / 1000) * 1000) : '38,000'} players appear, most of them
          opponents who played only a few matches. Point statistics (aces, serve points, break points) exist mainly
          for tour-level matches from the 1990s onwards; older and lower-tier matches often have a score only. Match
          data comes from{' '}
          <a href="https://www.tennisabstract.com" target="_blank" rel="noopener noreferrer">Tennis Abstract / Jeff Sackmann</a>.
        </p>
      </section>

      <section className="cv-prose-section" aria-labelledby="about-caveats">
        <h2 id="about-caveats">Known caveats</h2>
        <dl className="cv-caveats">
          {CAVEATS.map(([term, text]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cv-prose-section" aria-labelledby="about-terms">
        <h2 id="about-terms">Terms</h2>
        <dl className="cv-terms">
          {TERMS.map(([term, text]) => [
            <dt key={`${term}-t`}>{term}</dt>,
            <dd key={`${term}-d`}>{text}</dd>,
          ])}
        </dl>
      </section>
    </main>
  );
}
