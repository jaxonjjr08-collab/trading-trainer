// v5.10.0 — Guided scenario path. Orders the hand-authored real scenarios into
// three stages (Foundations → Building → Mastery, by difficulty) so a beginner
// has a clear easy→hard ladder to work through instead of a random pile. Pure,
// storage-free, and testable — the component reads attempts and asks these
// helpers what's cleared and what's next.

import { SCENARIOS, ALL_SETUP_TYPES } from "./scenarios";
import type { Attempt, Difficulty, Scenario, SetupType } from "./types";

// A scenario counts as "cleared" once any attempt on it scores at or above this
// percent. Matches the curriculum's DEFAULT_PASSING_SCORE so "passing" means
// the same thing across the app.
export const SCENARIO_PASS_PERCENT = 70;

export type ScenarioStageId = "foundations" | "building" | "mastery";

export type ScenarioStage = {
  id: ScenarioStageId;
  title: string;
  blurb: string;
  difficulty: Difficulty;
  scenarioIds: string[];
};

// Within a stage, order by setup type (so consecutive scenarios vary the kind
// of read) then by id for determinism.
function orderScenarios(list: Scenario[]): Scenario[] {
  const rank = (s: SetupType) => {
    const i = ALL_SETUP_TYPES.indexOf(s);
    return i === -1 ? 999 : i;
  };
  return [...list].sort((a, b) => {
    const r = rank(a.setupType) - rank(b.setupType);
    if (r !== 0) return r;
    return a.id < b.id ? -1 : 1;
  });
}

function idsForDifficulty(d: Difficulty): string[] {
  return orderScenarios(
    SCENARIOS.filter(
      (s) => s.difficulty === d && s.dataSource !== "procedural"
    )
  ).map((s) => s.id);
}

export const SCENARIO_STAGES: ScenarioStage[] = [
  {
    id: "foundations",
    title: "Foundations",
    blurb:
      "Clean, beginner-friendly setups. Learn to read structure and place a basic plan — direction, stop, target.",
    difficulty: "easy",
    scenarioIds: idsForDifficulty("easy"),
  },
  {
    id: "building",
    title: "Building",
    blurb:
      "Trickier reads — fakeouts, ranges, retests. Your plan has to be sharper and your stops cleaner.",
    difficulty: "medium",
    scenarioIds: idsForDifficulty("medium"),
  },
  {
    id: "mastery",
    title: "Mastery",
    blurb:
      "The traps — leverage, liquidity sweeps, overextensions. The setups where most beginners blow up.",
    difficulty: "hard",
    scenarioIds: idsForDifficulty("hard"),
  },
];

// Path order = every stage's scenarios, concatenated Foundations→Mastery.
export const SCENARIO_PATH_ORDER: string[] = SCENARIO_STAGES.flatMap(
  (s) => s.scenarioIds
);

export function attemptPercent(a: Attempt): number {
  return a.score.max > 0 ? (a.score.total / a.score.max) * 100 : 0;
}

// Ids of every scenario the user has cleared (one passing attempt is enough).
export function clearedScenarioIds(attempts: Attempt[]): Set<string> {
  const out = new Set<string>();
  for (const a of attempts) {
    if (attemptPercent(a) >= SCENARIO_PASS_PERCENT) out.add(a.scenarioId);
  }
  return out;
}

// Ids of scenarios the user has attempted at all (cleared or not).
export function attemptedScenarioIds(attempts: Attempt[]): Set<string> {
  return new Set(attempts.map((a) => a.scenarioId));
}

export type StageProgress = {
  stage: ScenarioStage;
  clearedCount: number;
  total: number;
};

export type ScenarioPathProgress = {
  cleared: number;
  total: number;
  stages: StageProgress[];
};

export function scenarioPathProgress(
  attempts: Attempt[]
): ScenarioPathProgress {
  const cleared = clearedScenarioIds(attempts);
  const stages = SCENARIO_STAGES.map((stage) => ({
    stage,
    clearedCount: stage.scenarioIds.filter((id) => cleared.has(id)).length,
    total: stage.scenarioIds.length,
  }));
  return {
    cleared: stages.reduce((n, s) => n + s.clearedCount, 0),
    total: SCENARIO_PATH_ORDER.length,
    stages,
  };
}

// The next scenario to do, in path order: the first one that isn't cleared yet.
// Once everything is cleared, returns null (the UI shows a "complete" state).
export function nextUnclearedScenarioId(attempts: Attempt[]): string | null {
  const cleared = clearedScenarioIds(attempts);
  for (const id of SCENARIO_PATH_ORDER) {
    if (!cleared.has(id)) return id;
  }
  return null;
}

export type ScenarioNodeStatus = "cleared" | "current" | "attempted" | "todo";

// Per-scenario status for rendering the ladder. "current" is the single
// next-uncleared scenario (the recommended one); "attempted" means tried but
// not yet passed; "todo" is untouched.
export function scenarioNodeStatus(
  scenarioId: string,
  attempts: Attempt[],
  currentTargetId: string | null
): ScenarioNodeStatus {
  const cleared = clearedScenarioIds(attempts);
  if (cleared.has(scenarioId)) return "cleared";
  if (scenarioId === currentTargetId) return "current";
  if (attemptedScenarioIds(attempts).has(scenarioId)) return "attempted";
  return "todo";
}
