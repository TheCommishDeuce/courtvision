/** Form: the three windows, the last-20 strip, recent notable wins and losses. */
import { Link } from 'react-router-dom';
import type { PlayerFormMatchRow, PlayerMatchRow } from '../../types/tennis';
import Section from '../../components/Section';
import { BlockError, Skeleton } from '../../components/States';
import { fmtDate, fmtDayMonth, fmtPct, fmtRankParen } from '../../lib/format';
import { playerPath } from '../../lib/slug';
import type { PlayerFilterParams } from '../../api/player';
import { useForm, useShapeMatches } from './data';

function NotableRow({ r }: { r: PlayerFormMatchRow }) {
  return (
    <div className="cv-list-row">
      <span className="pl-date">{fmtDayMonth(r.date)}</span>
      <span className="pl-row-opp">
        <Link to={playerPath(r.opponent_name)}>{r.opponent_name}</Link>{' '}
        <span className="cv-muted">{fmtRankParen(r.opponent_rank)}</span>
      </span>
      <span className="pl-row-meta">{r.tournament} · <span className="cv-mono">{r.round}</span></span>
    </div>
  );
}

function Strip({ last20 }: { last20: PlayerMatchRow[] }) {
  const oldestFirst = [...last20].reverse();
  const wins = last20.filter(m => m.result === 'W').length;
  return (
    <>
      <div className="pl-strip-head">
        <span>Last {last20.length} matches, oldest → latest</span>
        <span>{wins}–{last20.length - wins}</span>
      </div>
      <ol className="pl-strip">
        {oldestFirst.map(m => {
          const title = `${m.result === 'W' ? 'Won' : 'Lost'} v ${m.opponent_name}, ${m.tournament} ${m.round}, ${fmtDate(m.date)}`;
          return <li key={`${m.date}${m.round}${m.opponent_name}`} className={m.result} title={title} aria-label={title}>{m.result}</li>;
        })}
      </ol>
    </>
  );
}

export default function Form({ params, surname, scope }: { params: PlayerFilterParams; surname: string; scope: string }) {
  const form = useForm(params);
  const matches = useShapeMatches(params);
  return (
    <Section id="form" title="Form" question={`How has ${surname} played lately?`} note={`${scope} · always the most recent matches`} first>
      {form.isPending && <Skeleton><div className="cv-block-skel" style={{ height: 260 }} /></Skeleton>}
      {form.isError && <BlockError message="Form didn’t load." onRetry={() => form.refetch()} />}
      {form.data && (
        <>
          <div className="pl-windows">
            {([['Last 10', form.data.last10], ['Last 20', form.data.last20], ['Last 52 weeks', form.data.last52w]] as const).map(([label, w]) => {
              const total = w.wins + w.losses;
              return (
                <div key={label} className="cv-ruled-figure">
                  <div className="cv-figure-label-sm">{label}</div>
                  <div className="cv-figure-big">{w.wins}–{w.losses}</div>
                  <div className="cv-figure-label-sm">{total ? fmtPct((w.wins / total) * 100) : 'No matches'}</div>
                </div>
              );
            })}
          </div>
          {matches.data && matches.data.last20.length > 0 && <Strip last20={matches.data.last20} />}
          <div className="pl-two">
            <div>
              <h3 className="cv-h3">Recent wins over top-50 players</h3>
              {form.data.top_wins_recent.length
                ? form.data.top_wins_recent.map(r => <NotableRow key={`${r.date}${r.opponent_name}${r.round}`} r={r} />)
                : <p className="cv-muted">None in the last 52 weeks.</p>}
            </div>
            <div>
              <h3 className="cv-h3">Recent losses to lower-ranked players</h3>
              {form.data.upset_losses_recent.length
                ? form.data.upset_losses_recent.map(r => <NotableRow key={`${r.date}${r.opponent_name}${r.round}`} r={r} />)
                : <p className="cv-muted">None in the last 52 weeks.</p>}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
