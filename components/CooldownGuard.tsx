"use client";

// v2.4 — Cooldown after losing streak. When 3 consecutive attempts in the
// current session scored below 60, the practice form is gated by a short
// reflection prompt. Either complete the prompt (~10 chars) or wait 2 minutes
// before the next attempt unlocks.
//
// This trains the single most valuable real-trading habit: step away when
// you're cold. Beginners (and most retail traders) skip this and tilt-trade
// straight into account blowups.
//
// Per-session only — not persisted. Resets when the user navigates away.

import { useEffect, useMemo, useState } from "react";
import type { Attempt } from "@/lib/types";
import Mascot from "./Mascot";

const STREAK_THRESHOLD = 3;
const SCORE_FLOOR = 60;
const REFLECTION_MIN_CHARS = 10;
const COOLDOWN_MS = 2 * 60 * 1000;

function hasLosingStreak(attempts: Attempt[]): boolean {
  if (attempts.length < STREAK_THRESHOLD) return false;
  const last = attempts.slice(-STREAK_THRESHOLD);
  return last.every((a) => a.score.total < SCORE_FLOOR);
}

export default function CooldownGuard({
  sessionAttempts,
  active,
  onAcknowledge,
}: {
  sessionAttempts: Attempt[];
  // True when the user has triggered the cooldown and hasn't yet cleared it.
  // Parent owns this so dismissal is sticky across re-renders.
  active: boolean;
  onAcknowledge: (reflection: string) => void;
}) {
  const [reflection, setReflection] = useState("");
  const [now, setNow] = useState(Date.now());
  const [enteredAt] = useState(Date.now());

  // Tick once per second so the countdown updates.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsed = now - enteredAt;
  const remaining = Math.max(0, COOLDOWN_MS - elapsed);
  const remainingMin = Math.floor(remaining / 60000);
  const remainingSec = Math.floor((remaining % 60000) / 1000);
  const canSkipByReflection = reflection.trim().length >= REFLECTION_MIN_CHARS;
  const canSkipByTime = remaining <= 0;

  if (!active) return null;

  const last3 = sessionAttempts.slice(-STREAK_THRESHOLD).map((a) => a.score.total);

  function handleAck() {
    onAcknowledge(reflection.trim());
    setReflection("");
  }

  return (
    <div className="rounded-md border-2 border-warn/50 bg-warn/10 p-4 space-y-3">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <Mascot mood="sleeping" size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-warn">Cooldown</div>
          <h2 className="text-base font-bold mt-0.5">Even owls take breaks.</h2>
          <p className="text-sm text-text mt-1 leading-relaxed">
            Three attempts in a row scored under {SCORE_FLOOR} ({last3.join(", ")}). That's the moment real traders blow up
            accounts — when frustration drives the next click. Walk to the kitchen. The market will still be here.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted block">
          One sentence: what's going wrong in your last few attempts?
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={2}
          placeholder="e.g. I keep entering at the high without waiting for a confirmation candle."
          className="w-full bg-panel border border-line text-text text-sm px-3 py-2 rounded-md placeholder-muted/60"
        />
        <p className="text-[10px] text-muted">
          Reflection unlocks immediately at {REFLECTION_MIN_CHARS}+ characters. Or wait it out —{" "}
          {canSkipByTime ? (
            <span className="text-good">timer up.</span>
          ) : (
            <span>
              {remainingMin}:{remainingSec.toString().padStart(2, "0")} remaining.
            </span>
          )}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAck}
          disabled={!canSkipByReflection && !canSkipByTime}
          className="text-sm font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {canSkipByReflection ? "Save reflection & continue" : canSkipByTime ? "Continue" : "Continue (locked)"}
        </button>
      </div>
    </div>
  );
}

// Exported so the parent page can decide when to *enter* the cooldown. Parent
// owns the `active` state because the user may dismiss but the streak still
// stands until a non-losing attempt breaks it.
export { hasLosingStreak };
