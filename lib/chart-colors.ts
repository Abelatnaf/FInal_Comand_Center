// Monochrome-only categorical ramp (10 slots) — the design system forbids hue
// for identity, so category identity is carried by a fixed-order lightness
// ramp instead. Warm brass-tinted neutral, matching the Neo-Luxury ink/brass
// palette (was a cold gray ramp under the earlier Liquid Glass system).
// Compensated with a legend, 2px surface gaps between segments, hover
// tooltips, and the always-present data table (never color-alone identity).
export const CATEGORY_SHADES = [
  "#362c21",
  "#423627",
  "#4f412e",
  "#5c4c36",
  "#6a5a40",
  "#7d6c4e",
  "#93815f",
  "#ab9c79",
  "#c7bb9c",
  "#e5dcc3",
];

export const CHART_GRID_COLOR = "rgba(201,162,75,0.08)";
export const CHART_AXIS_COLOR = "#a99c86"; // --text-dim
export const CHART_LINE_COLOR = "#e3c27e"; // --brass-bright
export const CHART_LINE_SECONDARY = "#9c8570"; // muted oxblood-taupe, distinguishable from brass
