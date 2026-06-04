// v4.0.2 — covers the indicator math used by the Practice chart overlays.
// These are pure functions; the goal here is to pin warmup behaviour and basic
// numeric correctness so a future refactor can't silently drift values.

import { describe, it, expect } from "vitest";
import {
  atr,
  bollingerBands,
  ema,
  keltnerChannels,
  macd,
  rsi,
  sma,
  vwap,
} from "../indicators";
import type { Candle } from "../types";

function mkCandles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    time: 1000 + i * 60,
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: 100,
  }));
}

describe("sma", () => {
  it("returns all-null for empty input", () => {
    expect(sma([], 5)).toEqual([]);
  });

  it("returns nulls during warmup", () => {
    const out = sma(mkCandles([1, 2, 3, 4, 5]), 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(2); // (1+2+3)/3
    expect(out[3]).toBe(3);
    expect(out[4]).toBe(4);
  });

  it("returns all-null when input is shorter than period", () => {
    expect(sma(mkCandles([1, 2]), 5)).toEqual([null, null]);
  });
});

describe("ema", () => {
  it("seeds with SMA at index period-1", () => {
    const out = ema(mkCandles([1, 2, 3, 4, 5, 6]), 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(2); // SMA seed = (1+2+3)/3
  });

  it("reacts faster than SMA to a step change", () => {
    const closes = [10, 10, 10, 10, 10, 20, 20, 20, 20, 20];
    const smaOut = sma(mkCandles(closes), 5);
    const emaOut = ema(mkCandles(closes), 5);
    // Right after the step (index 5), EMA should already be above SMA — the
    // SMA window still holds four old 10s, but EMA has weighted the new 20
    // more aggressively. (At the END of the run both converge to 20.)
    expect(emaOut[5]!).toBeGreaterThan(smaOut[5]!);
  });

  it("handles short input gracefully", () => {
    expect(ema(mkCandles([1, 2]), 5)).toEqual([null, null]);
  });
});

describe("rsi", () => {
  it("returns nulls through the warmup period", () => {
    const out = rsi(mkCandles([1, 2, 3, 4, 5]), 14);
    expect(out.every((v) => v === null)).toBe(true);
  });

  it("returns 100 for a perfectly rising series", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 10 + i);
    const out = rsi(mkCandles(closes), 14);
    const last = out[out.length - 1]!;
    expect(last).toBe(100);
  });

  it("returns ~0 for a perfectly falling series", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 - i);
    const out = rsi(mkCandles(closes), 14);
    const last = out[out.length - 1]!;
    expect(last).toBe(0);
  });

  it("first non-null lands at index = period", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + ((i * 7) % 5));
    const out = rsi(mkCandles(closes), 14);
    expect(out[13]).toBeNull();
    expect(out[14]).not.toBeNull();
  });
});

describe("macd", () => {
  it("emits nulls during slow EMA warmup", () => {
    const out = macd(mkCandles([1, 2, 3, 4, 5]), 12, 26, 9);
    expect(out.macd.every((v) => v === null)).toBe(true);
    expect(out.signal.every((v) => v === null)).toBe(true);
    expect(out.histogram.every((v) => v === null)).toBe(true);
  });

  it("histogram = macd - signal where both defined", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 50 + Math.sin(i / 3) * 5);
    const out = macd(mkCandles(closes), 12, 26, 9);
    for (let i = 0; i < closes.length; i++) {
      const m = out.macd[i];
      const s = out.signal[i];
      const h = out.histogram[i];
      if (m != null && s != null) {
        expect(h).not.toBeNull();
        expect(Math.abs((h as number) - (m - s))).toBeLessThan(1e-9);
      } else {
        expect(h).toBeNull();
      }
    }
  });

  it("signal first appears after macd warmup + signalPeriod-1 candles", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 50 + i * 0.1);
    const out = macd(mkCandles(closes), 12, 26, 9);
    // MACD starts at index 25 (slow=26 → seed at index 25), so signal needs
    // 9 more values → first signal at index 33.
    expect(out.signal[32]).toBeNull();
    expect(out.signal[33]).not.toBeNull();
  });
});

describe("bollingerBands", () => {
  it("middle equals SMA", () => {
    const closes = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
    const bb = bollingerBands(mkCandles(closes), 5, 2);
    const smaOut = sma(mkCandles(closes), 5);
    expect(bb.middle).toEqual(smaOut);
  });

  it("upper > middle > lower past warmup", () => {
    const closes = [10, 12, 11, 13, 12, 14, 13, 15];
    const bb = bollingerBands(mkCandles(closes), 5, 2);
    for (let i = 4; i < closes.length; i++) {
      expect(bb.upper[i]!).toBeGreaterThan(bb.middle[i]!);
      expect(bb.middle[i]!).toBeGreaterThan(bb.lower[i]!);
    }
  });

  it("flat input collapses bands to the middle", () => {
    const closes = [50, 50, 50, 50, 50, 50, 50, 50];
    const bb = bollingerBands(mkCandles(closes), 5, 2);
    const last = closes.length - 1;
    expect(bb.upper[last]).toBe(50);
    expect(bb.lower[last]).toBe(50);
  });
});

describe("vwap", () => {
  it("first value equals first candle's typical price", () => {
    const candles: Candle[] = [
      { time: 0, open: 9, high: 12, low: 8, close: 10, volume: 100 },
    ];
    const out = vwap(candles);
    expect(out[0]).toBeCloseTo((12 + 8 + 10) / 3, 9);
  });

  it("collapses to typical price when all candles share the same prices", () => {
    const candles: Candle[] = Array.from({ length: 5 }, (_, i) => ({
      time: i,
      open: 10,
      high: 12,
      low: 8,
      close: 10,
      volume: 100,
    }));
    const out = vwap(candles);
    for (const v of out) {
      expect(v).toBeCloseTo(10, 9);
    }
  });

  it("weights higher-volume candles more", () => {
    const candles: Candle[] = [
      { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 1 },
      { time: 1, open: 20, high: 20, low: 20, close: 20, volume: 999 },
    ];
    const out = vwap(candles);
    // VWAP at index 1 should be heavily pulled toward 20.
    expect(out[1]!).toBeGreaterThan(19);
  });

  it("returns null when zero volume so far", () => {
    const candles: Candle[] = [
      { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 0 },
    ];
    expect(vwap(candles)).toEqual([null]);
  });
});

describe("atr", () => {
  it("returns all nulls when candle count is less than period", () => {
    const candles = mkCandles([100, 101, 102]);
    const out = atr(candles, 10);
    expect(out).toEqual([null, null, null]);
  });

  it("returns nulls through warmup, then a number at period-1", () => {
    // 12 candles with TR=2 each (high-low=2 because mkCandles sets +1/-1
    // around close). First-bar TR uses high-low (no prevClose). Other bars'
    // TR is still 2 since (close - prevClose) is small relative to the
    // intrabar range.
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111];
    const out = atr(mkCandles(closes), 10);
    for (let i = 0; i < 9; i++) expect(out[i]).toBeNull();
    expect(out[9]).not.toBeNull();
  });

  it("converges to the steady-state true range on a constant-volatility input", () => {
    // Identical bar shapes → ATR converges to high - low.
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 100,
    }));
    const out = atr(candles, 10);
    // After plenty of bars past warmup, ATR should equal 10.
    expect(out[29]).toBeCloseTo(10, 5);
  });
});

describe("keltnerChannels", () => {
  it("returns nulls during warmup", () => {
    const out = keltnerChannels(mkCandles([100, 101]), 20, 10, 2);
    expect(out.upper).toEqual([null, null]);
    expect(out.middle).toEqual([null, null]);
    expect(out.lower).toEqual([null, null]);
  });

  it("upper = middle + 2*ATR; lower = middle - 2*ATR", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const candles = mkCandles(closes);
    const out = keltnerChannels(candles, 20, 10, 2);
    const i = candles.length - 1;
    const mid = out.middle[i]!;
    const upper = out.upper[i]!;
    const lower = out.lower[i]!;
    expect(upper - mid).toBeCloseTo(mid - lower, 5);
    // Width should be positive on a moving series.
    expect(upper).toBeGreaterThan(lower);
  });

  it("envelope width tracks ATR (constant-bar input → constant width)", () => {
    const candles: Candle[] = Array.from({ length: 60 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 100,
    }));
    const out = keltnerChannels(candles, 20, 10, 2);
    // ATR converges to 10, so envelope width = 2 * 2 * 10 = 40 → upper-mid = 20.
    const i = candles.length - 1;
    expect(out.upper[i]! - out.middle[i]!).toBeCloseTo(20, 3);
  });
});
