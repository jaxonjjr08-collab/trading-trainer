// v4.0 — Smoke tests for the HTF synthesis. The bar: would a breaking
// change to bucketing silently produce wrong HTF candles on every scenario?

import { describe, it, expect } from "vitest";
import { synthesizeHTF, htfBucketSize, findHTFDecisionIndex } from "../htf";
import type { Candle } from "../types";

function mk(time: number, open: number, high: number, low: number, close: number): Candle {
  return { time, open, high, low, close, volume: 1 };
}

describe("synthesizeHTF", () => {
  it("returns [] on empty input or bucket <= 1", () => {
    expect(synthesizeHTF([], 4)).toEqual([]);
    expect(synthesizeHTF([mk(0, 1, 2, 1, 1.5)], 1)).toEqual([]);
    expect(synthesizeHTF([mk(0, 1, 2, 1, 1.5)], 0)).toEqual([]);
  });

  it("buckets candles correctly: 8 candles, bucket 4 → 2 HTF candles", () => {
    const ltf: Candle[] = [
      mk(0, 100, 110, 99, 105),
      mk(1, 105, 108, 100, 102),
      mk(2, 102, 115, 101, 113),
      mk(3, 113, 116, 112, 115),
      // bucket 2 starts here
      mk(4, 115, 120, 114, 119),
      mk(5, 119, 121, 117, 118),
      mk(6, 118, 119, 110, 112),
      mk(7, 112, 113, 108, 110),
    ];
    const htf = synthesizeHTF(ltf, 4);
    expect(htf).toHaveLength(2);
    // First bucket: open=100 (first.open), close=115 (last.close), high=116, low=99
    expect(htf[0]).toEqual({ time: 0, open: 100, high: 116, low: 99, close: 115, volume: 4 });
    // Second bucket: open=115, close=110, high=121, low=108
    expect(htf[1]).toEqual({ time: 4, open: 115, high: 121, low: 108, close: 110, volume: 4 });
  });

  it("emits a partial trailing bucket", () => {
    const ltf: Candle[] = [
      mk(0, 100, 105, 99, 104),
      mk(1, 104, 110, 103, 109),
      mk(2, 109, 112, 108, 111),
      // partial third bucket: just one candle
      mk(3, 111, 113, 110, 112),
    ];
    const htf = synthesizeHTF(ltf, 3);
    expect(htf).toHaveLength(2);
    expect(htf[1]).toEqual({ time: 3, open: 111, high: 113, low: 110, close: 112, volume: 1 });
  });
});

describe("htfBucketSize", () => {
  it("maps known timeframes to bucket sizes", () => {
    expect(htfBucketSize("15m")).toBe(4);
    expect(htfBucketSize("1h")).toBe(6);
    expect(htfBucketSize("4h")).toBe(6);
    expect(htfBucketSize("6h")).toBe(4);
  });

  it("returns 0 for timeframes with no HTF target", () => {
    expect(htfBucketSize("1d")).toBe(0);
    expect(htfBucketSize("nonsense")).toBe(0);
  });
});

describe("findHTFDecisionIndex", () => {
  it("finds the last HTF candle whose time is <= mainCandleTime", () => {
    const htf: Candle[] = [
      mk(0, 1, 1, 1, 1),
      mk(100, 1, 1, 1, 1),
      mk(200, 1, 1, 1, 1),
      mk(300, 1, 1, 1, 1),
    ];
    expect(findHTFDecisionIndex(htf, 150)).toBe(1); // last <= 150
    expect(findHTFDecisionIndex(htf, 200)).toBe(2);
    expect(findHTFDecisionIndex(htf, 500)).toBe(3);
    expect(findHTFDecisionIndex(htf, -10)).toBe(0); // clamped
  });

  it("returns 0 on empty input", () => {
    expect(findHTFDecisionIndex([], 100)).toBe(0);
  });
});
