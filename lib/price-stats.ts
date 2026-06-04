// v5.8.2 — Shared price-window stats so the symbol tabs and the hero
// price ticker agree on "what's the change." Previously the tab computed
// percent over the ENTIRE loaded window (e.g. -10.86% across 463 bars)
// while the ticker computed a 24h-capped change (-0.93%), so the same
// symbol showed two contradictory numbers stacked on top of each other.
//
// Single source of truth: a 24h-back reference, capped at the oldest
// loaded bar when the window is shorter than 24h. Callers label the
// lookback honestly ("24h" vs "8h") using the returned hoursBack.

import type { Candle } from "./types";

export type PriceWindowStats = {
  price: number;        // latest close
  change: number;       // price - reference close
  changePct: number;    // signed percent
  hoursBack: number;    // how far back the reference actually sits
  direction: "up" | "down" | "flat";
};

// Find the candle closest to (but not before) 24h ago. Falls back to the
// oldest candle when the loaded window is shorter than a day.
function referenceCandle(candles: Candle[]): Candle | null {
  if (candles.length === 0) return null;
  const last = candles[candles.length - 1];
  const target = last.time - 24 * 3600;
  let lo = 0;
  let hi = candles.length - 1;
  let bestIdx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time >= target) {
      bestIdx = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return candles[bestIdx];
}

export function priceWindowStats(candles: Candle[]): PriceWindowStats | null {
  if (candles.length === 0) return null;
  const last = candles[candles.length - 1];
  const ref = referenceCandle(candles) ?? last;
  const price = last.close;
  const change = price - ref.close;
  const changePct = ref.close !== 0 ? (change / ref.close) * 100 : 0;
  const hoursBack = (last.time - ref.time) / 3600;
  const direction: "up" | "down" | "flat" =
    change > 0 ? "up" : change < 0 ? "down" : "flat";
  return { price, change, changePct, hoursBack, direction };
}

// Human label for the lookback window. "24h" when we have a full day or
// more of data; otherwise the actual hours rounded ("8h"), or "session"
// when the window is under an hour.
export function lookbackLabel(hoursBack: number): string {
  if (hoursBack >= 23) return "24h";
  if (hoursBack >= 1) return `${Math.round(hoursBack)}h`;
  return "session";
}
