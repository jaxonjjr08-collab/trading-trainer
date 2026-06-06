// v5.10.0 — pins the guided scenario-path helpers: stage composition, the
// 70% clear threshold, and next-in-order selection.

import { describe, it, expect } from "vitest";
import { SCENARIOS } from "../scenarios";
import {
  SCENARIO_STAGES,
  SCENARIO_PATH_ORDER,
  SCENARIO_PASS_PERCENT,
  clearedScenarioIds,
  nextUnclearedScenarioId,
  scenarioPathProgress,
  scenarioNodeStatus,
} from "../scenario-path";
import type { Attempt } from "../types";

// Minimal attempt factory — only the fields the path helpers read.
function mkAttempt(scenarioId: string, percent: number): Attempt {
  return {
    id: `${scenarioId}-${percent}-${Math.random()}`,
    createdAt: Date.now(),
    scenarioId,
    decision: { direction: "wait", accountSize: 1000, thesis: "", invalidation: "" },
    score: { total: percent, max: 100, breakdown: [], tags: [], strengths: [], weaknesses: [] },
    outcome: {
      hit: "neither",
      exitPrice: 0,
      exitCandleIndex: 0,
      pnlPercent: 0,
      liquidated: false,
      estimatedLiquidationPrice: null,
    },
  };
}

describe("scenario-path stages", () => {
  it("has three stages ordered easy → medium → hard", () => {
    expect(SCENARIO_STAGES.map((s) => s.id)).toEqual([
      "foundations",
      "building",
      "mastery",
    ]);
    expect(SCENARIO_STAGES.map((s) => s.difficulty)).toEqual([
      "easy",
      "medium",
      "hard",
    ]);
  });

  it("covers every non-procedural scenario exactly once", () => {
    const real = SCENARIOS.filter((s) => s.dataSource !== "procedural").map(
      (s) => s.id
    );
    expect(SCENARIO_PATH_ORDER.slice().sort()).toEqual(real.slice().sort());
    // No duplicates.
    expect(new Set(SCENARIO_PATH_ORDER).size).toBe(SCENARIO_PATH_ORDER.length);
  });
});

describe("clearedScenarioIds", () => {
  it("counts an attempt as cleared only at or above the pass threshold", () => {
    const id = SCENARIO_PATH_ORDER[0];
    expect(
      clearedScenarioIds([mkAttempt(id, SCENARIO_PASS_PERCENT - 1)]).has(id)
    ).toBe(false);
    expect(
      clearedScenarioIds([mkAttempt(id, SCENARIO_PASS_PERCENT)]).has(id)
    ).toBe(true);
  });

  it("a single passing attempt clears it even after a later failing one", () => {
    const id = SCENARIO_PATH_ORDER[0];
    const cleared = clearedScenarioIds([
      mkAttempt(id, 85),
      mkAttempt(id, 40),
    ]);
    expect(cleared.has(id)).toBe(true);
  });
});

describe("nextUnclearedScenarioId", () => {
  it("returns the first path scenario for a brand-new user", () => {
    expect(nextUnclearedScenarioId([])).toBe(SCENARIO_PATH_ORDER[0]);
  });

  it("skips cleared scenarios in path order", () => {
    const attempts = [
      mkAttempt(SCENARIO_PATH_ORDER[0], 90),
      mkAttempt(SCENARIO_PATH_ORDER[1], 90),
    ];
    expect(nextUnclearedScenarioId(attempts)).toBe(SCENARIO_PATH_ORDER[2]);
  });

  it("returns null once everything is cleared", () => {
    const attempts = SCENARIO_PATH_ORDER.map((id) => mkAttempt(id, 100));
    expect(nextUnclearedScenarioId(attempts)).toBeNull();
  });
});

describe("scenarioPathProgress", () => {
  it("sums cleared across stages and matches the total", () => {
    const prog = scenarioPathProgress([
      mkAttempt(SCENARIO_PATH_ORDER[0], 90),
    ]);
    expect(prog.cleared).toBe(1);
    expect(prog.total).toBe(SCENARIO_PATH_ORDER.length);
    expect(prog.stages.reduce((n, s) => n + s.total, 0)).toBe(prog.total);
  });
});

describe("scenarioNodeStatus", () => {
  it("labels cleared / current / attempted / todo correctly", () => {
    const [a, b, c] = SCENARIO_PATH_ORDER;
    const attempts = [mkAttempt(a, 90), mkAttempt(b, 30)];
    const target = nextUnclearedScenarioId(attempts); // first uncleared = b
    expect(scenarioNodeStatus(a, attempts, target)).toBe("cleared");
    expect(scenarioNodeStatus(b, attempts, target)).toBe("current");
    expect(scenarioNodeStatus(c, attempts, target)).toBe("todo");
  });
});
