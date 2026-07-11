// Monochrome-plus-one-accent ramp (10 slots) — the design system forbids hue
// for category identity, only the single systemBlue tint carries emphasis.
// Neutral gray ramp matching iOS's own systemGray tier scale.
export const CATEGORY_SHADES = [
  "#2c2c2e",
  "#3a3a3c",
  "#48484a",
  "#565658",
  "#636366",
  "#7c7c80",
  "#8e8e93",
  "#aeaeb2",
  "#c7c7cc",
  "#e5e5ea",
];

export const CHART_GRID_COLOR = "rgba(255,255,255,0.08)";
export const CHART_AXIS_COLOR = "rgba(255,255,255,0.6)"; // --text-dim
export const CHART_LINE_COLOR = "#0a84ff"; // --accent (systemBlue)
export const CHART_LINE_SECONDARY = "#64d2ff"; // systemCyan, distinguishable from systemBlue
