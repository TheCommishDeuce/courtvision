/** Small inline marks shared by every screen. */
import { tourLabel } from '../lib/format';
import { isSurface, SURFACE_STYLE } from '../lib/surface';

export function TourTag({ tour }: { tour: string | null | undefined }) {
  const label = tourLabel(tour);
  return label ? <span className="cv-tour-tag">{label}</span> : null;
}

/** Glyph + label: surfaces are never told apart by colour alone. */
export function SurfaceTag({ surface, short = false }: { surface: string | null | undefined; short?: boolean }) {
  if (!surface) return null;
  const style = isSurface(surface) ? SURFACE_STYLE[surface] : null;
  return (
    <span className="cv-surface">
      {style && <span aria-hidden="true" className="cv-glyph" style={{ color: style.color }}>{style.glyph}</span>}
      {short ? surface.slice(0, 5) : surface}
    </span>
  );
}

export function ResultChip({ result }: { result: 'W' | 'L' }) {
  return (
    <span className={`cv-result cv-result--${result}`} aria-label={result === 'W' ? 'Won' : 'Lost'}>
      {result}
    </span>
  );
}

export function UpsetTag() {
  return <span className="cv-upset-tag" title="Upset: the winner was ranked lower">UPSET</span>;
}
