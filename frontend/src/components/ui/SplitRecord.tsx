interface Props {
  wins: number;
  losses: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right' | 'center';
}

const SIZE_MAP = {
  sm: 'text-[17px]',
  md: 'text-[26px]',
  lg: 'text-[40px]',
  xl: 'text-[58px]',
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
      <span className={`ba-stat ${cls} text-[var(--clay)]`}>{wins}</span>
      <span className={`ba-stat ${cls} text-[var(--rule-mid)] px-[0.1em]`}>&ndash;</span>
      <span className={`ba-stat ${cls} text-[var(--ink-2)]`}>{losses}</span>
    </div>
  );
}
