"use client";

// v4.1 — End-of-session summary card. Shows portfolio_risk score,
// realized PnL, position outcomes by status, and the score's note. Sits in
// place of the active controls when the session has ended.

import { scorePortfolioRisk, realizedSessionPnl } from "@/lib/portfolio";
import { evaluateAllChallenges } from "@/lib/portfolio-challenge";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
  onStartNew: () => void;
};

export default function SessionSummary({ session, onStartNew }: Props) {
  const score = scorePortfolioRisk(session);
  const realized = realizedSessionPnl(session);
  const tpHits = session.positions.filter((p) => p.status === "closed_tp").length;
  const slHits = session.positions.filter((p) => p.status === "closed_sl").length;
  const manual = session.positions.filter((p) => p.status === "closed_manual").length;
  // v5.3.0 — liquidations get their own bucket so leveraged-position blowups
  // don't silently vanish from the summary breakdown.
  const liqHits = session.positions.filter((p) => p.status === "closed_liq").length;
  // v4.1.2 — multi-challenge clears. Listed after the score so the score is
  // what the user reads first; challenges feel like bonus achievements rather
  // than the headline.
  const challenges = evaluateAllChallenges(session);
  const cleared = challenges.filter((c) => c.satisfied);

  return (
    <div className="rounded-md border border-line bg-panel p-4 space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Session ended</h2>
        <p className="text-xs text-muted">
          Score reflects portfolio composition — not whether the trades made money.
        </p>
      </header>

      {score ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Portfolio risk</span>
            <span className="font-mono text-lg">
              {score.total}/{score.max}
            </span>
          </div>
          <p className="text-xs text-text leading-snug">{score.breakdown[0].note}</p>
          {score.tags.length > 0 && (
            <ul className="space-y-1 text-xs">
              {score.tags.map((tag) => {
                const info = MISTAKE_TAGS[tag];
                if (!info) return null;
                return (
                  <li
                    key={tag}
                    className={`rounded border px-2 py-1 ${
                      info.positive
                        ? "border-good/40 bg-good/5 text-good"
                        : "border-warn/40 bg-warn/5 text-warn"
                    }`}
                  >
                    <span className="font-semibold">{info.label}.</span>{" "}
                    <span className="text-text">{info.description}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted">
          No positions were opened — no portfolio score for this session.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Realized P&amp;L
          </div>
          <div
            className={`font-mono text-base ${
              realized >= 0 ? "text-good" : "text-bad"
            }`}
          >
            {realized >= 0 ? "+" : ""}
            {realized.toFixed(2)}%
          </div>
        </div>
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Outcomes
          </div>
          <div className="font-mono text-[11px] leading-tight">
            {tpHits} TP · {slHits} SL · {manual} manual
            {liqHits > 0 && <span className="text-bad"> · {liqHits} liq</span>}
          </div>
        </div>
      </div>

      {cleared.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Challenges cleared ({cleared.length}/{challenges.length})
          </div>
          {cleared.map((c) => (
            <div
              key={c.challenge.id}
              className="rounded border border-good/40 bg-good/5 px-2 py-1.5 text-xs"
            >
              <span className="text-good font-semibold">✓ {c.challenge.title}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onStartNew}
        className="w-full bg-accent text-white font-semibold py-2 rounded-md"
      >
        Start new session
      </button>
    </div>
  );
}
