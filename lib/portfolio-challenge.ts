// v4.1.1 — Portfolio-native challenges. The single-scenario DrillSet shape in
// lib/drills.ts doesn't fit the portfolio surface (it filters scenarios and
// counts attempts; the simulator has neither). Rather than warping DrillSet,
// portfolio challenges are their own small thing: a named goal, an evaluator
// that runs against an ended session, and a per-id completion timestamp in
// localStorage.

import { realizedSessionPnl, scorePortfolioRisk } from "./portfolio";
import type { PortfolioSession } from "./types";

export type PortfolioChallengeId =
  | "five_concurrent_seven_days"
  | "finish_above_water";

export type PortfolioChallenge = {
  id: PortfolioChallengeId;
  title: string;
  description: string;
  // Minimum positions opened across the session (any status counts; opening
  // and getting stopped out still counts toward the count).
  minPositions: number;
  // Whether the score's tags must include this tag for the challenge to clear.
  // Lets us require a specific outcome ("portfolio_balanced") rather than just
  // a numeric threshold.
  requireTag?: "portfolio_balanced";
  // v4.1.2 — minimum realized PnL (in account-percent units) the session must
  // hit. Used by "Finish above water" (> 0). Composition challenges leave it
  // undefined.
  requireRealizedPnlAbove?: number;
};

export const CHALLENGES: Record<PortfolioChallengeId, PortfolioChallenge> = {
  five_concurrent_seven_days: {
    id: "five_concurrent_seven_days",
    title: "Run 5 concurrent trades for 7 days",
    description:
      "Open at least 5 positions across the 7-day window and finish with a portfolio_balanced score — total risk inside the 5% budget and no high-correlation overlap.",
    minPositions: 5,
    requireTag: "portfolio_balanced",
  },
  finish_above_water: {
    // v4.1.2 — outcome-oriented sibling to the composition challenge. Lets
    // beginners feel the bridge between "good composition" (a process win)
    // and "made money" (an outcome win) — they're related but not the same.
    id: "finish_above_water",
    title: "Finish above water",
    description:
      "Open at least 3 positions and end the session with positive realized P&L. Composition isn't everything — outcomes count too.",
    minPositions: 3,
    requireRealizedPnlAbove: 0,
  },
};

// Stable order for the SessionSummary's "what cleared" list and any future
// challenge-picker UI. New challenges added below the primary one.
export const CHALLENGES_IN_ORDER: PortfolioChallenge[] = [
  CHALLENGES.five_concurrent_seven_days,
  CHALLENGES.finish_above_water,
];

export type ChallengeProgress = {
  challenge: PortfolioChallenge;
  positionsOpened: number;
  positionsTarget: number;
  // True only when the session has ended AND positionsOpened >= minPositions
  // AND (when requireTag set) the score includes that tag AND (when
  // requireRealizedPnlAbove set) the realized PnL clears the threshold.
  satisfied: boolean;
  // Detail for the UI when not satisfied: which sub-check failed.
  failedRequireTag: boolean;
  failedRealizedPnl: boolean;
};

export function evaluateChallenge(
  session: PortfolioSession,
  challenge: PortfolioChallenge = CHALLENGES.five_concurrent_seven_days
): ChallengeProgress {
  const positionsOpened = session.positions.length;
  const meetsCount = positionsOpened >= challenge.minPositions;
  let meetsTag = true;
  let failedRequireTag = false;
  if (challenge.requireTag) {
    if (session.status !== "ended") {
      meetsTag = false;
    } else {
      const score = scorePortfolioRisk(session);
      meetsTag = !!score && score.tags.includes(challenge.requireTag);
      failedRequireTag = !meetsTag;
    }
  }
  let meetsPnl = true;
  let failedRealizedPnl = false;
  if (challenge.requireRealizedPnlAbove != null) {
    if (session.status !== "ended") {
      meetsPnl = false;
    } else {
      const pnl = realizedSessionPnl(session);
      meetsPnl = pnl > challenge.requireRealizedPnlAbove;
      failedRealizedPnl = !meetsPnl;
    }
  }
  return {
    challenge,
    positionsOpened,
    positionsTarget: challenge.minPositions,
    satisfied:
      session.status === "ended" && meetsCount && meetsTag && meetsPnl,
    failedRequireTag,
    failedRealizedPnl,
  };
}

// v4.1.2 — convenience: evaluate every challenge against a session. Used by
// SessionSummary to list clears and by handleEnd to stamp completions.
export function evaluateAllChallenges(
  session: PortfolioSession
): ChallengeProgress[] {
  return CHALLENGES_IN_ORDER.map((c) => evaluateChallenge(session, c));
}

// ── Completion storage ──────────────────────────────────────────────────────

const CHALLENGE_KEY = "trainer.portfolioChallenges.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

type CompletionMap = Partial<Record<PortfolioChallengeId, number>>;

function readCompletions(): CompletionMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(CHALLENGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CompletionMap) : {};
  } catch {
    return {};
  }
}

export function getChallengeCompletion(id: PortfolioChallengeId): number | null {
  const map = readCompletions();
  return map[id] ?? null;
}

export function markChallengeCompleted(id: PortfolioChallengeId): void {
  if (!isBrowser()) return;
  const map = readCompletions();
  if (map[id]) return; // first completion wins; don't overwrite
  map[id] = Date.now();
  try {
    window.localStorage.setItem(CHALLENGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

export const PORTFOLIO_CHALLENGE_KEY_NAME = CHALLENGE_KEY;
