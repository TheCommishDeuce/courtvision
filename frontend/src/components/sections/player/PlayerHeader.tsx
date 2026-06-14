import { countryDisplay } from '../../../utils';
import type { PlayerSummary } from '../../../types/tennis';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PlayerHeader({ player, submitted, summary }: { player: string; submitted: boolean; summary?: PlayerSummary }) {
  return (
    <header className="border-b border-[var(--rule)] pb-4">
      <div className="ba-kicker mb-2">Player · Profile</div>
      <h1 className="ba-display break-words">
        {player ? (
          <>
            {player.split(' ').slice(0, -1).join(' ')}{' '}
            <span className="text-[var(--clay)]">{player.split(' ').slice(-1)[0]}</span>
          </>
        ) : (
          <span className="text-[var(--mute)]">Select a Player</span>
        )}
      </h1>
      {submitted && summary && (summary.country || summary.birthdate || summary.hand || summary.height) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 ba-mono text-[12px] text-[var(--ink-2)]">
          {summary.country && <span className="font-bold text-[var(--ink)]">{countryDisplay(summary.country)}</span>}
          {summary.birthdate && <><span className="text-[var(--rule)]">·</span><span>{fmtDate(summary.birthdate)}</span></>}
          {summary.age != null && <><span className="text-[var(--rule)]">·</span><span>{summary.age} yrs</span></>}
          {summary.height != null && <><span className="text-[var(--rule)]">·</span><span>{summary.height} cm</span></>}
          {summary.hand && <><span className="text-[var(--rule)]">·</span><span>{summary.hand === 'R' ? 'Right-handed' : summary.hand === 'L' ? 'Left-handed' : summary.hand}</span></>}
        </div>
      )}
    </header>
  );
}
