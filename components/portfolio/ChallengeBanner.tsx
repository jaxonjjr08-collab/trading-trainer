"use client";

// v4.1.1 — Goal banner for the portfolio simulator. Shows the active
// challenge, the user's progress, and a checkmark when it clears. Compact
// so it doesn't crowd the simulator surface.

import {
  CHALLENGES,
  evaluateChallenge,
  getChallengeCompletion,
  type PortfolioChallenge,
} from "@/lib/portfolio-challenge";
import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
  challenge?: PortfolioChallenge;
};

export default function ChallengeBanner({
  session,
  challenge = CHALLENGES.five_concurrent_seven_days,
}: Props) {
  const progress = evaluateChallenge(session, challenge);
  const previouslyCompleted = getChallengeCompletion(challenge.id);
  const showSatisfied = progress.satisfied || previouslyCompleted != null;
  const tone = showSatisfied
    ? "border-good/40 bg-good/5 text-good"
    : "border-accent/40 bg-accent/5 text-accent";

  return (
    <div className={`rounded-md border ${tone} px-3 py-2 text-xs`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="uppercase tracking-wide text-[10px] font-semibold">
              Challenge
            </span>
            <span className="font-semibold text-text truncate">
              {challenge.title}
            </span>
          </div>
          <p className="text-muted mt-0.5 leading-snug">
            {challenge.description}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono">
          {showSatisfied ? (
            <span className="text-good font-semibold">✓ Cleared</span>
          ) : (
            <span>
              {progress.positionsOpened}/{progress.positionsTarget}
            </span>
          )}
        </div>
      </div>
      {session.status === "ended" && !progress.satisfied && (
        <div className="mt-1.5 text-muted">
          {progress.positionsOpened < progress.positionsTarget ? (
            <>
              Session ended with {progress.positionsOpened}/
              {progress.positionsTarget} positions. The challenge needs at
              least {progress.positionsTarget} positions opened.
            </>
          ) : progress.failedRequireTag ? (
            <>
              Session ended without the portfolio_balanced tag — fix
              overconcentration or correlated overlap next run.
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
