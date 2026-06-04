// v4.1.5 — Coverage for lib/curriculum's pure helpers. The Practice and
// CoursePlayer surfaces depend on these for "what's next" / "is this step
// done" — pinning their behaviour prevents subtle regressions when a future
// curriculum edit changes step counts or termIds.

import { describe, it, expect } from "vitest";
import {
  CURRICULUM,
  currentModule,
  isStepComplete,
  moduleForTerm,
  nextStepInModule,
  nextUnreadInModule,
  type AttemptSummary,
  type CurriculumStep,
} from "../curriculum";

describe("currentModule", () => {
  it("returns the first module with any unread term", () => {
    const mod = currentModule([]);
    expect(mod).not.toBeNull();
    expect(mod!.id).toBe(CURRICULUM[0].id);
  });

  it("returns the next module when the first is fully read", () => {
    const firstModTermIds = CURRICULUM[0].termIds;
    const mod = currentModule(firstModTermIds);
    expect(mod).not.toBeNull();
    expect(mod!.id).toBe(CURRICULUM[1].id);
  });

  it("returns null when every term in every module is read", () => {
    const allTermIds = CURRICULUM.flatMap((m) => m.termIds);
    expect(currentModule(allTermIds)).toBeNull();
  });
});

describe("nextUnreadInModule", () => {
  it("returns the first unread term in module order", () => {
    const mod = CURRICULUM[0];
    expect(nextUnreadInModule(mod, [])).toBe(mod.termIds[0]);
  });

  it("skips already-read terms", () => {
    const mod = CURRICULUM[0];
    const firstRead = [mod.termIds[0]];
    expect(nextUnreadInModule(mod, firstRead)).toBe(mod.termIds[1]);
  });

  it("returns null when all terms read", () => {
    const mod = CURRICULUM[0];
    expect(nextUnreadInModule(mod, mod.termIds)).toBeNull();
  });
});

describe("moduleForTerm", () => {
  it("finds the module containing a known term", () => {
    const firstTerm = CURRICULUM[0].termIds[0];
    const mod = moduleForTerm(firstTerm);
    expect(mod).not.toBeNull();
    expect(mod!.id).toBe(CURRICULUM[0].id);
  });

  it("returns null for an unknown term", () => {
    expect(moduleForTerm("___not_a_real_term___")).toBeNull();
  });
});

describe("isStepComplete", () => {
  const fakeStep: CurriculumStep = {
    id: "x-1",
    conceptTermId: "stop_loss",
    practiceScenarioId: "tc-btc-2024-10",
    testScenarioId: "tc-eth-2024-11",
    passingScore: 70,
  };

  it("returns false when no attempts exist", () => {
    expect(isStepComplete(fakeStep, [])).toBe(false);
  });

  it("returns false when only practice attempts exist (wrong scenario)", () => {
    const attempts: AttemptSummary[] = [
      { scenarioId: fakeStep.practiceScenarioId, score: 95 },
    ];
    expect(isStepComplete(fakeStep, attempts)).toBe(false);
  });

  it("returns false when test attempt is below threshold", () => {
    const attempts: AttemptSummary[] = [
      { scenarioId: fakeStep.testScenarioId, score: 65 },
    ];
    expect(isStepComplete(fakeStep, attempts)).toBe(false);
  });

  it("returns true when any test attempt meets the threshold", () => {
    const attempts: AttemptSummary[] = [
      { scenarioId: fakeStep.testScenarioId, score: 50 },
      { scenarioId: fakeStep.testScenarioId, score: 80 },
    ];
    expect(isStepComplete(fakeStep, attempts)).toBe(true);
  });

  it("defaults to passingScore 70 when step omits it", () => {
    const step: CurriculumStep = { ...fakeStep, passingScore: undefined };
    expect(
      isStepComplete(step, [{ scenarioId: step.testScenarioId, score: 69 }])
    ).toBe(false);
    expect(
      isStepComplete(step, [{ scenarioId: step.testScenarioId, score: 70 }])
    ).toBe(true);
  });
});

describe("nextStepInModule", () => {
  // Pick a module that has steps[]. Foundations does in CURRICULUM[0].
  const mod = CURRICULUM.find((m) => m.steps && m.steps.length > 0)!;

  it("returns null when module has no steps", () => {
    const stepless = CURRICULUM.find((m) => !m.steps || m.steps.length === 0)!;
    expect(nextStepInModule(stepless, [])).toBeNull();
  });

  it("returns the first step when none are complete", () => {
    const next = nextStepInModule(mod, []);
    expect(next).not.toBeNull();
    expect(next!.id).toBe(mod.steps![0].id);
  });

  it("skips completed steps", () => {
    const firstTestId = mod.steps![0].testScenarioId;
    const attempts: AttemptSummary[] = [{ scenarioId: firstTestId, score: 100 }];
    const next = nextStepInModule(mod, attempts);
    if (mod.steps!.length > 1) {
      expect(next!.id).toBe(mod.steps![1].id);
    } else {
      expect(next).toBeNull();
    }
  });

  it("returns null when every step is complete", () => {
    const attempts: AttemptSummary[] = mod.steps!.map((s) => ({
      scenarioId: s.testScenarioId,
      score: 100,
    }));
    expect(nextStepInModule(mod, attempts)).toBeNull();
  });
});
