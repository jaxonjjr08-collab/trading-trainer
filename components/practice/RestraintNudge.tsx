"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// Fires a pace warning when the user is over-trading in a session.

import type { Attempt } from "@/lib/types";

export default function RestraintNudge({
  attempts,
  onDismiss,
}: {
  attempts: Attempt[];
  onDismiss: () => void;
}) {
  // Two triggers, either one fires the nudge: 6+ attempts in the session, OR avg gap
  // between attempts under 90s. Either signals over-trading.
  if (attempts.length < 4) return null;
  const sorted = [...attempts].sort((a, b) => a.createdAt - b.createdAt);
  const firstAt = sorted[0].createdAt;
  const lastAt = sorted[sorted.length - 1].createdAt;
  const spanMs = lastAt - firstAt;
  const avgGapSec = spanMs / 1000 / Math.max(1, sorted.length - 1);
  const grinding = attempts.length >= 6 || avgGapSec < 90;
  if (!grinding) return null;

  const minutes = Math.max(1, Math.round(spanMs / 60000));
  return (
    <div className="rounded-md border border-warn/40 bg-warn/5 p-3 flex items-center justify-between gap-3 text-sm">
      <div>
        <span className="font-semibold text-warn">Pace check.</span>{" "}
        <span className="text-text">
          You've taken {attempts.length} attempts in ~{minutes} minute{minutes === 1 ? "" : "s"}.
        </span>{" "}
        <span className="text-muted">
          Real markets reward sitting on your hands. Consider a short break.
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs text-muted hover:text-text border border-line bg-panel px-2.5 py-1 rounded-md"
      >
        Got it
      </button>
    </div>
  );
}
