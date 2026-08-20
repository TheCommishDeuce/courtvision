interface Props {
  wins: number;
  losses: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right' | 'center';
}

/** Steps off the shared ramp, so a record scales with everything else. */
const SIZE_MAP = {
  sm: 'text-[length:var(--step-2)]',
  md: 'text-[length:var(--step-3)]',
  lg: 'text-[length:var(--step-4)]',
  xl: 'text-[length:var(--step-5)]',
};

/**
 * A win–loss record. A headline figure, so it takes the display-figure face
 * (.ba-stat) with a size utility on top. Wins take the accent, losses stay
 * secondary ink.
 */
export default function SplitRecord({ wins, losses, size = 'md', align = 'left' }: Props) {
  const cls = SIZE_MAP[size];
  const justify =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <div className={`inline-flex items-baseline leading-none ${justify}`}>
      <span className={`ba-stat ${cls} text-clay`}>{wins}</span>
      {/* --mute, not --rule-mid: the dash is part of the record being read,
          not a hairline, and at rule weight it vanished against the card. */}
      <span className={`ba-stat ${cls} text-mute px-[0.1em]`}>&ndash;</span>
      <span className={`ba-stat ${cls} text-ink-2`}>{losses}</span>
    </div>
  );
}
