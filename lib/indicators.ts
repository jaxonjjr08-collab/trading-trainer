// v4.0.2 — pure indicator math for the Practice chart overlays.
//
// Each function takes a Candle[] and returns an aligned series of (number | null).
// Null marks the warmup period where the indicator can't be computed yet (e.g. the
// first 19 candles of a 20-period SMA). This shape maps directly onto
// lightweight-charts line/histogram series (filter nulls before setData).
//
// Conventions:
// - All math here is pure. No I/O, no randomness, no globals. The Practice chart
//   computes overlays on render; the cost is linear in candle count.
// - VWAP is anchored to the first candle in the input array (not session-anchored
//   in the traditional sense). For scenarios this is what beginners expect — the
//   indicator means something relative to the chart they're staring at.

import type { Candle } from "./types";

// Simple moving average over the close.
export function sma(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period <= 0 || candles.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  out[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    out[i] = sum / period;
  }
  return out;
}

// Exponential moving average, seeded with the SMA of the first `period` candles.
// This matches the way most charting platforms (TradingView, lightweight-charts
// docs, common ta libs) seed EMA so values line up with what the user sees
// elsewhere.
export function ema(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period <= 0 || candles.length < period) return out;
  const alpha = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += candles[i].close;
  seed /= period;
  out[period - 1] = seed;
  for (let i = period; i < candles.length; i++) {
    const prev = out[i - 1] as number;
    out[i] = alpha * candles[i].close + (1 - alpha) * prev;
  }
  return out;
}

// v5.9.8 — Best-effort EMA that emits a value at EVERY candle, seeded from the
// first close. Unlike ema() (which returns nulls until `period` candles exist,
// matching TradingView's warmup), this never returns null while there's data.
//
// Why it exists: Practice scenarios carry only 15–90 candles, but the Super
// Guppy ribbon uses periods up to 61 and the EMA overlay includes EMA(200).
// With the strict ema(), those long EMAs are all-null on a short chart, so the
// ribbon's trend-state classifier was permanently stuck on "neutral" (gray)
// and EMA 50/200 never drew. emaFull seeds from candle 0 so the line always
// renders; during the first `period` bars the value is an approximation that
// converges to the true EMA, and from then on the two agree. Used only for the
// overlay/ribbon rendering — MACD and the canonical ema() are untouched so
// their TradingView-faithful warmup (and the tests pinning it) stay intact.
export function emaFull(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period <= 0 || candles.length === 0) return out;
  const alpha = 2 / (period + 1);
  let prev = candles[0].close;
  out[0] = prev;
  for (let i = 1; i < candles.length; i++) {
    prev = alpha * candles[i].close + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

// RSI using Wilder's smoothing. Returns values in [0, 100] for indices past the
// warmup; nulls during warmup (the first `period` candles).
export function rsi(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period <= 0 || candles.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    avgGain += Math.max(diff, 0);
    avgLoss += Math.max(-diff, 0);
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export type MACDSeries = {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
};

// MACD = EMA(fast) - EMA(slow); signal = EMA of MACD; histogram = MACD - signal.
// Defaults are the de-facto 12/26/9 from Gerald Appel's original spec.
export function macd(
  candles: Candle[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MACDSeries {
  const length = candles.length;
  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);
  const macdLine: (number | null)[] = new Array(length).fill(null);
  for (let i = 0; i < length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f != null && s != null) macdLine[i] = f - s;
  }

  // Signal = EMA of MACD, but MACD itself has a warmup. Seed the signal EMA
  // with the SMA of the first signalPeriod non-null MACD values.
  const signal: (number | null)[] = new Array(length).fill(null);
  const startIdx = macdLine.findIndex((v) => v != null);
  if (startIdx !== -1 && length - startIdx >= signalPeriod) {
    let seed = 0;
    for (let i = startIdx; i < startIdx + signalPeriod; i++) {
      seed += macdLine[i] as number;
    }
    seed /= signalPeriod;
    const seedIdx = startIdx + signalPeriod - 1;
    signal[seedIdx] = seed;
    const alpha = 2 / (signalPeriod + 1);
    for (let i = seedIdx + 1; i < length; i++) {
      const prev = signal[i - 1] as number;
      signal[i] = alpha * (macdLine[i] as number) + (1 - alpha) * prev;
    }
  }

  const histogram: (number | null)[] = new Array(length).fill(null);
  for (let i = 0; i < length; i++) {
    const m = macdLine[i];
    const sg = signal[i];
    if (m != null && sg != null) histogram[i] = m - sg;
  }

  return { macd: macdLine, signal, histogram };
}

export type BollingerSeries = {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
};

// Bollinger Bands: middle = SMA(period); upper/lower = middle ± stdDevs * σ.
// σ uses population stdev (divide by N, not N-1) to match TradingView.
export function bollingerBands(
  candles: Candle[],
  period = 20,
  stdDevs = 2
): BollingerSeries {
  const middle = sma(candles, period);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  if (period <= 0 || candles.length < period) {
    return { upper, middle, lower };
  }
  for (let i = period - 1; i < candles.length; i++) {
    const m = middle[i] as number;
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = candles[j].close - m;
      sumSq += d * d;
    }
    const stdev = Math.sqrt(sumSq / period);
    upper[i] = m + stdDevs * stdev;
    lower[i] = m - stdDevs * stdev;
  }
  return { upper, middle, lower };
}

// Anchored VWAP starting at the first candle. Typical price * volume,
// accumulated and divided by accumulated volume. Returns null only if every
// preceding candle has zero volume (synthetic scenarios sometimes do).
export function vwap(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let cumPv = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typical = (c.high + c.low + c.close) / 3;
    cumPv += typical * c.volume;
    cumV += c.volume;
    out[i] = cumV > 0 ? cumPv / cumV : null;
  }
  return out;
}

// v5.2.0 — Average True Range using Wilder's smoothing (the standard).
//   TR[i] = max(high - low, |high - prevClose|, |low - prevClose|)
//   ATR[0..period-1] = null (warmup)
//   ATR[period-1] = simple average of the first `period` TRs
//   ATR[i>=period] = (ATR[i-1] * (period - 1) + TR[i]) / period
// Used by Keltner Channels and as a building block for slippage modelling.
export function atr(candles: Candle[], period = 10): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period <= 0 || candles.length === 0) return out;
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = i > 0 ? candles[i - 1].close : c.close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trs.push(tr);
  }
  if (trs.length < period) return out;
  let seed = 0;
  for (let i = 0; i < period; i++) seed += trs[i];
  seed /= period;
  out[period - 1] = seed;
  for (let i = period; i < candles.length; i++) {
    const prev = out[i - 1] as number;
    out[i] = (prev * (period - 1) + trs[i]) / period;
  }
  return out;
}

// v5.2.0 — Keltner Channels: EMA(20) midline ± 2 × ATR(10). The EMA-based
// midline reacts faster than Bollinger's SMA-anchored midline, and ATR
// envelope width tracks volatility differently than BB's standard-deviation
// width — Keltner widens in trending markets, BB narrows in low-volatility
// regimes (squeeze). Both are useful; they teach different lessons.
export function keltnerChannels(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 10,
  atrMultiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = ema(candles, emaPeriod);
  const atrValues = atr(candles, atrPeriod);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const m = middle[i];
    const a = atrValues[i];
    if (m == null || a == null) continue;
    upper[i] = m + atrMultiplier * a;
    lower[i] = m - atrMultiplier * a;
  }
  return { upper, middle, lower };
}
