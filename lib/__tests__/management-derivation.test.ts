// v5.12.0 — pins the trade-management derivation: favorable trades produce
// in-window, ascending points with the right actions; losing/flat trades
// produce none; authored points are preserved.

import { describe, it, expect } from "vitest";
import {
  deriveManagementPoints,
  withDerivedManagement,
} from "../management-derivation";
import type { Candle, Scenario, IdealDecisionPlan } from "../types";

function mkCandle(close: number, high = close, low = close): Candle {
  return { time: 0, open: close, high, low, close, volume: 1 };
}

// Build a minimal scenario: `visible` count + `hidden` candles + an ideal plan.
function mkScenario(
  hidden: Candle[],
  plan: IdealDecisionPlan,
  visibleLen = 50,
  managementPoints?: Scenario["managementPoints"]
): Scenario {
  const visible = Array.from({ length: visibleLen }, () => mkCandle(plan.entry ?? 100));
  return {
    id: "test",
    title: "t",
    symbol: "BTC/USD",
    timeframe: "6h",
    difficulty: "medium",
    setupType: "trend_continuation",
    marketContext: "",
    neutralScenarioNotes: "",
    learningFocus: "",
    visibleCandles: visible,
    hiddenCandles: hidden,
    decisionPointIndex: visibleLen - 1,
    keyLevels: [],
    preferredDecision: plan.direction,
    outcome: { description: "", takeaway: "" },
    lessonRecommendation: "complete_plan",
    context: {
      trend: "up",
      support: [],
      resistance: [],
      currentPrice: plan.entry ?? 100,
      bestDirection: plan.direction,
      notes: "",
    },
    idealDecisionPlan: plan,
    managementPoints,
  };
}

const LONG_PLAN: IdealDecisionPlan = {
  direction: "long",
  entry: 100,
  stopLoss: 90, // R = 10
  takeProfit: 140, // tpDist = 40
  thesis: "t",
};

describe("deriveManagementPoints — favorable long", () => {
  // Price climbs steadily from entry well past +2R toward target.
  const hidden = [
    mkCandle(102, 103, 101),
    mkCandle(108, 111, 105), // +1R high (110)
    mkCandle(116, 121, 112), // +2R high (120)
    mkCandle(128, 132, 124),
    mkCandle(136, 139, 130), // near TP (>= 100 + 0.9*40 = 136)
    mkCandle(134, 138, 131),
  ];
  const scenario = mkScenario(hidden, LONG_PLAN);
  const points = deriveManagementPoints(scenario);

  it("emits up to three points in ascending candle order", () => {
    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].candleIndex).toBeGreaterThan(points[i - 1].candleIndex);
    }
  });

  it("places all points inside the hidden window", () => {
    const visLen = scenario.visibleCandles.length;
    const total = visLen + scenario.hiddenCandles.length;
    for (const p of points) {
      expect(p.candleIndex).toBeGreaterThanOrEqual(visLen);
      expect(p.candleIndex).toBeLessThan(total);
    }
  });

  it("orders the ideal actions protect → bank → exit", () => {
    const actions = points.map((p) => p.idealAction);
    expect(actions[0]).toBe("move_stop_be");
    expect(actions).toContain("exit");
    // partial appears when +2R is reached
    expect(actions).toContain("partial_50");
  });
});

describe("deriveManagementPoints — no management", () => {
  it("returns [] when the trade hits its stop before +1R", () => {
    // Drops straight to the stop.
    const hidden = [
      mkCandle(98, 99, 95),
      mkCandle(92, 96, 89), // low 89 <= stop 90 → lost
      mkCandle(95, 97, 91),
      mkCandle(96, 98, 92),
    ];
    expect(deriveManagementPoints(mkScenario(hidden, LONG_PLAN))).toEqual([]);
  });

  it("returns [] for a wait plan", () => {
    const hidden = [mkCandle(100), mkCandle(101), mkCandle(102), mkCandle(103)];
    const waitPlan: IdealDecisionPlan = { direction: "wait", thesis: "sit out" };
    expect(deriveManagementPoints(mkScenario(hidden, waitPlan))).toEqual([]);
  });

  it("returns [] when there aren't enough hidden candles", () => {
    const hidden = [mkCandle(112, 115, 108)];
    expect(deriveManagementPoints(mkScenario(hidden, LONG_PLAN))).toEqual([]);
  });
});

describe("deriveManagementPoints — favorable short", () => {
  it("triggers on downward favorable excursion", () => {
    const plan: IdealDecisionPlan = {
      direction: "short",
      entry: 100,
      stopLoss: 110, // R = 10
      takeProfit: 60,
      thesis: "t",
    };
    const hidden = [
      mkCandle(98, 101, 96),
      mkCandle(90, 95, 88), // low 88 → +1.2R favorable
      mkCandle(78, 84, 76), // +2.4R
      mkCandle(66, 72, 63), // near TP (entry - 0.9*40 = 64)
      mkCandle(68, 73, 65),
    ];
    const points = deriveManagementPoints(mkScenario(hidden, plan));
    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points[0].idealAction).toBe("move_stop_be");
  });
});

describe("withDerivedManagement", () => {
  it("preserves authored management points untouched", () => {
    const authored = [
      {
        candleIndex: 55,
        prompt: "authored",
        idealAction: "exit" as const,
        rationale: "r",
      },
    ];
    const hidden = [
      mkCandle(108, 111, 105),
      mkCandle(116, 121, 112),
      mkCandle(128, 132, 124),
      mkCandle(136, 139, 130),
    ];
    const s = mkScenario(hidden, LONG_PLAN, 50, authored);
    expect(withDerivedManagement(s).managementPoints).toBe(authored);
  });

  it("attaches derived points when none authored and the trade runs", () => {
    const hidden = [
      mkCandle(108, 111, 105),
      mkCandle(116, 121, 112),
      mkCandle(128, 132, 124),
      mkCandle(136, 139, 130),
    ];
    const s = mkScenario(hidden, LONG_PLAN);
    const out = withDerivedManagement(s);
    expect(out.managementPoints && out.managementPoints.length).toBeGreaterThan(0);
  });
});
