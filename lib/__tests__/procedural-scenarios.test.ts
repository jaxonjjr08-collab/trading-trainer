// v4.1.5 — Coverage for lib/procedural-scenarios. Procedurally generated
// scenarios are user-facing in Practice (the "Generate" button), so a recipe
// that silently produces an invalid Scenario shape would surface as a runtime
// crash. Pin the shape + determinism here.

import { describe, it, expect } from "vitest";
import {
  generateProceduralScenario,
  PROCEDURAL_SETUP_TYPES,
} from "../procedural-scenarios";

describe("generateProceduralScenario", () => {
  it("exposes the full recipe roster (v4.1.6 completed the backfill)", () => {
    expect(new Set(PROCEDURAL_SETUP_TYPES)).toEqual(
      new Set([
        "trend_continuation",
        "failed_breakout",
        "range_chop",
        "support_breakdown",
        "overextended",
        "liquidity_sweep",
        "clean_retest",
        "leverage_trap",
        "news_volatility",
        "no_setup",
      ])
    );
  });

  for (const setupType of [
    "trend_continuation",
    "failed_breakout",
    "range_chop",
    "support_breakdown",
    "overextended",
    "liquidity_sweep",
    "clean_retest",
    "leverage_trap",
    "news_volatility",
    "no_setup",
  ] as const) {
    it(`produces a valid Scenario for setupType=${setupType}`, () => {
      const s = generateProceduralScenario({ setupType, seed: 42 });
      expect(s.setupType).toBe(setupType);
      expect(s.dataSource).toBe("procedural");
      expect(s.visibleCandles.length).toBeGreaterThan(0);
      expect(s.hiddenCandles.length).toBeGreaterThan(0);
      // All candles must have a non-negative time and a closed body.
      for (const c of [...s.visibleCandles, ...s.hiddenCandles]) {
        expect(c.time).toBeGreaterThanOrEqual(0);
        expect(c.high).toBeGreaterThanOrEqual(c.low);
        expect(c.high).toBeGreaterThanOrEqual(c.open);
        expect(c.high).toBeGreaterThanOrEqual(c.close);
        expect(c.low).toBeLessThanOrEqual(c.open);
        expect(c.low).toBeLessThanOrEqual(c.close);
        expect(c.volume).toBeGreaterThan(0);
      }
      // Context must be consistent — scoring reads bestDirection.
      expect(["long", "short", "wait"]).toContain(s.context.bestDirection);
      expect(["up", "down", "range"]).toContain(s.context.trend);
      // Ideal plan must be present for the scoring engine's review surfaces.
      expect(s.idealDecisionPlan).toBeDefined();
    });
  }

  it("is deterministic per (setupType, seed)", () => {
    const a = generateProceduralScenario({ setupType: "trend_continuation", seed: 7 });
    const b = generateProceduralScenario({ setupType: "trend_continuation", seed: 7 });
    expect(a.visibleCandles).toEqual(b.visibleCandles);
    expect(a.hiddenCandles).toEqual(b.hiddenCandles);
    expect(a.context.bestDirection).toBe(b.context.bestDirection);
  });

  it("falls back to a random recipe when setupType is omitted", () => {
    const s = generateProceduralScenario({ seed: 100 });
    expect(PROCEDURAL_SETUP_TYPES).toContain(s.setupType);
    expect(s.dataSource).toBe("procedural");
  });

  it("falls back to a random recipe when given an unknown setupType", () => {
    // Cast: callers may pass any SetupType, including ones not registered
    // (e.g. if a future SetupType is added to types.ts without a recipe).
    // The implementation falls back to a random known recipe instead of
    // throwing.
    const s = generateProceduralScenario({
      setupType: "___unregistered___" as never,
      seed: 1,
    });
    expect(PROCEDURAL_SETUP_TYPES).toContain(s.setupType);
  });

  it("returns scenarios marked dataSource=procedural so the badge renders", () => {
    const s = generateProceduralScenario({ seed: 1 });
    expect(s.dataSource).toBe("procedural");
  });
});
