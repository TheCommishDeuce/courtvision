/**
 * Shared chart styling for the "Bone & Clay" design system.
 *
 * Two tooltip/tick variants exist intentionally — the radar/LineChart family
 * uses the hard bone/ink style, GroupedBar/MomentumTimeline the soft paper/rule
 * style. Keep them distinct.
 */

export const CHART = {
  grid: 'var(--rule)',
  tickInk: 'var(--ink-2)',
  tickMute: 'var(--mute)',
  clay: 'var(--clay)',
  ink: 'var(--ink)',
};

export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--bone)',
  border: '1px solid var(--ink)',
  color: 'var(--ink)',
  borderRadius: 0,
};

export const TOOLTIP_STYLE_SOFT = {
  backgroundColor: 'var(--paper)',
  border: '1px solid var(--rule)',
  color: 'var(--ink)',
};

export const LEGEND_STYLE = { color: 'var(--ink-2)' };

export const monoTick = (fontSize: number, fill: string, fontFamily = 'JetBrains Mono') => ({
  fontSize,
  fill,
  fontFamily,
});
