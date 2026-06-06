// v5.9.4 — Chris's Super Guppy. A user-editable variant of the Super Guppy
// modelled on the TradingView indicator the user already trades from. The
// stock Super Guppy ribbon (lib/indicators-guppy.ts) uses fixed 12/12 EMA
// periods; Chris's lets the user pick any subset of 11 fast + 16 slow EMAs
// plus an optional EMA 200 reference, with the source selectable across the
// usual price types. Defaults reproduce the TV indicator's defaults exactly.

import type { Candle } from "./types";
import { emaFull } from "./indicators";

export type ChrisGuppySource =
  | "close"
  | "open"
  | "high"
  | "low"
  | "hl2"
  | "hlc3"
  | "ohlc4";

export type ChrisGuppyParams = {
  // 11 fast EMA periods (TV indicator labels them Fast EMA 1..11).
  fast: number[];
  // 16 slow EMA periods (TV indicator labels them Slow EMA 1..16).
  slow: number[];
  // The 200 EMA reference. Drawn when show200 is true; used as the bull/bear
  // regime filter when filterWith200 is true.
  ema200Length: number;
  source: ChrisGuppySource;
  showAverageCurves: boolean;
  show200: boolean;
  filterWith200: boolean;
  colourCandles: boolean;
};

export const CHRIS_GUPPY_DEFAULTS: ChrisGuppyParams = {
  // Pulled from the TradingView indicator the user shared screenshots of.
  fast: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
  slow: [25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70],
  ema200Length: 200,
  source: "close",
  showAverageCurves: false,
  show200: false,
  filterWith200: false,
  colourCandles: false,
};

export type ChrisGuppyTrendState = "bull" | "bear" | "neutral";

export type ChrisGuppyValues = {
  fast: Array<(number | null)[]>;
  slow: Array<(number | null)[]>;
  fastAvg: (number | null)[] | null;
  slowAvg: (number | null)[] | null;
  ema200: (number | null)[] | null;
};

function sourceSeries(candles: Candle[], source: ChrisGuppySource): Candle[] {
  // Project the chosen source as a synthetic close, leaving OHLC otherwise
  // untouched so the EMA helper (which only reads close) computes the right
  // series without needing a separate code path.
  if (source === "close") return candles;
  return candles.map((c) => {
    let v = c.close;
    switch (source) {
      case "open":
        v = c.open;
        break;
      case "high":
        v = c.high;
        break;
      case "low":
        v = c.low;
        break;
      case "hl2":
        v = (c.high + c.low) / 2;
        break;
      case "hlc3":
        v = (c.high + c.low + c.close) / 3;
        break;
      case "ohlc4":
        v = (c.open + c.high + c.low + c.close) / 4;
        break;
    }
    return { ...c, close: v };
  });
}

function average(series: Array<(number | null)[]>): (number | null)[] {
  if (series.length === 0) return [];
  const length = series[0].length;
  const out: (number | null)[] = new Array(length).fill(null);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    let count = 0;
    for (const s of series) {
      const v = s[i];
      if (v != null) {
        sum += v;
        count++;
      }
    }
    if (count === series.length) out[i] = sum / count;
  }
  return out;
}

export function computeChrisGuppy(
  candles: Candle[],
  params: ChrisGuppyParams
): ChrisGuppyValues {
  const src = sourceSeries(candles, params.source);
  // v5.9.8 — emaFull so the (up to period-70) slow ribbon still renders and
  // colors on short Practice scenarios. See lib/indicators-guppy.ts.
  const fast = params.fast.map((p) => emaFull(src, Math.max(1, Math.round(p))));
  const slow = params.slow.map((p) => emaFull(src, Math.max(1, Math.round(p))));
  return {
    fast,
    slow,
    fastAvg: params.showAverageCurves ? average(fast) : null,
    slowAvg: params.showAverageCurves ? average(slow) : null,
    ema200: params.show200 || params.filterWith200
      ? emaFull(src, Math.max(1, Math.round(params.ema200Length)))
      : null,
  };
}

// Trend state at a candle index. Same strict rule as the stock Super Guppy:
// every fast EMA must sit above (or below) every slow EMA. When filterWith200
// is on, an extra gate is applied — bull requires price above the EMA 200,
// bear below — so an uptrend's ribbon can't flag as bull from below the long
// regime line.
export function chrisGuppyStateAt(
  values: ChrisGuppyValues,
  candles: Candle[],
  index: number,
  filterWith200: boolean
): ChrisGuppyTrendState {
  let fastMin = Infinity;
  let fastMax = -Infinity;
  let slowMin = Infinity;
  let slowMax = -Infinity;
  for (const s of values.fast) {
    const v = s[index];
    if (v == null) return "neutral";
    if (v < fastMin) fastMin = v;
    if (v > fastMax) fastMax = v;
  }
  for (const s of values.slow) {
    const v = s[index];
    if (v == null) return "neutral";
    if (v < slowMin) slowMin = v;
    if (v > slowMax) slowMax = v;
  }
  let state: ChrisGuppyTrendState = "neutral";
  if (fastMin > slowMax) state = "bull";
  else if (fastMax < slowMin) state = "bear";

  if (filterWith200 && values.ema200) {
    const ref = values.ema200[index];
    const close = candles[index]?.close;
    if (ref == null || close == null) return "neutral";
    if (state === "bull" && close <= ref) return "neutral";
    if (state === "bear" && close >= ref) return "neutral";
  }
  return state;
}

export function chrisGuppyStateLatest(
  values: ChrisGuppyValues,
  candles: Candle[],
  filterWith200: boolean
): ChrisGuppyTrendState {
  if (candles.length === 0) return "neutral";
  return chrisGuppyStateAt(values, candles, candles.length - 1, filterWith200);
}
