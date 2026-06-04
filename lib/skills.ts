import type {
  Attempt,
  MistakeTag,
  ScoreCategoryId,
  ScoreCategoryResult,
} from "./types";

export type SkillId =
  | "direction_reading"
  | "risk_control"
  | "stop_placement"
  | "target_planning"
  | "risk_reward"
  | "leverage_control"
  | "trade_thesis"
  | "invalidation"
  | "patience";

export type Skill = {
  id: SkillId;
  label: string;
  // Score categories that count toward this skill's average.
  categories: ScoreCategoryId[];
  // Mistake tags that, when present in attempts, penalize this skill.
  penaltyTags: MistakeTag[];
  // Mistake tags that signal positive behavior in this skill (rare — used for patience).
  bonusTags: MistakeTag[];
  // Learn term that explains the skill — used for recommendations.
  termId: string;
};

export const SKILLS: Skill[] = [
  {
    id: "direction_reading",
    label: "Direction reading",
    categories: ["direction"],
    penaltyTags: ["counter_trend"],
    bonusTags: [],
    termId: "trend",
  },
  {
    id: "risk_control",
    label: "Risk control",
    categories: ["risk"],
    penaltyTags: ["risk_too_high", "risk_too_low_to_learn"],
    bonusTags: [],
    termId: "risk_percent",
  },
  {
    id: "stop_placement",
    label: "Stop placement",
    categories: ["stop"],
    penaltyTags: ["no_stop_loss", "stop_too_tight", "stop_in_noise"],
    bonusTags: [],
    termId: "stop_loss",
  },
  {
    id: "target_planning",
    label: "Target planning",
    categories: ["target"],
    penaltyTags: ["tp_unrealistic"],
    bonusTags: [],
    termId: "target_realism",
  },
  {
    id: "risk_reward",
    label: "Risk-to-reward",
    categories: ["rr"],
    penaltyTags: ["poor_risk_reward"],
    bonusTags: [],
    termId: "risk_reward",
  },
  {
    id: "leverage_control",
    label: "Leverage control",
    categories: ["leverage"],
    penaltyTags: ["leverage_excessive", "liquidation_before_stop"],
    bonusTags: [],
    termId: "leverage",
  },
  {
    id: "trade_thesis",
    label: "Trade thesis",
    categories: ["thesis"],
    penaltyTags: ["no_thesis"],
    bonusTags: [],
    termId: "thesis",
  },
  {
    id: "invalidation",
    label: "Invalidation",
    categories: ["invalidation"],
    penaltyTags: ["no_invalidation"],
    bonusTags: [],
    termId: "invalidation",
  },
  {
    id: "patience",
    label: "Patience",
    // No direct score category — derived from tag mix below.
    categories: [],
    penaltyTags: ["forced_trade", "missed_valid_setup"],
    bonusTags: ["wait_was_best"],
    termId: "wait_decision",
  },
];

export const SKILL_BY_ID: Record<SkillId, Skill> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
) as Record<SkillId, Skill>;

export type SkillScore = {
  id: SkillId;
  label: string;
  score: number; // 0–100, null if no data
  attempts: number; // how many attempts contributed
  hasData: boolean;
};

function categoryAvgPct(
  attempts: Attempt[],
  categories: ScoreCategoryId[]
): { pct: number; count: number } {
  if (categories.length === 0) return { pct: 0, count: 0 };
  let sum = 0;
  let count = 0;
  for (const a of attempts) {
    for (const b of a.score.breakdown as ScoreCategoryResult[]) {
      if (categories.includes(b.id)) {
        sum += b.points / b.max;
        count += 1;
      }
    }
  }
  return { count, pct: count === 0 ? 0 : (sum / count) * 100 };
}

function patienceScore(attempts: Attempt[]): { pct: number; count: number } {
  // Patience is the share of "wait" decisions taken correctly. Forced trades drag the score
  // down; correct waits push it up. Attempts that aren't wait/forced contribute neutrally.
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const a of attempts) {
    const tagSet = new Set(a.score.tags);
    if (tagSet.has("wait_was_best")) positive += 1;
    else if (tagSet.has("forced_trade")) negative += 1;
    else if (tagSet.has("missed_valid_setup")) negative += 0.5;
    else neutral += 1;
  }
  const total = positive + negative + neutral;
  if (total === 0) return { pct: 0, count: 0 };
  // Neutral attempts count as half a positive — taking decent trades isn't impatience.
  const pct = ((positive + neutral * 0.5) / total) * 100;
  return { pct, count: total };
}

export function computeSkillScores(attempts: Attempt[]): SkillScore[] {
  return SKILLS.map((s) => {
    const { pct, count } =
      s.id === "patience" ? patienceScore(attempts) : categoryAvgPct(attempts, s.categories);
    return {
      id: s.id,
      label: s.label,
      score: Math.round(pct),
      attempts: count,
      hasData: count > 0,
    };
  });
}

export function weakestSkill(scores: SkillScore[]): SkillScore | null {
  const withData = scores.filter((s) => s.hasData);
  if (withData.length === 0) return null;
  return [...withData].sort((a, b) => a.score - b.score)[0];
}

export function strongestSkill(scores: SkillScore[]): SkillScore | null {
  const withData = scores.filter((s) => s.hasData);
  if (withData.length === 0) return null;
  return [...withData].sort((a, b) => b.score - a.score)[0];
}

// v2.7 — Trailing-window skill score per attempt index, used by the Journal's
// per-skill trend chart. Returns N data points (one per attempt in order),
// each the cumulative skill score over the attempts up to and including that
// point. Cumulative (not strict rolling) so the line stabilises as more data
// arrives instead of jumping around with each new attempt — closer to how the
// user perceives "am I improving."
export type SkillTrendPoint = {
  attemptIdx: number;
  attemptId: string;
  createdAt: number;
  score: number | null; // null while no data has accumulated for this skill yet
};

export type SkillTrend = {
  id: SkillId;
  label: string;
  points: SkillTrendPoint[];
  current: number | null;
  delta: number | null; // current minus the score 10 attempts ago (or earliest available)
};

export function computeSkillTrends(attempts: Attempt[]): SkillTrend[] {
  const ordered = [...attempts].sort((a, b) => a.createdAt - b.createdAt);
  return SKILLS.map((s) => {
    const points: SkillTrendPoint[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const window = ordered.slice(0, i + 1);
      const { pct, count } =
        s.id === "patience" ? patienceScore(window) : categoryAvgPct(window, s.categories);
      points.push({
        attemptIdx: i,
        attemptId: ordered[i].id,
        createdAt: ordered[i].createdAt,
        score: count === 0 ? null : Math.round(pct),
      });
    }
    const withData = points.filter((p) => p.score != null) as Array<SkillTrendPoint & { score: number }>;
    const current = withData.length === 0 ? null : withData[withData.length - 1].score;
    let delta: number | null = null;
    if (withData.length >= 2) {
      const compareIdx = Math.max(0, withData.length - 11);
      delta = current! - withData[compareIdx].score;
    }
    return { id: s.id, label: s.label, points, current, delta };
  });
}
