// v5.1.1 — Color palettes for the Super Guppy ribbon and any future
// trend-state-colored chart tools.
//
// Two modes:
//   - "colorblind"  (default) — blue / red / gray. Safe across all common
//                                color vision deficiencies (deuteranopia,
//                                protanopia, tritanopia).
//   - "standard"             — green / red / amber. Classic financial chart
//                                convention; only readable to users without
//                                red/green colorblindness.
//
// The trainer's primary user has red/green colorblindness, so we default to
// the colorblind-friendly palette. Sighted users without colorblindness can
// switch to "standard" from Settings → Chart colors. The colorblind mode
// reads cleanly for everyone; the standard mode does not.
//
// One source of truth: lib/storage.ts persists the choice, this module owns
// the palettes and the interpolation helpers, the Chart component reads them
// when it draws the ribbon.

import type { GuppyTrendState } from "./indicators-guppy";

export type ColorMode = "colorblind" | "standard";

export const COLOR_MODES: ColorMode[] = ["colorblind", "standard"];

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  colorblind: "Colorblind-friendly (blue / red)",
  standard: "Standard (green / red)",
};

export const COLOR_MODE_DESCRIPTIONS: Record<ColorMode, string> = {
  colorblind:
    "Trend tools use blue (uptrend) and red (downtrend). Blue vs red stays distinguishable for red/green colorblindness.",
  standard:
    "Trend tools use green (uptrend) and red (downtrend). The classic financial chart palette. Not readable for ~8% of men with red/green colorblindness.",
};

// Per-state palette. shortStart/shortEnd are the endpoints of the gradient
// painted across the 12 EMAs in the short cluster (index 0 = shortStart,
// index 11 = shortEnd). Same idea for the long cluster. representative is
// the single color used for the legend dot and the in-line state chip.
export type Palette = {
  shortStart: string;
  shortEnd: string;
  longStart: string;
  longEnd: string;
  representative: string;
};

// v5.1.2 — palette spreads widened so the 12 lines in each cluster stay
// visually distinct even when compressed into a thin price band. The previous
// spreads (e.g. blue-500 → cyan-500 for colorblind bull) were too close in
// hue: 12 lines packed into ~5 vertical pixels blended into one colored
// stripe. Each cluster now spans a clear luminance gradient (pale → vivid →
// deep) so the ribbon reads as a band with internal structure.
//
// Neutral palette is gray in BOTH modes. The previous "amber" neutral in
// Standard mode was being mistaken for a third palette colour (orange) by
// users who'd just switched modes — gray reads unambiguously as "no clear
// trend" in either mode, and removes the visual collision with colorblind
// mode's bear orange.
const COLORBLIND_PALETTES: Record<GuppyTrendState, Palette> = {
  bull: {
    // Short cluster: pale sky-blue → vivid blue. 12 lines walk that range.
    shortStart: "#bae6fd", // sky-200
    shortEnd: "#2563eb", // blue-600
    // Long cluster: medium cyan-teal → very dark teal. Sits visually
    // *below* the short cluster's luminance so the two ribbons are clearly
    // different bands even when they're price-stacked.
    longStart: "#0891b2", // cyan-600
    longEnd: "#0c4a6e", // sky-900
    representative: "#2563eb",
  },
  // v5.9.10 — was orange. Switched to red at the user's request ("blue and
  // red, red obviously for bear"). Blue (bull) vs red (bear) stays
  // distinguishable for the common red/green deficiencies — the pairing the
  // colourblind palette has to avoid is red-vs-green, not red-vs-blue.
  bear: {
    shortStart: "#fecaca", // red-200
    shortEnd: "#dc2626", // red-600
    longStart: "#991b1b", // red-800
    longEnd: "#450a0a", // red-950
    representative: "#dc2626",
  },
  neutral: {
    shortStart: "#e2e8f0", // slate-200
    shortEnd: "#94a3b8", // slate-400
    longStart: "#475569", // slate-600
    longEnd: "#1e293b", // slate-800
    representative: "#94a3b8",
  },
};

const STANDARD_PALETTES: Record<GuppyTrendState, Palette> = {
  bull: {
    shortStart: "#bbf7d0", // green-200
    shortEnd: "#16a34a", // green-600
    longStart: "#166534", // green-800
    longEnd: "#052e16", // green-950
    representative: "#16a34a",
  },
  bear: {
    shortStart: "#fecaca", // red-200
    shortEnd: "#dc2626", // red-600
    longStart: "#991b1b", // red-800
    longEnd: "#450a0a", // red-950
    representative: "#dc2626",
  },
  neutral: {
    // v5.1.2 — was amber/yellow. Now gray, same as colorblind mode. The
    // "MIXED" chip and the ribbon both read as desaturated → no implied
    // direction. Yellow neutral was being confused with a bear-orange in
    // brief mode-switches.
    shortStart: "#e2e8f0", // slate-200
    shortEnd: "#94a3b8", // slate-400
    longStart: "#475569", // slate-600
    longEnd: "#1e293b", // slate-800
    representative: "#94a3b8",
  },
};

export function paletteFor(mode: ColorMode, state: GuppyTrendState): Palette {
  return mode === "standard"
    ? STANDARD_PALETTES[state]
    : COLORBLIND_PALETTES[state];
}

// Linear interpolation between two hex colors. Used to paint the per-EMA
// color across the 12-line cluster: index 0 → shortStart, last → shortEnd,
// everything between is a smooth blend so the ribbon looks like one band
// instead of 12 distinct lines.
//
// v5.1.2 — optional opacity argument. When omitted, returns rgb() for
// backwards compatibility with the existing tests. When specified, returns
// rgba() with the alpha baked in. Used by the ribbon so overlapping
// adjacent lines compound into a more visible band.
export function interpolateColor(
  hex1: string,
  hex2: string,
  t: number,
  opacity?: number
): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  if (opacity != null && opacity < 1) {
    return `rgba(${r},${g},${b},${opacity})`;
  }
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return { r: 128, g: 128, b: 128 };
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

// Build the array of colors for the 12-EMA short or long cluster. Index 0
// is the endpoint at `start`, last is `end`, everything in between is a
// linear interpolation. Used by Chart.tsx when configuring each line series.
//
// v5.1.2 — optional opacity. Defaults to 1 (fully opaque). When passed an
// opacity < 1, every interpolated color comes out as an rgba() string.
export function clusterColors(
  start: string,
  end: string,
  count: number,
  opacity = 1
): string[] {
  if (count <= 1) {
    return [opacity < 1 ? interpolateColor(start, start, 0, opacity) : start];
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(interpolateColor(start, end, i / (count - 1), opacity));
  }
  return out;
}

// v5.9.9 — flat alternative to clusterColors. Returns `count` copies of a
// single colour (optionally with alpha) so the ribbon paints as one solid hue
// instead of a pale→deep gradient. The band's width still reads because the
// translucent strands compound where they overlap, but there's only one colour
// — which also makes the ribbon match the legend's state chip exactly.
export function solidColors(
  color: string,
  count: number,
  opacity = 1
): string[] {
  const c = opacity < 1 ? interpolateColor(color, color, 0, opacity) : color;
  return new Array(Math.max(0, count)).fill(c);
}

// Trader-facing labels for the legend chip and tooltip headline. "MIXED" is
// the plain-direct register's name for "neutral" — easier to read at a glance
// than "neutral" or "in transition."
export const STATE_LABEL: Record<GuppyTrendState, string> = {
  bull: "BULL",
  bear: "BEAR",
  neutral: "MIXED",
};

export const STATE_MEANING: Record<GuppyTrendState, string> = {
  bull: "Every short EMA above every long EMA — uptrend conviction.",
  bear: "Every short EMA below every long EMA — downtrend conviction.",
  neutral:
    "Ribbons interleaving — trend in transition, or no clear trend at all.",
};
