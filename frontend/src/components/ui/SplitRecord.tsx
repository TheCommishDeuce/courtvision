interface Props {
  wins: number;
  losses: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right' | 'center';
}

const SIZE_MAP = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-7xl',
};

export default function SplitRecord({ wins, losses, size = 'md', align = 'left' }: Props) {
  const cls = SIZE_MAP[size];
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <div className={`ba-display leading-none inline-flex items-baseline gap-1 ${justify}`}>
      <span className={cls} style={{ color: 'var(--primary)' }}>{wins}</span>
      <span className={`${cls} opacity-60`} style={{ color: 'var(--mute)' }}>&ndash;</span>
      <span className={cls} style={{ color: 'var(--secondary)' }}>{losses}</span>
    </div>
  );
}
