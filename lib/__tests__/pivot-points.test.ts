// v5.2.0 — Pins the floor-trader pivot math and the default-window heuristic.
// The pivot levels appear directly on the chart as price labels, so a
// silent drift in the formulas would surface as wrong horizontal lines
// shown to users — these tests are the guard.

import { describe, it, expect } from "vitest";
import { defaultPivotWindow, pivotLevels } from "../pivot-points";
import type { Candle } from "../types";

function mkCandles(rows: Array<{ h: number; l: number; c: number }>): Candle[] {
  return rows.map((r, i) => ({
    time: 1000 + i * 60,
    open: r.c, // open doesn't affect pivots
    high: r.h,
    low: r.l,
    close: r.c,
    volume: 100,
  }));
}

describe("pivotLevels", () => {
  it("returns null on empty input", () => {
    expect(pivotLevels([], 10)).toBeNull();
  });

  it("returns null when windowSize is zero or negative", () => {
    expect(pivotLevels(mkCandles([{ h: 100, l: 90, c: 95 }]), 0)).toBeNull();
    expect(pivotLevels(mkCandles([{ h: 100, l: 90, c: 95 }]), -1)).toBeNull();
  });

  it("computes pivot = (H + L + C) / 3 of the window", () => {
    const candles = mkCandles([
      { h: 110, l: 90, c: 100 },
      { h: 105, l: 95, c: 102 },
      { h: 108, l: 92, c: 99 },
    ]);
    const out = pivotLevels(candles, 3)!;
    // High of window = 110, Low = 90, Close of last in window = 99
    // Pivot = (110 + 90 + 99) / 3 = 99.666...
    expect(out.pivot).toBeCloseTo(99.6667, 3);
  });

  it("computes R1 and S1 from the standard floor-trader formula", () => {
    const candles = mkCandles([
      { h: 100, l: 80, c: 90 },
    ]);
    const out = pivotLevels(candles, 1)!;
    // P = (100 + 80 + 90) / 3 = 90
    // R1 = 2P - L = 180 - 80 = 100
    // S1 = 2P - H = 180 - 100 = 80
    expect(out.pivot).toBe(90);
    expect(out.r1).toBe(100);
    expect(out.s1).toBe(80);
  });

  it("R2 = P + (H - L); S2 = P - (H - L)", () => {
    const candles = mkCandles([{ h: 100, l: 80, c: 90 }]);
    const out = pivotLevels(candles, 1)!;
    // H - L = 20
    expect(out.r2).toBe(110);
    expect(out.s2).toBe(70);
  });

  it("respects the windowSize cap when shorter than the candle array", () => {
    const candles = mkCandles([
      { h: 100, l: 80, c: 90 },
      { h: 200, l: 100, c: 150 }, // big bar that should NOT influence pivots
    ]);
    const out = pivotLevels(candles, 1)!;
    expect(out.pivot).toBe(90);
    expect(out.r1).toBe(100);
  });

  it("preserves R1 > P > S1 ordering on reasonable inputs", () => {
    const candles = mkCandles([
      { h: 120, l: 100, c: 110 },
      { h: 122, l: 108, c: 115 },
      { h: 118, l: 105, c: 112 },
    ]);
    const out = pivotLevels(candles, 3)!;
    expect(out.r2).toBeGreaterThan(out.r1);
    expect(out.r1).toBeGreaterThan(out.pivot);
    expect(out.pivot).toBeGreaterThan(out.s1);
    expect(out.s1).toBeGreaterThan(out.s2);
  });
});

describe("defaultPivotWindow", () => {
  it("uses 25% of candle count by default", () => {
    expect(defaultPivotWindow(100)).toBe(25);
    expect(defaultPivotWindow(40)).toBe(10);
  });

  it("clamps to a minimum of 5", () => {
    expect(defaultPivotWindow(10)).toBe(5);
    expect(defaultPivotWindow(4)).toBe(5);
    expect(defaultPivotWindow(0)).toBe(5);
  });

  it("clamps to a maximum of 30", () => {
    expect(defaultPivotWindow(200)).toBe(30);
    expect(defaultPivotWindow(1000)).toBe(30);
  });
});
