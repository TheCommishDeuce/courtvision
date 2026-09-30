/**
 * Match row + statistics panel (DESIGN.md › Shared patterns › Match row).
 * Desktop: one grid row. Below 1000px: a card. Use MatchList to get the header
 * row and the layout switch; MatchRow alone takes `card` explicitly.
 */
import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useViewportWidth, CARD_ROWS_MAX } from '../hooks/useViewport';
import { fmtDate, fmtDuration, fmtRankParen, roundName } from '../lib/format';
import { hasPointStats, statLines, type MatchRowData } from '../lib/matches';
import { playerPath, tournamentPath } from '../lib/slug';
import { ResultChip, SurfaceTag, UpsetTag } from './Tags';

const stop = (e: MouseEvent) => e.stopPropagation();

function StatsPanel({ m }: { m: MatchRowData }) {
  if (!hasPointStats(m)) return <p className="cv-no-stats">No point statistics for this match.</p>;
  return (
    <div role="table" aria-label="Match statistics" className="cv-stats-table">
      <div role="row" className="cv-stats-row cv-stats-row--head">
        <span role="columnheader"><span className="cv-visually-hidden">Statistic</span></span>
        <span role="columnheader">{m.winner.name}</span>
        <span role="columnheader">{m.loser.name}</span>
      </div>
      {statLines(m).map(l => (
        <div role="row" key={l.label} className="cv-stats-row">
          <span role="rowheader" className="cv-muted">{l.label}</span>
          <span role="cell">{l.winner}</span>
          <span role="cell">{l.loser}</span>
        </div>
      ))}
    </div>
  );
}

function EventLink({ m, className }: { m: MatchRowData; className?: string }) {
  if (!m.tournament) return <span className={className}>—</span>;
  if (!m.year) return <span className={className}>{m.tournament}</span>;
  return (
    <Link to={tournamentPath(m.tournament, m.year, m.tour)} onClick={stop} className={className}>
      {m.tournament}
    </Link>
  );
}

const PlayerLink = ({ name, strong }: { name: string; strong?: boolean }) => (
  <Link to={playerPath(name)} onClick={stop} className={strong ? 'cv-match-winner' : undefined}>{name}</Link>
);

export function MatchRow({ m, card }: { m: MatchRowData; card: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(o => !o);
  const toggleButton = (
    <button
      type="button"
      className="cv-match-toggle"
      aria-expanded={open}
      aria-label={`Match statistics: ${m.winner.name} vs ${m.loser.name}`}
      onClick={e => {
        e.stopPropagation();
        toggle();
      }}
    >
      {open ? '▲' : '▼'}
    </button>
  );
  const wrank = fmtRankParen(m.winner.rank);
  const lrank = fmtRankParen(m.loser.rank);

  return (
    <div className="cv-match">
      {!card ? (
        <div className="cv-match-desk" onClick={toggle}>
          <span>
            {m.result && <ResultChip result={m.result} />}
            {!m.result && m.mark && <span title={m.mark.label} aria-label={m.mark.label} style={{ color: 'var(--acc)' }}>{m.mark.glyph}</span>}
          </span>
          <span className="cv-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.date)}</span>
          <EventLink m={m} className="cv-match-names" />
          <abbr title={roundName(m.round)} className="cv-match-round">{m.round}</abbr>
          <SurfaceTag surface={m.surface} />
          <span className="cv-match-names">
            <PlayerLink name={m.winner.name} strong /> {wrank && <span className="cv-match-rank">{wrank}</span>}
            {m.upset && <> <UpsetTag /></>}
          </span>
          <span className="cv-match-names">
            <PlayerLink name={m.loser.name} /> {lrank && <span className="cv-match-rank">{lrank}</span>}
          </span>
          <span className="cv-match-score">{m.score}</span>
          <span className="cv-muted" style={{ textAlign: 'right' }}>{m.time ? fmtDuration(m.time) : ''}</span>
          {toggleButton}
        </div>
      ) : (
        <div className="cv-match-card" onClick={toggle}>
          <div className="cv-match-card-meta">
            {m.result && <ResultChip result={m.result} />}
            {!m.result && m.mark && <span title={m.mark.label} aria-label={m.mark.label} style={{ color: 'var(--acc)' }}>{m.mark.glyph}</span>}
            <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.date)}</span>
            <EventLink m={m} className="cv-match-card-event" />
            <span className="cv-mono">{m.round}</span>
            <span style={{ marginLeft: 'auto' }}><SurfaceTag surface={m.surface} /></span>
          </div>
          <div className="cv-match-card-players">
            <div>
              <PlayerLink name={m.winner.name} strong />{' '}
              {wrank && <span className="cv-match-rank" style={{ fontSize: 13 }}>{wrank}</span>}{' '}
              <span className="cv-match-won">WON</span>
              {m.upset && <> <UpsetTag /></>}
            </div>
            <div>
              <PlayerLink name={m.loser.name} />{' '}
              {lrank && <span className="cv-match-rank" style={{ fontSize: 13 }}>{lrank}</span>}
            </div>
          </div>
          <div className="cv-match-card-foot">
            <span className="cv-match-score">{m.score}</span>
            {m.time ? <span className="cv-muted" style={{ fontSize: 13 }}>{fmtDuration(m.time)}</span> : null}
            {toggleButton}
          </div>
        </div>
      )}
      {open && (
        <div className="cv-match-stats">
          <StatsPanel m={m} />
        </div>
      )}
    </div>
  );
}

/** Header row + rows, switching to cards below 1000px. */
export default function MatchList({ matches, showHeader = true }: { matches: MatchRowData[]; showHeader?: boolean }) {
  const card = useViewportWidth() <= CARD_ROWS_MAX;
  return (
    <div>
      {showHeader && !card && (
        <div className="cv-match-head" aria-hidden="true">
          <span />
          <span>Date</span>
          <span>Event</span>
          <span>Rd</span>
          <span>Surface</span>
          <span>Winner</span>
          <span>Loser</span>
          <span>Score</span>
          <span style={{ textAlign: 'right' }}>Time</span>
          <span />
        </div>
      )}
      {matches.map(m => <MatchRow key={m.key} m={m} card={card} />)}
    </div>
  );
}
