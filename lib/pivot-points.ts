// v5.2.0 — Classic floor-trader pivot points.
//
// Traditional pivots anchor to the prior period's high/low/close (daily
// pivots use yesterday's bar, weekly pivots use last week's, etc.). In the
// trainer that anchoring is awkward — scenarios often span a single
// "session" of arbitrary length, with no obvious "prior day" to anchor to.
//
// So this module computes ONE set of pivot levels from a configurable
// "reference window" — the first N candles of the chart, defaulting to 25%
// of the visible range. The pivots stay static across the rest of the
// chart, drawn as horizontal lines. This teaches the *concept* of pivot
// levels as fixed support/resistance references the market trades around,
// without the noise of recomputation every period.
//
// Formula (the standard floor-trader pivot, used worldwide):
//   Pivot = (H + L + C) / 3
//   R1    = 2P - L
//   S1    = 2P - H
//   R2    = P + (H - L)
//   S2    = P - (H - L)
//   R3    = H + 2(P - L)
//   S3    = L - 2(H - P)
// We ship R1/S1/R2/S2 + P. R3/S3 are extrapolations; less useful for the
// study setting and crowd out the chart at scale.

import type { Candle } from "./types";

export type PivotLevels = {
  pivot: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
};

// Compute pivot levels from a reference window — the first `windowSize`
// candles of the input. Returns null when the window is empty (not enough
// data to define a reference).
export function pivotLevels(
  candles: Candle[],
  windowSize: number
): PivotLevels | null {
  if (candles.length === 0 || windowSize <= 0) return null;
  const window = candles.slice(0, Math.min(windowSize, candles.length));
  let high = -Infinity;
  let low = Infinity;
  for (const c of window) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  const close = window[window.length - 1].close;
  const pivot = (high + low + close) / 3;
  return {
    pivot,
    r1: 2 * pivot - low,
    s1: 2 * pivot - high,
    r2: pivot + (high - low),
    s2: pivot - (high - low),
  };
}

// Default reference window: 25% of the visible candles, clamped to at least
// 5 and at most 30. Plenty of price action to anchor on, but leaves the
// majority of the chart available to *use* the pivots as references.
export function defaultPivotWindow(candleCount: number): number {
  return Math.max(5, Math.min(30, Math.round(candleCount * 0.25)));
}
