import { surfaceClass } from '../../utils';

interface Props {
  surface: string;
  size?: 'sm' | 'md';
}

export default function SurfaceTag({ surface, size = 'sm' }: Props) {
  const pad = size === 'md' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]';
  return (
    <span className={`ba-mono font-bold uppercase tracking-[0.12em] ${pad} ${surfaceClass(surface)}`}>
      {surface}
    </span>
  );
}
