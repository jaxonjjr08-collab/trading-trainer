// v5.1.1 — Super Guppy = Guppy Multiple Moving Average (GMMA) with extra
// EMAs and trend-state coloring. Two clusters of 12 EMAs each:
//
//   Short (traders' eye):     3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25
//   Long  (investors' eye):   28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61
//
// The "Super" part is the comparison: when every short EMA sits above every
// long EMA, the trend is uncontested up; below, uncontested down; interleaved,
// in transition. Drawn as a colored ribbon so the trend state reads at a
// glance, even from across the room.
//
// This isn't a signal generator — it's a trend visualizer. The trainer's
// review copy and the Learn term are deliberate about that distinction.

import type { Candle } from "./types";
import { ema } from "./indicators";

export const GUPPY_SHORT_PERIODS = [
  3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25,
] as const;
export const GUPPY_LONG_PERIODS = [
  28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61,
] as const;

export type GuppyTrendState = "bull" | "bear" | "neutral";

export type GuppyValues = {
  // [periodIndex][candleIndex]. short[0] is EMA(3); short[11] is EMA(25);
  // long[0] is EMA(28); long[11] is EMA(61). Each inner array is the same
  // length as the input candles array, with null during the period's warmup.
  short: Array<(number | null)[]>;
  long: Array<(number | null)[]>;
};

// Compute every EMA needed by the Super Guppy in one pass. 24 EMAs sounds
// like a lot but each is O(n) and the candle count for any chart we render
// is bounded (~300 max), so even on the lowest-end laptop this is sub-ms.
export function computeGuppy(candles: Candle[]): GuppyValues {
  return {
    short: GUPPY_SHORT_PERIODS.map((p) => ema(candles, p)),
    long: GUPPY_LONG_PERIODS.map((p) => ema(candles, p)),
  };
}

// Trend state at a specific candle index. Strict separation: every short EMA
// must be above (or below) every long EMA. If any required EMA is still in
// warmup (null), we conservatively report "neutral" since the picture is
// incomplete. This matches what a trader sees on the chart — until the long
// cluster has settled, the ribbon isn't telling you anything reliable.
export function guppyTrendStateAt(
  values: GuppyValues,
  index: number
): GuppyTrendState {
  let shortMin = Infinity;
  let shortMax = -Infinity;
  let longMin = Infinity;
  let longMax = -Infinity;
  for (const series of values.short) {
    const v = series[index];
    if (v == null) return "neutral";
    if (v < shortMin) shortMin = v;
    if (v > shortMax) shortMax = v;
  }
  for (const series of values.long) {
    const v = series[index];
    if (v == null) return "neutral";
    if (v < longMin) longMin = v;
    if (v > longMax) longMax = v;
  }
  if (shortMin > longMax) return "bull";
  if (shortMax < longMin) return "bear";
  return "neutral";
}

// Most-recent trend state — what the legend chip and hover tooltip show.
// Reads the state at the last candle. Defensive for empty input.
export function guppyTrendStateLatest(
  values: GuppyValues,
  candleCount: number
): GuppyTrendState {
  if (candleCount === 0) return "neutral";
  return guppyTrendStateAt(values, candleCount - 1);
}
