// v5.2.2 — Pins the candle-pattern detection thresholds. The trainer's
// patterns toggle uses these classifiers to flag setups for the learner;
// silent drift in any threshold would either flood the chart with false
// positives (training the user to see patterns that aren't there) or
// silently miss clean examples.

import { describe, it, expect } from "vitest";
import { detectPatterns, patternLabel, patternMeaning } from "../candle-patterns";
import type { Candle } from "../types";

function mk(parts: Array<{ o: number; h: number; l: number; c: number }>): Candle[] {
  return parts.map((p, i) => ({
    time: 1000 + i * 60,
    open: p.o,
    high: p.h,
    low: p.l,
    close: p.c,
    volume: 100,
  }));
}

describe("doji", () => {
  it("flags a near-equal open/close with non-trivial range", () => {
    const candles = mk([{ o: 100, h: 105, l: 95, c: 100.1 }]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "doji")).toBe(true);
  });

  it("does not flag a big-body bar", () => {
    const candles = mk([{ o: 100, h: 110, l: 99, c: 109 }]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "doji")).toBe(false);
  });

  it("doji direction is neutral", () => {
    const candles = mk([{ o: 100, h: 105, l: 95, c: 100 }]);
    const out = detectPatterns(candles);
    const doji = out.find((p) => p.kind === "doji");
    expect(doji?.direction).toBe("neutral");
  });
});

describe("hammer", () => {
  it("flags a small body at top with long lower wick", () => {
    // body ~1, lower wick ~10, upper wick ~0
    const candles = mk([{ o: 100, h: 101, l: 91, c: 100.5 }]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "hammer")).toBe(true);
  });

  it("does not flag a long upper wick (that's a Shooting Star)", () => {
    const candles = mk([{ o: 100, h: 110, l: 99, c: 100.5 }]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "hammer")).toBe(false);
  });

  it("hammer direction is bull regardless of body color", () => {
    const candles = mk([{ o: 100.5, h: 101, l: 91, c: 100 }]);
    const out = detectPatterns(candles);
    const hammer = out.find((p) => p.kind === "hammer");
    expect(hammer?.direction).toBe("bull");
  });
});

describe("shooting star", () => {
  it("flags a small body at bottom with long upper wick", () => {
    const candles = mk([{ o: 100, h: 110, l: 99.5, c: 100.5 }]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "shooting_star")).toBe(true);
  });
});

describe("engulfing", () => {
  it("flags bullish engulfing — red bar followed by green that envelops", () => {
    const candles = mk([
      { o: 102, h: 102.5, l: 100.5, c: 101 },
      { o: 100.5, h: 105, l: 100, c: 103 },
    ]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "bullish_engulfing")).toBe(true);
  });

  it("flags bearish engulfing — green bar followed by red that envelops", () => {
    const candles = mk([
      { o: 100, h: 101.5, l: 99.5, c: 101 },
      { o: 102, h: 102.5, l: 99, c: 99.5 },
    ]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "bearish_engulfing")).toBe(true);
  });

  it("does not flag when bodies don't fully envelop", () => {
    const candles = mk([
      { o: 102, h: 102.5, l: 100, c: 100.5 },
      { o: 101, h: 103, l: 100.5, c: 102 }, // doesn't envelop the prev body
    ]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "bullish_engulfing")).toBe(false);
  });
});

describe("inside bar", () => {
  it("flags a bar whose high and low sit inside the prior bar", () => {
    const candles = mk([
      { o: 100, h: 105, l: 95, c: 102 },
      { o: 101, h: 103, l: 99, c: 102 }, // h=103<105, l=99>95
    ]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "inside_bar")).toBe(true);
  });

  it("does not flag when only one side is inside", () => {
    const candles = mk([
      { o: 100, h: 105, l: 95, c: 102 },
      { o: 101, h: 107, l: 99, c: 102 }, // high exceeds prev
    ]);
    const out = detectPatterns(candles);
    expect(out.some((p) => p.kind === "inside_bar")).toBe(false);
  });
});

describe("patternLabel / patternMeaning", () => {
  it("provides a label and a non-empty meaning for every kind", () => {
    const kinds = [
      "doji",
      "hammer",
      "shooting_star",
      "bullish_engulfing",
      "bearish_engulfing",
      "inside_bar",
    ] as const;
    for (const k of kinds) {
      expect(patternLabel(k).length).toBeGreaterThan(0);
      expect(patternMeaning(k).length).toBeGreaterThan(20);
    }
  });
});

describe("detectPatterns sanity", () => {
  it("returns ascending candle indices", () => {
    const candles = mk([
      { o: 100, h: 105, l: 95, c: 100.1 }, // doji
      { o: 100, h: 101, l: 91, c: 100.5 }, // hammer
      { o: 100, h: 110, l: 99.5, c: 100.5 }, // shooting star
    ]);
    const out = detectPatterns(candles);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].candleIndex).toBeGreaterThanOrEqual(out[i - 1].candleIndex);
    }
  });

  it("returns empty array for empty input", () => {
    expect(detectPatterns([])).toEqual([]);
  });
});
