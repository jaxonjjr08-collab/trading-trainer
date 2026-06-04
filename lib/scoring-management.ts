// v2.0 — score trade-management decisions made after entry.
//
// Per-decision logic:
//   - If the user picked the scenario author's idealAction: full credit.
//   - If picked one of the acceptableActions: partial credit.
//   - Otherwise: zero credit and a mistake tag derived from the gap between
//     what they did and what they should have done.
//
// We deliberately keep this rule-based and small. The teaching value is in
// *named* mistakes (exited_too_early, failed_to_protect) — granular gradient
// scoring would add noise without insight.

import type {
  ManagementAction,
  ManagementDecision,
  ManagementPoint,
  MistakeTag,
  Scenario,
  ScoreCategoryResult,
} from "./types";

// Max points contributed when a scenario has managementPoints. Sits between
// the entry-quality categories (10 each) and the larger ones (15) so it
// matters without dominating.
const PER_POINT_MAX = 5;

type GradedDecision = {
  point: ManagementPoint;
  decision: ManagementDecision | null;
  points: number;
  max: number;
  tag: MistakeTag | null;
  note: string;
};

// Map (idealAction, actualAction) → which mistake was made.
// Only used when the actual action doesn't match ideal AND isn't acceptable.
function tagForGap(
  ideal: ManagementAction,
  actual: ManagementAction
): MistakeTag {
  // Bailed when the right move was to hold or protect.
  if (
    actual === "exit" &&
    (ideal === "hold" || ideal === "move_stop_be" || ideal === "partial_50")
  ) {
    return "exited_too_early";
  }
  // Held when the right move was to protect the +1R move.
  if (actual === "hold" && ideal === "move_stop_be") {
    return "failed_to_protect";
  }
  // Held when the right move was to bank some or all of the profit.
  if (actual === "hold" && (ideal === "partial_50" || ideal === "exit")) {
    return "let_winner_become_loser";
  }
  // Held when the right move was to exit on a structure break.
  if (actual !== "exit" && ideal === "exit") {
    return "held_through_invalidation";
  }
  // Default — a generic "missed the management point" tag. We reuse
  // failed_to_protect since the granular tag isn't always meaningful.
  return "failed_to_protect";
}

function gradeOne(
  point: ManagementPoint,
  decision: ManagementDecision | null
): GradedDecision {
  if (decision == null) {
    return {
      point,
      decision,
      points: 0,
      max: PER_POINT_MAX,
      tag: "failed_to_protect",
      note: `Skipped the management point at this candle.`,
    };
  }
  if (decision.action === point.idealAction) {
    return {
      point,
      decision,
      points: PER_POINT_MAX,
      max: PER_POINT_MAX,
      tag: null,
      note: point.rationale,
    };
  }
  if (point.acceptableActions?.includes(decision.action)) {
    return {
      point,
      decision,
      points: Math.round(PER_POINT_MAX * 0.6),
      max: PER_POINT_MAX,
      tag: null,
      note: `Defensible. Ideal here was "${point.idealAction}" — ${point.rationale}`,
    };
  }
  return {
    point,
    decision,
    points: 0,
    max: PER_POINT_MAX,
    tag: tagForGap(point.idealAction, decision.action),
    note: `Ideal here was "${point.idealAction}" — ${point.rationale}`,
  };
}

export type ManagementScoreResult = ScoreCategoryResult & {
  graded: GradedDecision[];
};

export function scoreManagement(
  scenario: Scenario,
  decisions: ManagementDecision[] | undefined
): ManagementScoreResult | null {
  if (!scenario.managementPoints || scenario.managementPoints.length === 0) {
    return null;
  }
  const points = scenario.managementPoints;
  const max = points.length * PER_POINT_MAX;
  const graded: GradedDecision[] = [];
  for (const p of points) {
    const d = decisions?.find((x) => x.candleIndex === p.candleIndex) ?? null;
    graded.push(gradeOne(p, d));
  }
  const total = graded.reduce((s, g) => s + g.points, 0);
  const tags: MistakeTag[] = [];
  for (const g of graded) {
    if (g.tag && !tags.includes(g.tag)) tags.push(g.tag);
  }
  const positive = total === max && tags.length === 0;
  if (positive) tags.push("managed_well");
  const note = positive
    ? "Every management decision matched the ideal play."
    : `${graded.filter((g) => g.points < g.max).length} of ${graded.length} management points were sub-optimal.`;
  return {
    id: "trade_management",
    label: "Trade management",
    points: total,
    max,
    note,
    tags,
    positive,
    graded,
  };
}
