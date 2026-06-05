// v5.1.0 — central registry of every indicator line/series the trainer draws.
//
// One entry per drawn series — the main-pane overlays (ema20, ema50, ema200,
// bb_upper, bb_middle, bb_lower, vwap) and the sub-panel series (rsi,
// macd_line, macd_signal, macd_hist). Chart.tsx and IndicatorSubChart.tsx both
// reach in here for: (1) the colors a series is drawn with so the legend and
// tooltip agree with the line on the chart, and (2) the human prose shown on
// hover or in the always-visible legend.
//
// Adding a new overlay is a two-step process:
//   1. Add a row here with a stable id, color, short label, one-line meaning,
//      and the corresponding /learn term slug.
//   2. Wire the series up in Chart.tsx (or IndicatorSubChart.tsx for a
//      sub-panel oscillator) and register it in the seriesMeta ref so the
//      hover lookup finds it.
//
// The prose deliberately mirrors what ChartToolsHelp.tsx already says, so the
// modal, the tooltip, and the legend speak with one voice.

import type { ChartToolId } from "./types";

export type IndicatorLineId =
  | "ema20"
  | "ema50"
  | "ema200"
  | "bb_upper"
  | "bb_middle"
  | "bb_lower"
  | "vwap"
  | "rsi"
  | "macd_line"
  | "macd_signal"
  | "macd_hist"
  | "super_guppy"
  | "chris_guppy"
  | "keltner_upper"
  | "keltner_middle"
  | "keltner_lower"
  | "pivot_p"
  | "pivot_r1"
  | "pivot_r2"
  | "pivot_s1"
  | "pivot_s2";

export type IndicatorMeta = {
  // Which toggle on the Indicators bar owns this line. Used by the legend to
  // group related lines (the three EMAs sit under "EMA"; the three BB lines
  // sit under "BB") and by the click-to-learn deeplink to land on the
  // correct Learn term card.
  parentToolId: ChartToolId;
  // Short label shown on hover and in the legend ("EMA 20", "BB upper", "RSI",
  // "MACD signal"). Plain English, no abbreviations a beginner has to decode.
  name: string;
  // Same hex/rgba string the chart draws the line with. Drives the colored
  // dot in the legend and the tooltip header.
  color: string;
  // One-sentence meaning. Short enough for a tooltip; longer prose lives in
  // ChartToolsHelp.tsx and the Learn term.
  oneLine: string;
  // /learn term to deeplink to. The legend chip and tooltip "Learn more →"
  // link both point at /learn?term=<learnTermId>.
  learnTermId: string;
  // How to render the numeric value in the tooltip. Price-scale lines use
  // dollar formatting; oscillators round to one decimal; the MACD histogram
  // is signed. Centralised here so Chart.tsx doesn't have to know.
  format: (value: number) => string;
};

const priceFormat = (v: number) =>
  v >= 1000
    ? v.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : v.toFixed(2);
const oscFormat = (v: number) => v.toFixed(1);
const signedFormat = (v: number) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3));

// Colors — single source of truth. Chart.tsx imports these instead of
// redeclaring constants so the legend swatch can never drift from the line.
export const INDICATOR_COLORS = {
  ema20: "#facc15", // yellow-400
  ema50: "#f97316", // orange-500
  ema200: "#a855f7", // purple-500
  bb_band: "rgba(79,140,255,0.85)",
  bb_mid: "rgba(148,163,184,0.7)",
  vwap: "#06b6d4", // cyan-500
  rsi: "#a855f7", // purple-500
  macd_line: "#4f8cff",
  macd_signal: "#f97316",
  macd_hist_up: "rgba(34,197,94,0.7)",
  macd_hist_down: "rgba(239,68,68,0.7)",
  // v5.2.0 — Keltner Channels chosen in the warm-pink family so they don't
  // collide with Bollinger (blue) when both toggles are on at once. Mid line
  // is a desaturated tone to keep the upper/lower as the dominant signal.
  keltner_band: "rgba(244,114,182,0.85)", // pink-400 @ 0.85
  keltner_mid: "rgba(148,163,184,0.6)", // slate-400 @ 0.6
  // Pivots — central pivot is bright accent, R levels lean red, S levels
  // lean green so a user can read direction without remembering the label.
  pivot_p: "#fbbf24", // amber-400
  pivot_r1: "#f87171", // red-400
  pivot_r2: "#ef4444", // red-500
  pivot_s1: "#4ade80", // green-400
  pivot_s2: "#22c55e", // green-500
} as const;

export const INDICATOR_META: Record<IndicatorLineId, IndicatorMeta> = {
  ema20: {
    parentToolId: "ema",
    name: "EMA 20",
    color: INDICATOR_COLORS.ema20,
    oneLine:
      "20-period exponential moving average — short-term trend. Price above it = stronger than its recent average.",
    learnTermId: "ema",
    format: priceFormat,
  },
  ema50: {
    parentToolId: "ema",
    name: "EMA 50",
    color: INDICATOR_COLORS.ema50,
    oneLine:
      "50-period exponential moving average — medium-term trend. Often acts as dynamic support in uptrends.",
    learnTermId: "ema",
    format: priceFormat,
  },
  ema200: {
    parentToolId: "ema",
    name: "EMA 200",
    color: INDICATOR_COLORS.ema200,
    oneLine:
      "200-period exponential moving average — the long-term trend reference. Above it = bull regime; below it = bear regime.",
    learnTermId: "key_mas",
    format: priceFormat,
  },
  bb_upper: {
    parentToolId: "bb",
    name: "BB upper",
    color: INDICATOR_COLORS.bb_band,
    oneLine:
      "Upper Bollinger Band — 2 standard deviations above the 20-SMA. Closes above are 'extended,' not an automatic short.",
    learnTermId: "bollinger_bands",
    format: priceFormat,
  },
  bb_middle: {
    parentToolId: "bb",
    name: "BB middle (SMA 20)",
    color: INDICATOR_COLORS.bb_mid,
    oneLine:
      "Bollinger Bands midline — 20-period simple moving average. The bands are anchored to this mean.",
    learnTermId: "bollinger_bands",
    format: priceFormat,
  },
  bb_lower: {
    parentToolId: "bb",
    name: "BB lower",
    color: INDICATOR_COLORS.bb_band,
    oneLine:
      "Lower Bollinger Band — 2 standard deviations below the 20-SMA. Closes below are 'extended,' not an automatic long.",
    learnTermId: "bollinger_bands",
    format: priceFormat,
  },
  vwap: {
    parentToolId: "vwap",
    name: "VWAP",
    color: INDICATOR_COLORS.vwap,
    oneLine:
      "Volume-weighted average price, anchored to the start of the chart. Where the average participant is in profit/loss.",
    learnTermId: "vwap",
    format: priceFormat,
  },
  rsi: {
    parentToolId: "rsi",
    name: "RSI 14",
    color: INDICATOR_COLORS.rsi,
    oneLine:
      "Relative Strength Index — 0–100 momentum oscillator. Over 70 = overbought, under 30 = oversold (but strong trends hold).",
    learnTermId: "rsi",
    format: oscFormat,
  },
  macd_line: {
    parentToolId: "macd",
    name: "MACD line",
    color: INDICATOR_COLORS.macd_line,
    oneLine:
      "MACD line — fast EMA(12) minus slow EMA(26). Above zero = momentum bullish; below = bearish.",
    learnTermId: "macd",
    format: signedFormat,
  },
  macd_signal: {
    parentToolId: "macd",
    name: "MACD signal",
    color: INDICATOR_COLORS.macd_signal,
    oneLine:
      "MACD signal — 9-period EMA of the MACD line. Crosses through it mark momentum shifts.",
    learnTermId: "macd",
    format: signedFormat,
  },
  macd_hist: {
    parentToolId: "macd",
    name: "MACD histogram",
    color: INDICATOR_COLORS.macd_line,
    oneLine:
      "MACD histogram — MACD line minus signal. Bars crossing zero = the two EMAs just crossed. Direction + size = momentum.",
    learnTermId: "macd",
    format: signedFormat,
  },
  // v5.1.1 — Super Guppy is a 24-EMA ribbon, not a single line. The legend
  // and tooltip special-case this id: the color shown is the *current trend
  // state's* representative (computed by Chart.tsx and passed in as an
  // override), and the value column is a state chip (BULL / BEAR / MIXED)
  // rather than a numeric reading. The meta entry below carries the default
  // colorblind-friendly bull-blue as a fallback for any surface that hasn't
  // been taught the override pattern yet.
  super_guppy: {
    parentToolId: "super_guppy",
    name: "Super Guppy",
    color: "#4f8cff", // colorblind bull blue — overridden at render time
    oneLine:
      "24 EMAs in two ribbons (short 3–25, long 28–61). Ribbon color flips with the trend state — uptrend, downtrend, or mixed.",
    learnTermId: "super_guppy",
    // Numeric value never shown for super_guppy — formatter is a no-op fallback
    // that's only reached if a future surface forgets to override.
    format: () => "",
  },
  // v5.9.4 — Chris's Super Guppy — user-editable variant of the GMMA
  // modelled on the TradingView indicator the user trades from. Defaults
  // mirror that script (11 fast + 16 slow EMAs); the params modal lets the
  // user override every period, the source, and the optional EMA 200.
  chris_guppy: {
    parentToolId: "chris_guppy",
    name: "Chris's Super Guppy",
    color: "#4f8cff",
    oneLine:
      "GMMA ribbon with user-editable fast/slow EMAs, an optional EMA 200, and an optional 200-filtered trend gate. Configure from the gear icon next to the toggle.",
    learnTermId: "super_guppy",
    format: () => "",
  },
  // v5.2.0 — Keltner Channels. EMA(20) midline ± 2 × ATR(10). Envelope
  // widens in trending markets (unlike BB, which narrows during low-vol
  // squeezes). Three lines: upper, middle (EMA), lower.
  keltner_upper: {
    parentToolId: "keltner",
    name: "Keltner upper",
    color: INDICATOR_COLORS.keltner_band,
    oneLine:
      "Upper Keltner Channel — EMA(20) + 2 × ATR(10). Width tracks volatility differently than Bollinger: it widens with trend rather than narrowing in a squeeze.",
    learnTermId: "keltner",
    format: priceFormat,
  },
  keltner_middle: {
    parentToolId: "keltner",
    name: "Keltner middle (EMA 20)",
    color: INDICATOR_COLORS.keltner_mid,
    oneLine:
      "Keltner midline — EMA(20). Same midline as the standalone EMA toggle, just labelled in context of the channels.",
    learnTermId: "keltner",
    format: priceFormat,
  },
  keltner_lower: {
    parentToolId: "keltner",
    name: "Keltner lower",
    color: INDICATOR_COLORS.keltner_band,
    oneLine:
      "Lower Keltner Channel — EMA(20) − 2 × ATR(10). Closes outside the channel are 'extended', not automatic signals.",
    learnTermId: "keltner",
    format: priceFormat,
  },
  // v5.2.0 — Pivot Points. Classic floor-trader pivots anchored to the
  // chart's reference window (first 25% of visible candles by default).
  // Five horizontal lines: pivot, R1, R2, S1, S2.
  pivot_p: {
    parentToolId: "pivots",
    name: "Pivot",
    color: INDICATOR_COLORS.pivot_p,
    oneLine:
      "Central pivot — (high + low + close) / 3 of the reference window. The market's 'fair-value' anchor for the session.",
    learnTermId: "pivot_points",
    format: priceFormat,
  },
  pivot_r1: {
    parentToolId: "pivots",
    name: "R1 (resistance 1)",
    color: INDICATOR_COLORS.pivot_r1,
    oneLine:
      "First resistance — 2 × pivot − low. The closest pivot-derived ceiling above the pivot.",
    learnTermId: "pivot_points",
    format: priceFormat,
  },
  pivot_r2: {
    parentToolId: "pivots",
    name: "R2 (resistance 2)",
    color: INDICATOR_COLORS.pivot_r2,
    oneLine:
      "Second resistance — pivot + (high − low). Wider target above the pivot; meaningful trend extension if reached.",
    learnTermId: "pivot_points",
    format: priceFormat,
  },
  pivot_s1: {
    parentToolId: "pivots",
    name: "S1 (support 1)",
    color: INDICATOR_COLORS.pivot_s1,
    oneLine:
      "First support — 2 × pivot − high. The closest pivot-derived floor below the pivot.",
    learnTermId: "pivot_points",
    format: priceFormat,
  },
  pivot_s2: {
    parentToolId: "pivots",
    name: "S2 (support 2)",
    color: INDICATOR_COLORS.pivot_s2,
    oneLine:
      "Second support — pivot − (high − low). Wider floor below the pivot; meaningful trend extension if reached.",
    learnTermId: "pivot_points",
    format: priceFormat,
  },
};

// Convenience: ordered list of every line that belongs to a given toggle. The
// always-visible legend walks this to render rows in a stable, predictable
// order regardless of how the underlying series happen to be created.
export const LINES_BY_TOOL: Record<ChartToolId, IndicatorLineId[]> = {
  ema: ["ema20", "ema50", "ema200"],
  bb: ["bb_upper", "bb_middle", "bb_lower"],
  vwap: ["vwap"],
  rsi: ["rsi"],
  macd: ["macd_line", "macd_signal", "macd_hist"],
  // The 24 ribbon EMAs are represented as a single legend row — listing 24
  // would crush every other indicator off the chart.
  super_guppy: ["super_guppy"],
  chris_guppy: ["chris_guppy"],
  // v5.2.0 — Keltner mirrors Bollinger's three-line shape; Pivots ship as
  // five horizontal lines (central pivot, R1/R2 above, S1/S2 below).
  keltner: ["keltner_upper", "keltner_middle", "keltner_lower"],
  pivots: ["pivot_p", "pivot_r1", "pivot_r2", "pivot_s1", "pivot_s2"],
  // v5.2.2 — Candle patterns render as markers on the candle series, not
  // as IndicatorLineId-keyed series. Empty so the legend/tooltip system
  // skips the toggle cleanly.
  patterns: [],
};

// Convenience: the tooltip puts the closest-line description front and centre
// but also lists every visible overlay's current value. This lookup gives the
// list its label.
export function shortNameFor(id: IndicatorLineId): string {
  return INDICATOR_META[id].name;
}
