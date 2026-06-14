export default function PlayerHeroBlock({
  name,
  winPct,
  record,
  peakRank,
  titles,
  variant,
}: {
  name: string;
  winPct: string;
  record: string;
  peakRank: number | null;
  titles: number;
  variant: 'clay' | 'ink';
}) {
  const isClay = variant === 'clay';
  const labelColor = isClay
    ? 'text-[var(--bone)]/80'
    : 'text-[var(--mute)]';
  const valueColor = isClay ? 'text-[var(--bone)]' : 'text-[var(--ink)]';
  const dividerColor = isClay ? 'border-[var(--bone)]/20' : 'border-[var(--rule)]';
  const typo = 'font-[\'JetBrains_Mono\',ui-monospace,monospace]';

  return (
    <div
      className={
        isClay
          ? 'ba-kpi px-5 py-6 md:px-7 md:py-8 flex flex-col gap-4'
          : 'bg-[var(--bone-2)] border-2 border-[var(--ink)] px-5 py-6 md:px-7 md:py-8 flex flex-col gap-4'
      }
    >
      <div className={`${typo} text-[10px] font-medium tracking-[0.12em] uppercase ${labelColor}`}>
        {isClay ? 'Player A' : 'Player B'}
      </div>
      <div className={`ba-stat-sm ${valueColor}`}>
        {name}
      </div>
      <div className={`flex items-baseline justify-between pt-3 border-t ${dividerColor}`}>
        <span className={`${typo} text-[10px] font-medium tracking-[0.12em] uppercase ${labelColor}`}>Win Rate</span>
        <span className={`ba-stat-sm ${valueColor}`}>{winPct}<span className="text-[20px] ml-0.5">%</span></span>
      </div>
      <div className={`flex items-baseline justify-between`}>
        <span className={`${typo} text-[10px] font-medium tracking-[0.12em] uppercase ${labelColor}`}>Record</span>
        <span className={`ba-mono text-[14px] ${valueColor}`}>{record}</span>
      </div>
      <div className={`flex items-baseline justify-between`}>
        <span className={`${typo} text-[10px] font-medium tracking-[0.12em] uppercase ${labelColor}`}>Peak Rank</span>
        <span className={`ba-mono text-[14px] ${valueColor}`}>{peakRank ? `#${peakRank}` : '—'}</span>
      </div>
      <div className={`flex items-baseline justify-between`}>
        <span className={`${typo} text-[10px] font-medium tracking-[0.12em] uppercase ${labelColor}`}>Tour Titles</span>
        <span className={`ba-mono text-[14px] ${valueColor}`}>{titles}</span>
      </div>
    </div>
  );
}
