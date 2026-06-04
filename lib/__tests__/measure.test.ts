// v5.2.1 — Pins the measure tool's pure math + formatting. The overlay
// shows the user numeric facts about a chart range; silent drift in any of
// these (e.g. percent computed off the wrong endpoint, time delta showing
// the wrong unit) would be an immediate visible bug.

import { describe, it, expect } from "vitest";
import {
  computeMeasure,
  countCandlesBetween,
  formatTimeDelta,
} from "../measure";
import type { Candle } from "../types";

function mk(times: number[]): Candle[] {
  return times.map((t) => ({
    time: t,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 100,
  }));
}

describe("formatTimeDelta", () => {
  it("renders seconds for sub-minute deltas", () => {
    expect(formatTimeDelta(30)).toBe("30s");
  });

  it("rounds days down and shows trailing hours when present", () => {
    expect(formatTimeDelta(86400 * 3 + 3600 * 4)).toBe("3d 4h");
  });

  it("omits trailing units when zero", () => {
    expect(formatTimeDelta(86400 * 3)).toBe("3d");
    expect(formatTimeDelta(3600 * 2)).toBe("2h");
    expect(formatTimeDelta(60 * 5)).toBe("5m");
  });

  it("handles zero and negative inputs gracefully", () => {
    expect(formatTimeDelta(0)).toBe("0s");
    expect(formatTimeDelta(-100)).toBe("0s");
  });

  it("composes hours + minutes for mid-day deltas", () => {
    expect(formatTimeDelta(3600 * 2 + 60 * 30)).toBe("2h 30m");
  });
});

describe("countCandlesBetween", () => {
  it("counts inclusive endpoints", () => {
    const candles = mk([100, 200, 300, 400, 500]);
    expect(countCandlesBetween(candles, 100, 300)).toBe(3);
    expect(countCandlesBetween(candles, 200, 500)).toBe(4);
  });

  it("returns 0 when the range falls entirely outside the candle list", () => {
    const candles = mk([100, 200, 300]);
    expect(countCandlesBetween(candles, 1000, 2000)).toBe(0);
    expect(countCandlesBetween(candles, -100, -1)).toBe(0);
  });

  it("clamps a one-sided range", () => {
    const candles = mk([100, 200, 300]);
    expect(countCandlesBetween(candles, 0, 200)).toBe(2);
    expect(countCandlesBetween(candles, 200, 9999)).toBe(2);
  });

  it("returns 0 on empty input", () => {
    expect(countCandlesBetween([], 0, 100)).toBe(0);
  });
});

describe("computeMeasure", () => {
  const candles = mk([1000, 2000, 3000, 4000, 5000]);

  it("normalises so A is the earlier point", () => {
    const forward = computeMeasure(
      { time: 1000, price: 100 },
      { time: 4000, price: 110 },
      candles
    );
    const backward = computeMeasure(
      { time: 4000, price: 110 },
      { time: 1000, price: 100 },
      candles
    );
    // The price delta SHOULD be the same magnitude regardless of click
    // order: forward (early → late) is +10; reversing the points still
    // measures the same span and reports the same +10 delta because the
    // module sorts by time before computing.
    expect(forward.priceDelta).toBe(10);
    expect(backward.priceDelta).toBe(10);
    expect(forward.timeDeltaSec).toBe(backward.timeDeltaSec);
  });

  it("computes percent against the earlier point's price", () => {
    const out = computeMeasure(
      { time: 1000, price: 100 },
      { time: 2000, price: 110 },
      candles
    );
    expect(out.pricePct).toBeCloseTo(10, 5);
  });

  it("returns negative percent when price falls", () => {
    const out = computeMeasure(
      { time: 1000, price: 100 },
      { time: 2000, price: 90 },
      candles
    );
    expect(out.pricePct).toBeCloseTo(-10, 5);
    expect(out.direction).toBe("bear");
  });

  it("classifies direction as flat on zero price change", () => {
    const out = computeMeasure(
      { time: 1000, price: 100 },
      { time: 4000, price: 100 },
      candles
    );
    expect(out.direction).toBe("flat");
    expect(out.impliedR).toBeNull();
  });

  it("reports candle count between the two points", () => {
    const out = computeMeasure(
      { time: 1000, price: 100 },
      { time: 4000, price: 100 },
      candles
    );
    expect(out.candleCount).toBe(4); // 1000, 2000, 3000, 4000
  });

  it("returns a formatted time label", () => {
    const out = computeMeasure(
      { time: 0, price: 100 },
      { time: 86400 + 3600, price: 100 },
      mk([0, 86400 + 3600])
    );
    expect(out.timeLabel).toBe("1d 1h");
  });

  it("impliedR mirrors the percent move (1% = 1R)", () => {
    const out = computeMeasure(
      { time: 0, price: 100 },
      { time: 1000, price: 105 },
      mk([0, 1000])
    );
    expect(out.impliedR).toBeCloseTo(5, 5);
  });
});
