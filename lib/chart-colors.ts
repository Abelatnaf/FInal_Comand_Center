// Monochrome-only categorical ramp (10 slots) — the design system forbids hue
// for identity, so category identity is carried by a fixed-order lightness
// ramp instead. Validated: passes contrast (3.03:1 floor vs #08080a surface)
// but adjacent steps land just under the ideal 0.06 OKLCH-L separation
// (~0.05-0.059) — a structural limit of fitting 10 slots into pure grayscale.
// Compensated with a legend, 2px surface gaps between segments, hover
// tooltips, and the always-present data table (never color-alone identity).
export const CATEGORY_SHADES = [
  "#5c5c66",
  "#6d6d76",
  "#7e7e86",
  "#8f8f96",
  "#a0a0a6",
  "#b1b0b7",
  "#c2c1c7",
  "#d3d2d7",
  "#e4e3e7",
  "#f5f4f7",
];

export const CHART_GRID_COLOR = "rgba(255,255,255,0.06)";
export const CHART_AXIS_COLOR = "#86848f"; // --text-dim
export const CHART_LINE_COLOR = "#eceaf0"; // --silver
export const CHART_LINE_SECONDARY = "#9c9aa5"; // --silver-dim
