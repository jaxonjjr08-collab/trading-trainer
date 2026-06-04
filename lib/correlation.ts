// v4.1 — Pearson correlation, used by the portfolio simulator's correlation
// hint (e.g. "BTC and ETH have correlated 0.83 over the visible window —
// holding both long doubles the same bet"). Pure function, no I/O.

import type { Candle } from "./types";

// Returns Pearson's r in [-1, 1]. Null when:
//   - arrays differ in length
//   - either array has < 2 points
//   - either series has zero variance (one of the series is constant)
export function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const n = a.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    cov += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }
  if (varA === 0 || varB === 0) return null;
  return cov / Math.sqrt(varA * varB);
}

// Convenience: Pearson of two candle series' close prices. Used by the
// portfolio simulator since correlation hints want price-on-price, not
// log-returns. Beginner-friendlier (matches what people see on the chart);
// the trade-off is sensitivity to trend, which is acceptable for hints.
export function candleClosePearson(a: Candle[], b: Candle[]): number | null {
  if (a.length !== b.length) return null;
  return pearson(
    a.map((c) => c.close),
    b.map((c) => c.close)
  );
}

// Slice the first `n` candles' closes and compute correlation. Used to compute
// "correlation so far" as the portfolio session advances — the hint should
// reflect what the student has actually seen, not the full 7-day window.
export function candleClosePearsonSlice(
  a: Candle[],
  b: Candle[],
  n: number
): number | null {
  if (n < 2 || a.length < n || b.length < n) return null;
  return pearson(
    a.slice(0, n).map((c) => c.close),
    b.slice(0, n).map((c) => c.close)
  );
}
