import { countryDisplay } from '../../../utils';
import type { PlayerSummary } from '../../../types/tennis';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Surname in clay — the one place the accent lands on a name. */
export function PlayerHeader({
  player,
  submitted,
  summary,
}: {
  player: string;
  submitted: boolean;
  summary?: PlayerSummary;
}) {
  const given = player.split(' ').slice(0, -1).join(' ');
  const surname = player.split(' ').slice(-1)[0];

  const facts = [
    summary?.birthdate ? fmtDate(summary.birthdate) : null,
    summary?.age != null ? `${summary.age} yrs` : null,
    summary?.height != null ? `${summary.height} cm` : null,
    summary?.hand
      ? summary.hand === 'R'
        ? 'Right-handed'
        : summary.hand === 'L'
        ? 'Left-handed'
        : summary.hand
      : null,
  ].filter(Boolean) as string[];

  return (
    <header className="ba-double-rule pb-2">
      <div className="ba-eyebrow mb-1">Player</div>
      <h1 className="ba-display break-words">
        {player ? (
          <>
            {given && `${given} `}
            <span className="text-[var(--clay)]">{surname}</span>
          </>
        ) : (
          <span className="text-[var(--mute)]">No player selected</span>
        )}
      </h1>
      {submitted && summary && (summary.country || facts.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 ba-mono text-[11.5px] text-[var(--ink-2)]">
          {summary.country && (
            <span className="font-bold text-[var(--ink)]">{countryDisplay(summary.country)}</span>
          )}
          {facts.map(fact => (
            <span key={fact} className="flex items-center gap-2.5">
              <span className="text-[var(--rule-mid)]">·</span>
              {fact}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
