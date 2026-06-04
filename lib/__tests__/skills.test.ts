// v3.3 — Smoke tests for computeSkillScores + weakestSkill. Locked to the
// shape of the scoring engine, so a regression in skill rollups gets caught
// before it makes it into a release.

import { describe, it, expect } from "vitest";
import { computeSkillScores, weakestSkill, strongestSkill } from "../skills";
import type { Attempt } from "../types";

function attemptWithBreakdown(
  id: string,
  breakdown: Array<{ id: string; points: number; max: number }>,
  tags: string[] = []
): Attempt {
  return {
    id,
    createdAt: 1,
    scenarioId: "test",
    decision: { direction: "long", thesis: "", invalidation: "" },
    score: {
      total: 0,
      max: 100,
      breakdown: breakdown.map((b) => ({
        id: b.id as never,
        label: b.id,
        points: b.points,
        max: b.max,
        tags: [] as never[],
      })),
      tags: tags as never[],
      strengths: [],
      weaknesses: [],
    },
    outcome: { hit: "tp", pnlPercent: 0, liquidated: false, estimatedLiquidationPrice: null },
  } as unknown as Attempt;
}

describe("computeSkillScores", () => {
  it("returns hasData=false for every skill when given no attempts", () => {
    const scores = computeSkillScores([]);
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      expect(s.hasData).toBe(false);
      expect(s.attempts).toBe(0);
    }
  });

  it("averages a category's points/max into a 0–100 score", () => {
    const attempt = attemptWithBreakdown("a", [
      { id: "direction", points: 12, max: 15 },
    ]);
    const scores = computeSkillScores([attempt]);
    const directionReading = scores.find((s) => s.id === "direction_reading");
    expect(directionReading?.hasData).toBe(true);
    // 12/15 = 80%
    expect(directionReading?.score).toBe(80);
  });

  it("treats patience as a tag-driven score", () => {
    // One attempt with the positive 'wait_was_best' tag.
    const goodWait = attemptWithBreakdown("good", [], ["wait_was_best"]);
    const scores = computeSkillScores([goodWait]);
    const patience = scores.find((s) => s.id === "patience");
    expect(patience?.hasData).toBe(true);
    // Pure-positive sample lands above the neutral 50.
    expect(patience!.score).toBeGreaterThan(50);
  });
});

describe("weakest/strongest skill", () => {
  it("returns null when there is no data", () => {
    const scores = computeSkillScores([]);
    expect(weakestSkill(scores)).toBeNull();
    expect(strongestSkill(scores)).toBeNull();
  });

  it("identifies extremes correctly", () => {
    const weak = attemptWithBreakdown("a", [
      { id: "direction", points: 1, max: 15 },
      { id: "risk", points: 14, max: 15 },
    ]);
    const scores = computeSkillScores([weak]);
    expect(weakestSkill(scores)?.id).toBe("direction_reading");
    expect(strongestSkill(scores)?.id).toBe("risk_control");
  });
});
