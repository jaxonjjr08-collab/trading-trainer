// v5.1.1 — Pins the Super Guppy math used by the Practice chart's ribbon
// rendering. The trend-state classifier is the brain of the visualization;
// the period lists and per-EMA computation reuse already have coverage via
// indicators.test.ts (one EMA per period from a shared helper). Here we pin
// the state classification and confirm the period set is what the docs
// promise.

import { describe, it, expect } from "vitest";
import {
  GUPPY_LONG_PERIODS,
  GUPPY_SHORT_PERIODS,
  computeGuppy,
  guppyTrendStateAt,
  guppyTrendStateLatest,
} from "../indicators-guppy";
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

describe("Super Guppy period lists", () => {
  it("ships 12 short and 12 long EMAs", () => {
    expect(GUPPY_SHORT_PERIODS).toHaveLength(12);
    expect(GUPPY_LONG_PERIODS).toHaveLength(12);
  });

  it("short periods are 3..25 stepping by 2", () => {
    expect([...GUPPY_SHORT_PERIODS]).toEqual([
      3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25,
    ]);
  });

  it("long periods are 28..61 stepping by 3", () => {
    expect([...GUPPY_LONG_PERIODS]).toEqual([
      28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61,
    ]);
  });

  it("short periods never overlap long periods", () => {
    const maxShort = Math.max(...GUPPY_SHORT_PERIODS);
    const minLong = Math.min(...GUPPY_LONG_PERIODS);
    expect(maxShort).toBeLessThan(minLong);
  });
});

describe("computeGuppy", () => {
  it("returns one EMA series per period", () => {
    const candles = mkCandles(Array.from({ length: 80 }, (_, i) => 100 + i));
    const out = computeGuppy(candles);
    expect(out.short).toHaveLength(GUPPY_SHORT_PERIODS.length);
    expect(out.long).toHaveLength(GUPPY_LONG_PERIODS.length);
    for (const s of out.short) expect(s).toHaveLength(candles.length);
    for (const s of out.long) expect(s).toHaveLength(candles.length);
  });

  it("warmup nulls on the longest long EMA cover at least its period length", () => {
    const candles = mkCandles(Array.from({ length: 100 }, (_, i) => 100 + i));
    const out = computeGuppy(candles);
    // EMA(61) seeds with the SMA of the first 61 values; index 60 is the
    // earliest non-null. Anything < 60 must be null.
    const ema61 = out.long[out.long.length - 1];
    for (let i = 0; i < 60; i++) {
      expect(ema61[i]).toBeNull();
    }
    expect(ema61[60]).not.toBeNull();
  });
});

describe("guppyTrendStateAt", () => {
  it("returns neutral when not all EMAs have settled", () => {
    const candles = mkCandles(Array.from({ length: 50 }, (_, i) => 100 + i));
    const out = computeGuppy(candles);
    // EMA(61) is still null at index 49 → neutral.
    expect(guppyTrendStateAt(out, 49)).toBe("neutral");
  });

  it("returns bull when every short EMA sits above every long EMA", () => {
    // Strong, monotonic uptrend: shorter EMAs catch the recent rise faster
    // than longer EMAs, so shorts > longs by the time the long cluster has
    // settled.
    const closes = Array.from({ length: 200 }, (_, i) => 100 + i);
    const candles = mkCandles(closes);
    const out = computeGuppy(candles);
    expect(guppyTrendStateAt(out, candles.length - 1)).toBe("bull");
  });

  it("returns bear when every short EMA sits below every long EMA", () => {
    // Strong monotonic downtrend.
    const closes = Array.from({ length: 200 }, (_, i) => 1000 - i);
    const candles = mkCandles(closes);
    const out = computeGuppy(candles);
    expect(guppyTrendStateAt(out, candles.length - 1)).toBe("bear");
  });

  it("returns neutral when ribbons interleave around a flat regime", () => {
    // Flat price — every EMA converges to the same value, so the min/max
    // bounds touch and the strict-separation criterion fails.
    const closes = Array.from({ length: 200 }, () => 100);
    const candles = mkCandles(closes);
    const out = computeGuppy(candles);
    expect(guppyTrendStateAt(out, candles.length - 1)).toBe("neutral");
  });
});

describe("guppyTrendStateLatest", () => {
  it("returns neutral for empty candles", () => {
    const out = computeGuppy([]);
    expect(guppyTrendStateLatest(out, 0)).toBe("neutral");
  });

  it("reads the state at the final candle index", () => {
    const closes = Array.from({ length: 200 }, (_, i) => 100 + i);
    const candles = mkCandles(closes);
    const out = computeGuppy(candles);
    expect(guppyTrendStateLatest(out, candles.length)).toBe(
      guppyTrendStateAt(out, candles.length - 1)
    );
  });
});
