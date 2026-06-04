// v3.3 — Smoke tests for the equity simulation. The point is "would a
// breaking change here silently miscompound old saves" — not exhaustive
// coverage. Three scenarios cover the main branches:
//   1. Empty input returns starting equity, no drawdown.
//   2. A winning trade increases equity; a losing one decreases it.
//   3. Wait attempts contribute zero PnL but still produce a point.

import { describe, it, expect } from "vitest";
import { simulateEquityCurve, DEFAULT_STARTING_EQUITY } from "../equity";
import type { Attempt } from "../types";

function mkAttempt(overrides: Partial<Attempt> & Pick<Attempt, "id" | "createdAt">): Attempt {
  return {
    scenarioId: "test",
    decision: {
      direction: "long",
      accountSize: 1000,
      thesis: "",
      invalidation: "",
    },
    score: { total: 70, max: 100, breakdown: [], tags: [], strengths: [], weaknesses: [] },
    outcome: {
      hit: "tp",
      exitPrice: 0,
      exitCandleIndex: 0,
      pnlPercent: 0,
      liquidated: false,
      estimatedLiquidationPrice: null,
    },
    ...overrides,
  } as Attempt;
}

describe("simulateEquityCurve", () => {
  it("returns starting equity for an empty attempt list", () => {
    const out = simulateEquityCurve([]);
    expect(out.starting).toBe(DEFAULT_STARTING_EQUITY);
    expect(out.current).toBe(DEFAULT_STARTING_EQUITY);
    expect(out.peak).toBe(DEFAULT_STARTING_EQUITY);
    expect(out.tradeCount).toBe(0);
    expect(out.maxDrawdownPct).toBe(0);
    expect(out.points).toHaveLength(0);
  });

  it("compounds wins and losses in chronological order", () => {
    const win = mkAttempt({
      id: "a",
      createdAt: 1,
      outcome: { hit: "tp", exitPrice: 0, exitCandleIndex: 0, pnlPercent: 10, liquidated: false, estimatedLiquidationPrice: null },
    });
    const loss = mkAttempt({
      id: "b",
      createdAt: 2,
      outcome: { hit: "sl", exitPrice: 0, exitCandleIndex: 0, pnlPercent: -5, liquidated: false, estimatedLiquidationPrice: null },
    });
    const out = simulateEquityCurve([loss, win]); // unordered on purpose

    // After +10% then -5%: starting * 1.10 * 0.95 = 10450
    expect(out.current).toBeCloseTo(DEFAULT_STARTING_EQUITY * 1.1 * 0.95, 5);
    expect(out.peak).toBeCloseTo(DEFAULT_STARTING_EQUITY * 1.1, 5);
    expect(out.points.map((p) => p.attemptId)).toEqual(["a", "b"]);
    expect(out.maxDrawdownPct).toBeGreaterThan(0);
  });

  it("treats wait attempts as zero-PnL points", () => {
    const wait = mkAttempt({
      id: "w",
      createdAt: 1,
      decision: { direction: "wait", accountSize: 1000, thesis: "", invalidation: "" },
      outcome: { hit: "neither", exitPrice: 0, exitCandleIndex: 0, pnlPercent: 0, liquidated: false, estimatedLiquidationPrice: null },
    });
    const out = simulateEquityCurve([wait]);
    expect(out.current).toBe(DEFAULT_STARTING_EQUITY);
    expect(out.points).toHaveLength(1);
    expect(out.points[0].pnlPct).toBe(0);
    expect(out.points[0].direction).toBe("wait");
  });
});
