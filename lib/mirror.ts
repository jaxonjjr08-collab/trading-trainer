// v2.4 — Mirror mode. Flips a scenario vertically around the midpoint of its
// visible price range, so a long setup reads as a short setup and vice versa.
//
// Purpose: break the directional bias most beginners (and most crypto culture)
// have toward bullish reads. The same chart structure should be evaluable
// regardless of direction. Mirror mode forces structural-only thinking by
// removing the visual cue of "going up = good."
//
// Used display-only — the user reads the mirrored chart but submits decisions
// against the original. (A future enhancement could add `mirrored: true` to
// Attempt and let the user actually submit in mirror mode for double the
// scenario coverage.)

import type { Candle, Direction, Scenario } from "./types";

function midpoint(visible: Candle[]): number {
  if (visible.length === 0) return 0;
  let hi = visible[0].high;
  let lo = visible[0].low;
  for (const c of visible) {
    if (c.high > hi) hi = c.high;
    if (c.low < lo) lo = c.low;
  }
  return (hi + lo) / 2;
}

function flipPrice(p: number, m: number): number {
  return 2 * m - p;
}

function flipCandle(c: Candle, m: number): Candle {
  return {
    time: c.time,
    open: flipPrice(c.open, m),
    close: flipPrice(c.close, m),
    high: flipPrice(c.low, m),
    low: flipPrice(c.high, m),
    volume: c.volume,
  };
}

function flipDirection(d: Direction): Direction {
  if (d === "long") return "short";
  if (d === "short") return "long";
  return "wait";
}

export function mirrorScenario(s: Scenario): Scenario {
  const m = midpoint(s.visibleCandles);
  const visible = s.visibleCandles.map((c) => flipCandle(c, m));
  const hidden = s.hiddenCandles.map((c) => flipCandle(c, m));
  return {
    ...s,
    visibleCandles: visible,
    hiddenCandles: hidden,
    keyLevels: s.keyLevels.map((l) => ({ ...l, price: flipPrice(l.price, m) })),
    preferredDecision: flipDirection(s.preferredDecision),
    acceptableDecisions: s.acceptableDecisions?.map(flipDirection),
    context: {
      ...s.context,
      // Trend names get inverted too.
      trend: s.context.trend === "up" ? "down" : s.context.trend === "down" ? "up" : "range",
      // Support and resistance swap roles when flipped.
      support: s.context.resistance.map((p) => flipPrice(p, m)),
      resistance: s.context.support.map((p) => flipPrice(p, m)),
      currentPrice: flipPrice(s.context.currentPrice, m),
      bestDirection: flipDirection(s.context.bestDirection),
    },
    // We deliberately do NOT mirror higherTimeframeCandles — that array uses
    // its own (different) midpoint range and would require a separate flip
    // to read cleanly. Hiding HTF in mirror mode is acceptable for v1.
    higherTimeframe: undefined,
    higherTimeframeCandles: undefined,
    higherTimeframeDecisionIndex: undefined,
    // Same for the idealDecisionPlan — mirroring it cleanly requires the same
    // midpoint applied to entry/stop/TP. Easy to do but omitted for v1 since
    // mirror mode disables submit anyway.
    idealDecisionPlan: undefined,
    managementPoints: undefined,
  };
}
