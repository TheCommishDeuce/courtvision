/**
 * Shared Recharts styling — flat and minimal, on the same tokens as the DOM.
 *
 * Every value here is a `var(--token)` declared in index.css, so a chart
 * follows the theme switch without a re-render and a palette change lands in
 * SVG and DOM at once.
 *
 * Rules charts follow here:
 *   · one accent (clay) plus ink; a chart that needs more takes the next
 *     colors from SERIES in order
 *   · horizontal hairline grid only — vertical gridlines just repeat the ticks
 *   · no gradients, no fills under lines
 *   · every tick and tooltip figure in the mono data face, tabular
 */

export const CHART = {
  grid: 'var(--rule)',
  axis: 'var(--rule-mid)',
  tickInk: 'var(--ink-2)',
  tickMute: 'var(--mute)',
  clay: 'var(--clay)',
  clayDeep: 'var(--clay-deep)',
  ink: 'var(--ink)',
  mute: 'var(--mute)',
  paper: 'var(--paper-raised)',
};

/** Ordered categorical ramp. Take colors from the front, in order. */
export const SERIES = [
  'var(--clay)',
  'var(--ink)',
  'var(--clay-deep)',
  'var(--mute)',
  'var(--surface-hard)',
  'var(--surface-grass)',
];

/** Court surfaces keep their own identity wherever a chart splits by surface. */
export const SURFACE_SERIES: Record<string, string> = {
  Hard: 'var(--surface-hard)',
  Clay: 'var(--surface-clay)',
  Grass: 'var(--surface-grass)',
  Carpet: 'var(--mute)',
};

/** Spread onto <CartesianGrid> — horizontal hairlines only. */
export const GRID_PROPS = {
  stroke: CHART.grid,
  strokeDasharray: '0',
  vertical: false,
} as const;

/** Spread onto <XAxis> / <YAxis> for a consistent hairline axis. */
export const AXIS_PROPS = {
  tickLine: false,
  axisLine: { stroke: CHART.axis },
} as const;

/**
 * Chart type sizes. SVG presentation attributes cannot read a CSS clamp, so
 * these are the ramp's small steps written out as numbers — 11 is `--step--2`
 * and 12.5 is `--step--1` at desktop width. Nothing in a chart may pick its
 * own size.
 */
export const CHART_FS = { tick: 11, label: 11, tooltip: 12.5 } as const;

export const TOOLTIP_STYLE = {
  backgroundColor: CHART.paper,
  border: '1px solid var(--rule-mid)',
  color: 'var(--ink)',
  borderRadius: 'var(--r-sm)',
  boxShadow: 'var(--shadow-2)',
  fontSize: CHART_FS.tooltip,
  padding: '6px 9px',
};

/** Kept as a separate export for callers that used the softer variant. */
export const TOOLTIP_STYLE_SOFT = TOOLTIP_STYLE;

export const LEGEND_STYLE = {
  color: 'var(--ink-2)',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontSize: CHART_FS.label,
  letterSpacing: '0.06em',
};

export const monoTick = (fontSize: number, fill: string, fontFamily = 'JetBrains Mono') => ({
  fontSize,
  fill,
  fontFamily,
});

/** One line weight across every series line. */
export const LINE_WIDTH = 1.75;

/** Shared tooltip shell so every chart's tooltip is the same object. */
export const TOOLTIP_CLASS =
  'bg-paper-raised border border-rule-mid rounded-[var(--r-sm)] shadow-[var(--shadow-2)] px-2.5 py-1.5 text-[length:var(--step--1)]';
