// v2.4 — Achievement milestones. Local-only, no leaderboard, no social
// pressure — just markers of "you noticed something hard, you did something
// well, you stuck with it." Computed on demand from existing state (attempts,
// diagnostic, learn progress) so there's no separate earned-set storage to
// migrate or stale-out.
//
// Add new badges by appending to ACHIEVEMENTS. Each badge's `earned()` runs
// against the current state object; truthy means earned. `earnedAt` returns
// the timestamp of the qualifying event when possible so the dashboard can
// sort by recency.

import type { Attempt } from "./types";
import type { DiagnosticResult } from "./diagnostic";
import { isCorrect, DIAGNOSTIC_QUESTIONS } from "./diagnostic";

export type AchievementCheckState = {
  attempts: Attempt[];
  diagnostic: DiagnosticResult | null;
  learnReadTermIds?: string[];
};

export type Achievement = {
  id: string;
  label: string;
  blurb: string;
  category: "first" | "discipline" | "skill" | "milestone" | "comeback";
  earned: (s: AchievementCheckState) => boolean;
  // Returns the createdAt of the qualifying attempt when applicable, else
  // null. Lets the dashboard show "earned today" / "earned 3 days ago."
  earnedAt?: (s: AchievementCheckState) => number | null;
};

function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function consecutiveHighScores(attempts: Attempt[], n: number, floor: number): boolean {
  if (attempts.length < n) return false;
  return lastN(attempts, n).every((a) => a.score.total >= floor);
}

function uniqueSetupTypes(attempts: Attempt[]): Set<string> {
  const set = new Set<string>();
  for (const a of attempts) set.add(a.scenarioId.split("-").slice(0, 2).join("-"));
  return set;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_steps",
    label: "First steps",
    blurb: "Saved your first attempt to the journal.",
    category: "first",
    earned: (s) => s.attempts.length >= 1,
    earnedAt: (s) => s.attempts[0]?.createdAt ?? null,
  },
  {
    id: "clean_plan",
    label: "Clean plan",
    blurb: "Submitted an attempt with every checklist item filled — direction, entry, stop, TP, risk, leverage, thesis, invalidation.",
    category: "first",
    earned: (s) =>
      s.attempts.some(
        (a) =>
          a.decision.direction !== "wait" &&
          a.decision.entry != null &&
          a.decision.stopLoss != null &&
          a.decision.takeProfit != null &&
          a.decision.riskPercent != null &&
          a.decision.leverage != null &&
          (a.decision.thesis ?? "").length >= 20 &&
          (a.decision.invalidation ?? "").length >= 20
      ),
    earnedAt: (s) => {
      const a = s.attempts.find(
        (a) =>
          a.decision.direction !== "wait" &&
          a.decision.entry != null &&
          a.decision.stopLoss != null &&
          a.decision.takeProfit != null &&
          a.decision.riskPercent != null &&
          a.decision.leverage != null &&
          (a.decision.thesis ?? "").length >= 20 &&
          (a.decision.invalidation ?? "").length >= 20
      );
      return a?.createdAt ?? null;
    },
  },
  {
    id: "first_tp",
    label: "First take-profit hit",
    blurb: "An attempt where your trade actually reached take-profit before stop or expiry.",
    category: "first",
    earned: (s) => s.attempts.some((a) => a.outcome.hit === "tp"),
    earnedAt: (s) => s.attempts.find((a) => a.outcome.hit === "tp")?.createdAt ?? null,
  },
  {
    id: "high_rr",
    label: "Asymmetric thinker",
    blurb: "Submitted an attempt with R:R ≥ 3 — reward at least triple the risk.",
    category: "skill",
    earned: (s) =>
      s.attempts.some((a) => {
        const d = a.decision;
        if (d.entry == null || d.stopLoss == null || d.takeProfit == null) return false;
        const risk = Math.abs(d.entry - d.stopLoss);
        const reward = Math.abs(d.takeProfit - d.entry);
        return risk > 0 && reward / risk >= 3;
      }),
  },
  {
    id: "five_for_five",
    label: "Five for five",
    blurb: "Five consecutive attempts scored 80 or above.",
    category: "skill",
    earned: (s) => consecutiveHighScores(s.attempts, 5, 80),
    earnedAt: (s) => (consecutiveHighScores(s.attempts, 5, 80) ? lastN(s.attempts, 1)[0]?.createdAt ?? null : null),
  },
  {
    id: "patience",
    label: "Patience under pressure",
    blurb: "Took the Wait decision on 10 different attempts — sometimes the best trade is no trade.",
    category: "discipline",
    earned: (s) => s.attempts.filter((a) => a.decision.direction === "wait").length >= 10,
  },
  {
    id: "risk_discipline",
    label: "Risk-disciplined",
    blurb: "10 consecutive attempts where risk % stayed at or below 2%.",
    category: "discipline",
    earned: (s) => {
      const last = lastN(s.attempts, 10);
      if (last.length < 10) return false;
      return last.every((a) => (a.decision.riskPercent ?? 0) <= 2);
    },
  },
  {
    id: "comeback",
    label: "Comeback",
    blurb: "Scored 90 or higher right after three consecutive sub-60 attempts. The grind back is the lesson.",
    category: "comeback",
    earned: (s) => {
      for (let i = 3; i < s.attempts.length; i++) {
        const prev3 = s.attempts.slice(i - 3, i);
        if (prev3.every((a) => a.score.total < 60) && s.attempts[i].score.total >= 90) {
          return true;
        }
      }
      return false;
    },
  },
  {
    id: "setup_sampler",
    label: "Setup sampler",
    blurb: "Practiced at least five different setup types — variety builds pattern recognition.",
    category: "skill",
    earned: (s) => uniqueSetupTypes(s.attempts).size >= 5,
  },
  {
    id: "marathon_25",
    label: "Marathon: 25 attempts",
    blurb: "25 attempts saved to your journal. The trainer learns from the volume.",
    category: "milestone",
    earned: (s) => s.attempts.length >= 25,
  },
  {
    id: "marathon_100",
    label: "Marathon: 100 attempts",
    blurb: "100 attempts. By now the journal patterns should be telling you what you actually do, not what you think you do.",
    category: "milestone",
    earned: (s) => s.attempts.length >= 100,
  },
  {
    id: "diagnostic_pass",
    label: "Diagnostic pass",
    blurb: "Got 7 or 8 of 8 questions right on a diagnostic.",
    category: "skill",
    earned: (s) => {
      if (!s.diagnostic) return false;
      const correct = s.diagnostic.picks.reduce<number>(
        (n, pick, idx) => (isCorrect(idx, pick) ? n + 1 : n),
        0
      );
      return correct >= 7 && s.diagnostic.picks.length === DIAGNOSTIC_QUESTIONS.length;
    },
    earnedAt: (s) => s.diagnostic?.completedAt ?? null,
  },
  {
    id: "thoughtful_thesis",
    label: "Thoughtful thesis",
    blurb: "Wrote a thesis longer than 100 characters on a saved attempt — detail forces clarity.",
    category: "discipline",
    earned: (s) => s.attempts.some((a) => (a.decision.thesis ?? "").length >= 100),
  },
  {
    id: "no_liquidations",
    label: "Survival rate",
    blurb: "10 consecutive attempts without a liquidation. Leverage discipline is keeping you in the game.",
    category: "discipline",
    earned: (s) => {
      const last = lastN(s.attempts, 10);
      if (last.length < 10) return false;
      return last.every((a) => !a.outcome.liquidated);
    },
  },
  {
    id: "managed_well",
    label: "Trade management",
    blurb: "Earned the managed_well tag on at least one attempt — you protected, partialed, or exited cleanly.",
    category: "skill",
    earned: (s) => s.attempts.some((a) => a.score.tags.includes("managed_well")),
  },
];

export function earnedAchievements(state: AchievementCheckState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.earned(state));
}

export function unearnedAchievements(state: AchievementCheckState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !a.earned(state));
}
