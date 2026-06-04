"use client";

// v2.1 — single unified pill in the header showing:
//   [ 🔥 12 | 2 / 3 ]   (active streak + today's progress)
//
// Tone:
//   • streak count: text-text when active, muted when broken
//   • flame: amber when current ≥ 1, sleep emoji 💤 when broken-but-recoverable,
//     a faint dot · when fresh-no-streak (less noisy than a permanent sleep icon)
//   • today/goal: muted by default; good (green) on the goal number + count
//     when goal met for the day
//
// Refreshes on:
//   • CustomEvent("trainer:streak-updated") — dispatched by saveAttempt callers
//   • window 'focus' — catches midnight rollover when tab was idle

import { useEffect, useState } from "react";
import { getDailyGoal, visibleStreak } from "@/lib/streak";

export const STREAK_UPDATED_EVENT = "trainer:streak-updated";

export function refreshStreakBadges(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STREAK_UPDATED_EVENT));
}

export default function StreakBadge() {
  const [hydrated, setHydrated] = useState(false);
  const [streak, setStreak] = useState({
    current: 0,
    todayCount: 0,
    longest: 0,
    isBrokenButRecoverable: false,
  });
  const [goal, setGoal] = useState(3);

  useEffect(() => {
    function read() {
      setStreak(visibleStreak());
      setGoal(getDailyGoal());
    }
    read();
    setHydrated(true);
    window.addEventListener(STREAK_UPDATED_EVENT, read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener(STREAK_UPDATED_EVENT, read);
      window.removeEventListener("focus", read);
    };
  }, []);

  // Reserve space during SSR so the header doesn't jump on hydration.
  if (!hydrated) return <div className="h-7 w-[7.5rem]" aria-hidden />;

  const goalMet = streak.todayCount >= goal;
  const hasStreak = streak.current > 0;

  // Flame glyph + accent colour per state.
  // - hasStreak  → 🔥 amber
  // - broken     → 💤 muted (the "you lost it" cue)
  // - cold start → small dot, no emoji weight
  const flame = hasStreak ? "🔥" : streak.isBrokenButRecoverable ? "💤" : "·";
  const flameClass = hasStreak ? "" : "opacity-60 grayscale";
  const streakNumClass = hasStreak ? "text-text" : "text-muted";

  // Tooltip carries the longest streak + extra context. Keeps the visible
  // pill clean while still surfacing the gamification data on hover.
  const tooltip = hasStreak
    ? `${streak.current}-day streak · best ${streak.longest}`
    : streak.isBrokenButRecoverable
    ? `Streak broken (best was ${streak.longest}). Save today to start a new one.`
    : "Save an attempt to start a streak.";

  return (
    <div
      className="inline-flex items-center h-7 rounded-full border border-line bg-panel2 text-xs leading-none select-none"
      title={tooltip}
      aria-label={tooltip}
    >
      <div className="flex items-center gap-1.5 pl-2.5 pr-3">
        <span aria-hidden className={`text-sm ${flameClass}`}>{flame}</span>
        <span className={`font-mono font-semibold tabular-nums ${streakNumClass}`}>
          {streak.current}
        </span>
        <span className="text-muted text-[10px] uppercase tracking-wide">d</span>
      </div>
      <span aria-hidden className="h-3.5 w-px bg-line" />
      <div className="flex items-center gap-1 pl-3 pr-2.5">
        <span className={`font-mono font-semibold tabular-nums ${goalMet ? "text-good" : "text-text"}`}>
          {streak.todayCount}
        </span>
        <span className="text-muted">/</span>
        <span className="font-mono tabular-nums text-muted">{goal}</span>
        {goalMet && <span aria-hidden className="text-good text-xs ml-0.5">✓</span>}
      </div>
    </div>
  );
}
