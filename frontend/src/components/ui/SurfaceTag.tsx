import { surfaceClass } from '../../utils';

interface Props {
  surface: string;
  size?: 'sm' | 'md';
}

export default function SurfaceTag({ surface, size = 'sm' }: Props) {
  const pad = size === 'md' ? 'px-1.5 py-[1px] text-[10px]' : 'px-1 py-[1px] text-[9.5px]';
  return (
    <span
      className={`ba-mono font-bold uppercase tracking-[0.11em] whitespace-nowrap ${pad} ${surfaceClass(surface)}`}
    >
      {surface}
    </span>
  );
}
