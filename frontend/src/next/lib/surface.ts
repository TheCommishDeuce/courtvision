/** Surfaces always carry a glyph and a label, never colour alone. */
export const SURFACES = ['Hard', 'Clay', 'Grass', 'Carpet'] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_STYLE: Record<Surface, { glyph: string; color: string }> = {
  Hard: { glyph: '■', color: 'var(--hard)' },
  Clay: { glyph: '●', color: 'var(--clay)' },
  Grass: { glyph: '▲', color: 'var(--grass)' },
  Carpet: { glyph: '◆', color: 'var(--carpet)' },
};

export const isSurface = (s: string | null | undefined): s is Surface =>
  !!s && (SURFACES as readonly string[]).includes(s);
