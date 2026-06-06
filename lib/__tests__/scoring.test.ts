// v3.3 — Smoke tests for scoring primitives. Targets the pieces that future
// versions are most likely to break by accident:
//   - estimateLiquidationPrice (used by leverage/risk surfaces everywhere)
//   - scoreDecision against a minimal scenario, checking the score lands in
//     range and the breakdown sums correctly.

import { describe, it, expect } from "vitest";
import { estimateLiquidationPrice, scoreDecision } from "../scoring";
import { SCENARIOS } from "../scenarios";
import { DEFAULT_INDICATOR_CONFIG, type Decision, type Scenario } from "../types";

// v4.0.3 — builds a scenario derived from SCENARIOS[0] with the chart_tools
// category opted in via availableIndicators. Keeps the test self-contained
// without authoring a full fixture from scratch.
function scenarioWithIndicators(
  indicators: ("ema" | "rsi" | "macd" | "bb" | "vwap")[]
): Scenario {
  return { ...SCENARIOS[0], availableIndicators: indicators };
}

function tradeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    direction: "long",
    entry: SCENARIOS[0].context.currentPrice,
    stopLoss: SCENARIOS[0].context.currentPrice * 0.98,
    takeProfit: SCENARIOS[0].context.currentPrice * 1.05,
    leverage: 3,
    riskPercent: 1,
    accountSize: 1000,
    thesis: "Pullback to support inside uptrend, expecting continuation.",
    invalidation: "Close below the recent low invalidates the setup.",
    ...overrides,
  };
}

describe("estimateLiquidationPrice", () => {
  it("returns null for invalid inputs", () => {
    expect(estimateLiquidationPrice("long", 0, 3)).toBeNull();
    expect(estimateLiquidationPrice("long", 100, 0)).toBeNull();
    expect(estimateLiquidationPrice("long", NaN, 3)).toBeNull();
  });

  it("longs liquidate below entry, shorts above", () => {
    const long = estimateLiquidationPrice("long", 60000, 10);
    const short = estimateLiquidationPrice("short", 60000, 10);
    expect(long).toBeLessThan(60000);
    expect(short).toBeGreaterThan(60000);
  });

  it("higher leverage tightens the liquidation buffer", () => {
    const a = estimateLiquidationPrice("long", 60000, 5)!;
    const b = estimateLiquidationPrice("long", 60000, 50)!;
    const aBuffer = 60000 - a;
    const bBuffer = 60000 - b;
    expect(bBuffer).toBeLessThan(aBuffer);
  });
});

describe("scoreDecision", () => {
  it("produces a valid Score for a wait decision on any scenario", () => {
    const scenario = SCENARIOS[0];
    const score = scoreDecision(scenario, {
      direction: "wait",
      accountSize: 1000,
      thesis: "Test thesis longer than ten chars.",
      invalidation: "Test invalidation longer than ten chars.",
    });
    expect(score.max).toBeGreaterThan(0);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(score.max);
    // Breakdown points sum to total.
    const sum = score.breakdown.reduce((s, b) => s + b.points, 0);
    expect(sum).toBe(score.total);
  });

  it("breakdown.max sums to score.max", () => {
    const scenario = SCENARIOS[0];
    const score = scoreDecision(scenario, {
      direction: "long",
      entry: scenario.context.currentPrice,
      stopLoss: scenario.context.currentPrice * 0.98,
      takeProfit: scenario.context.currentPrice * 1.05,
      leverage: 3,
      riskPercent: 1,
      accountSize: 1000,
      thesis: "Pullback to support inside uptrend, expecting continuation.",
      invalidation: "Close below the recent low invalidates the setup.",
    });
    const sumMax = score.breakdown.reduce((s, b) => s + b.max, 0);
    expect(sumMax).toBe(score.max);
  });
});

// v5.9.7 — lock in the stricter thesis + invalidation grading so a future
// refactor can't quietly make it lenient again.
describe("scoreDecision: stricter thesis grading (v5.9.7)", () => {
  function thesisPoints(d: Partial<Decision>): number {
    const score = scoreDecision(SCENARIOS[0], tradeDecision(d));
    return score.breakdown.find((b) => b.id === "thesis")!.points;
  }
  function invalidationPoints(d: Partial<Decision>): number {
    const score = scoreDecision(SCENARIOS[0], tradeDecision(d));
    return score.breakdown.find((b) => b.id === "invalidation")!.points;
  }

  it("scores a pure hunch low and flags no_thesis", () => {
    const score = scoreDecision(
      SCENARIOS[0],
      tradeDecision({ thesis: "I feel like this one pumps soon, looks good to me." })
    );
    const thesis = score.breakdown.find((b) => b.id === "thesis")!;
    expect(thesis.points).toBeLessThanOrEqual(2);
    expect(thesis.tags).toContain("no_thesis");
  });

  it("does not give full marks for structure without a specific price", () => {
    // Structure words but no number — strong on shape, missing the level.
    expect(
      thesisPoints({ thesis: "Pullback into support inside the uptrend, continuation expected." })
    ).toBeLessThan(10);
  });

  it("awards full marks only for structure + level + direction", () => {
    expect(
      thesisPoints({
        thesis:
          "Long the pullback to support at $58,500 inside the uptrend; higher lows holding.",
      })
    ).toBe(10);
  });

  it("requires both a hook and a price for full invalidation marks", () => {
    expect(invalidationPoints({ invalidation: "It would look weak and I'd get nervous here." })).toBeLessThanOrEqual(1);
    expect(invalidationPoints({ invalidation: "Close below the swing low at $58,500." })).toBe(5);
  });
});

describe("scoreDecision: chart_tools category (v4.0.3)", () => {
  it("is absent when scenario has no availableIndicators", () => {
    const score = scoreDecision(SCENARIOS[0], tradeDecision());
    expect(score.breakdown.find((b) => b.id === "chart_tools")).toBeUndefined();
  });

  it("is absent when direction is wait", () => {
    const scenario = scenarioWithIndicators(["rsi"]);
    const score = scoreDecision(scenario, tradeDecision({ direction: "wait" }));
    expect(score.breakdown.find((b) => b.id === "chart_tools")).toBeUndefined();
  });

  it("awards 5/5 when thesis references an available indicator", () => {
    const scenario = scenarioWithIndicators(["rsi"]);
    const decision = tradeDecision({
      thesis: "Pullback to support with RSI showing oversold — long entry.",
    });
    const score = scoreDecision(scenario, decision);
    const cat = score.breakdown.find((b) => b.id === "chart_tools");
    expect(cat).toBeDefined();
    expect(cat!.points).toBe(5);
    expect(cat!.positive).toBe(true);
    expect(score.tags.includes("ignored_indicator")).toBe(false);
  });

  it("awards 2/5 when indicator toggled on but not referenced", () => {
    const scenario = scenarioWithIndicators(["macd"]);
    const decision = tradeDecision({
      thesis: "Pullback to support inside uptrend, expecting continuation.",
    });
    const indicators = { ...DEFAULT_INDICATOR_CONFIG, macd: true };
    const score = scoreDecision(scenario, decision, undefined, indicators);
    const cat = score.breakdown.find((b) => b.id === "chart_tools");
    expect(cat).toBeDefined();
    expect(cat!.points).toBe(2);
    expect(cat!.positive).toBe(false);
    expect(score.tags.includes("ignored_indicator")).toBe(false);
  });

  it("awards 0/5 and tags ignored_indicator when neither toggled nor referenced", () => {
    const scenario = scenarioWithIndicators(["vwap"]);
    const decision = tradeDecision({
      thesis: "Pullback to support inside uptrend, expecting continuation.",
    });
    const score = scoreDecision(scenario, decision, undefined, DEFAULT_INDICATOR_CONFIG);
    const cat = score.breakdown.find((b) => b.id === "chart_tools");
    expect(cat).toBeDefined();
    expect(cat!.points).toBe(0);
    expect(cat!.tags).toContain("ignored_indicator");
    expect(score.tags).toContain("ignored_indicator");
  });

  it("references on any of multiple available indicators is enough", () => {
    const scenario = scenarioWithIndicators(["ema", "rsi", "macd"]);
    const decision = tradeDecision({
      thesis: "Price reclaimed the 50ma after a pullback, expecting trend continuation.",
    });
    const score = scoreDecision(scenario, decision);
    const cat = score.breakdown.find((b) => b.id === "chart_tools");
    expect(cat!.points).toBe(5);
  });

  it("breakdown.max still sums to score.max with chart_tools attached", () => {
    const scenario = scenarioWithIndicators(["rsi"]);
    const decision = tradeDecision({
      thesis: "Pullback with RSI oversold, expecting bounce.",
    });
    const score = scoreDecision(scenario, decision);
    const sumMax = score.breakdown.reduce((s, b) => s + b.max, 0);
    expect(sumMax).toBe(score.max);
  });

  it("text reference beats toggle when both present (5/5, not 2/5)", () => {
    const scenario = scenarioWithIndicators(["ema"]);
    const decision = tradeDecision({
      thesis: "EMA cross confirms uptrend, pullback to support entry.",
    });
    const indicators = { ...DEFAULT_INDICATOR_CONFIG, ema: true };
    const score = scoreDecision(scenario, decision, undefined, indicators);
    const cat = score.breakdown.find((b) => b.id === "chart_tools");
    expect(cat!.points).toBe(5);
  });
});
