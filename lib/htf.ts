// v2.2 — Higher-timeframe (HTF) helpers shared by the scenario-authoring
// workflow and the HTFChart component.
//
// Authoring workflow: for each scenario, refetch the same time window at a
// higher granularity (widened 3–5× so the HTF chart has context). Compute the
// decision index with findHTFDecisionIndex(htfCandles, mainDecisionCandle.time)
// so the practice page can mark where the user is on the bigger chart.

import type { Candle } from "./types";

// Coinbase-supported granularities. Used by scripts/fetch-candles.ts. The
// mapping is human-friendly labels, not seconds.
export const HTF_MAPPING: Record<string, string | null> = {
  "15m": "1h",
  "1h": "6h",   // Coinbase doesn't support native 4h; 6h is the next step up
  "6h": "1d",
  "1d": null,   // No native 1w on Coinbase; daily is the top
};

export function htfFor(timeframe: string): string | null {
  return HTF_MAPPING[timeframe] ?? null;
}

// Returns the index of the HTF candle whose time bucket contains
// mainCandleTime — i.e. the last candle whose time is <= mainCandleTime.
// Used by the HTFChart marker and by scenario authors to set
// higherTimeframeDecisionIndex.
export function findHTFDecisionIndex(htf: Candle[], mainCandleTime: number): number {
  if (htf.length === 0) return 0;
  let lo = 0;
  let hi = htf.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (htf[mid].time <= mainCandleTime) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

// v4.0 — Downsample LTF candles into HTF candles by bucketing groups of N.
// Used by the Practice page so every scenario can show an HTF panel even
// when the original wasn't authored with one. Quality is lower than real
// fetched HTF (we lose intra-bucket volatility that didn't land at bucket
// edges) but it's directionally honest and beats nothing.
//
// Bucket math:
//   open  = first.open  in the bucket
//   close = last.close  in the bucket
//   high  = max of all  highs
//   low   = min of all  lows
//   volume = sum of all volumes
//   time  = first.time  in the bucket
//
// The final bucket may be partial; we still emit it so the user sees the
// most recent activity (typical chart behaviour for "developing" bars).
export function synthesizeHTF(candles: Candle[], bucketSize: number): Candle[] {
  if (candles.length === 0 || bucketSize <= 1) return [];
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += bucketSize) {
    const slice = candles.slice(i, i + bucketSize);
    if (slice.length === 0) continue;
    const first = slice[0];
    const last = slice[slice.length - 1];
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (const c of slice) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      volume += c.volume;
    }
    out.push({
      time: first.time,
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
    });
  }
  return out;
}

// v4.0 — Bucket size to use when synthesising HTF from a given LTF
// timeframe label. Mirrors HTF_MAPPING but expressed as candle counts:
// e.g. four 1h candles fit into one 4h candle (we use 6 to land on the
// nearest Coinbase-supported HTF — see HTF_MAPPING). Returns 0 for
// timeframes with no clear HTF (1d has no native 1w on Coinbase, etc.);
// callers should skip synthesis in that case.
export function htfBucketSize(timeframe: string): number {
  switch (timeframe) {
    case "15m":
      return 4; // 15m → 1h
    case "1h":
      return 6; // 1h → 6h
    case "4h":
      return 6; // 4h → 1d
    case "6h":
      return 4; // 6h → 1d
    default:
      return 0;
  }
}
