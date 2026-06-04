// v5.2.1 — Pure helpers for the chart's measure tool.
//
// Given two clicked points (each: time + price, the same shape as
// drawings.DrawingPoint), this module computes everything the measure
// overlay shows: price delta, percent change, candle delta, time delta,
// and the implied R:R if you treated the two prices as entry → target.
//
// Time formatting is deliberately compact ("3d 4h", "2h 30m", "45m")
// because the overlay box has limited real estate. Time deltas are computed
// from the two click points' time-seconds, not from candle counts, so the
// reading is honest even when the chart has gaps.

import type { Candle } from "./types";

export type MeasureStats = {
  priceDelta: number;
  // Signed: positive when point B > point A in price, negative otherwise.
  pricePct: number;
  // Number of candles strictly between A and B, inclusive of endpoints when
  // both align to candle times. Computed by binary-searching the candle
  // array. Useful as "this move took N bars on this timeframe."
  candleCount: number;
  // Absolute time delta in seconds (always positive — A and B sorted).
  timeDeltaSec: number;
  // Pre-formatted strings the overlay shows directly.
  timeLabel: string;
  // R:R if (A → B) were (entry, target) and the move went against the user
  // by 1% from entry. Reported as a multiple, e.g. 2.3 means "+2.3R." Null
  // when the price delta is zero (no meaningful direction).
  impliedR: number | null;
  // "bull" when price went up from A to B, "bear" when down, "flat" when
  // equal. Drives the overlay's color chip.
  direction: "bull" | "bear" | "flat";
};

type Point = { time: number; price: number };

export function computeMeasure(
  a: Point,
  b: Point,
  candles: Candle[]
): MeasureStats {
  // Normalize: A is the earlier point in time so deltas are signed
  // consistently and the "B > A" arrow always points forward.
  const first = a.time <= b.time ? a : b;
  const second = a.time <= b.time ? b : a;

  const priceDelta = second.price - first.price;
  const pricePct =
    first.price === 0 ? 0 : (priceDelta / first.price) * 100;
  const timeDeltaSec = Math.max(0, second.time - first.time);

  const candleCount = countCandlesBetween(candles, first.time, second.time);

  const direction: MeasureStats["direction"] =
    priceDelta > 0 ? "bull" : priceDelta < 0 ? "bear" : "flat";

  // Implied R: arbitrary risk anchor of 1% — same convention the trainer's
  // scoring uses by default. (priceDelta / firstPrice) * 100 = pct move; one
  // R = 1% of entry; impliedR = pct / 1. Signed so the chip can read +1.4R
  // / -2.1R.
  const impliedR = priceDelta === 0 ? null : pricePct;

  return {
    priceDelta,
    pricePct,
    candleCount,
    timeDeltaSec,
    timeLabel: formatTimeDelta(timeDeltaSec),
    impliedR,
    direction,
  };
}

// Count candles whose time falls within [startTime, endTime] inclusive.
// Binary-searches both endpoints because typical chart inputs are >= 200
// candles, and the measure overlay updates on every click.
export function countCandlesBetween(
  candles: Candle[],
  startTime: number,
  endTime: number
): number {
  if (candles.length === 0) return 0;
  const lo = lowerBound(candles, startTime);
  const hi = upperBound(candles, endTime);
  return Math.max(0, hi - lo);
}

function lowerBound(candles: Candle[], target: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(candles: Candle[], target: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Compact human-readable formatter. Examples:
//   90 seconds        → "1m 30s"
//   45 minutes        → "45m"
//   2.5 hours         → "2h 30m"
//   3 days 4 hours    → "3d 4h"
//   25 days           → "25d"
// Designed to fit inside the overlay box without wrapping.
export function formatTimeDelta(sec: number): string {
  if (sec <= 0) return "0s";
  const day = 86400;
  const hour = 3600;
  const minute = 60;
  if (sec >= day) {
    const d = Math.floor(sec / day);
    const h = Math.floor((sec - d * day) / hour);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  if (sec >= hour) {
    const h = Math.floor(sec / hour);
    const m = Math.floor((sec - h * hour) / minute);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (sec >= minute) {
    const m = Math.floor(sec / minute);
    const s = sec - m * minute;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${sec}s`;
}
