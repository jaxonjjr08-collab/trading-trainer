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

import { useEffect, useRef, useState } from "react";
import { getDailyGoal, visibleStreak } from "@/lib/streak";
import AnimatedNumber from "@/components/animation/AnimatedNumber";

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
  // v5.11.1 — flash the badge with a glow whenever the streak count or the
  // today-count climbs. Stamped on a key that increments per change so the
  // CSS animation re-runs each time without state-juggling.
  const prevStreakRef = useRef(0);
  const prevTodayRef = useRef(0);
  const [glowKey, setGlowKey] = useState(0);
  const [goalCelebKey, setGoalCelebKey] = useState(0);

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

  // Detect a fresh increment for the visual celebration. We compare against
  // a ref so a re-render that re-reads the same numbers doesn't re-fire it.
  useEffect(() => {
    if (!hydrated) return;
    if (streak.current > prevStreakRef.current) setGlowKey((k) => k + 1);
    if (streak.todayCount > prevTodayRef.current && streak.todayCount >= goal) {
      setGoalCelebKey((k) => k + 1);
    }
    prevStreakRef.current = streak.current;
    prevTodayRef.current = streak.todayCount;
  }, [streak.current, streak.todayCount, goal, hydrated]);

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

  // v5.11.1 — glowKey is bumped per streak increment so the keyed wrapper
  // re-mounts and re-runs animate-glow each time. Same trick for the
  // todayCount-hits-goal celebration.
  return (
    <div
      key={`s${glowKey}-g${goalCelebKey}`}
      className={`inline-flex items-center h-7 rounded-full border border-line bg-panel2 text-xs leading-none select-none ${
        glowKey > 0 || goalCelebKey > 0 ? "animate-glow" : ""
      }`}
      title={tooltip}
      aria-label={tooltip}
    >
      <div className="flex items-center gap-1.5 pl-2.5 pr-3">
        <span aria-hidden className={`text-sm ${flameClass}`}>{flame}</span>
        <span className={`font-mono font-semibold tabular-nums ${streakNumClass}`}>
          <AnimatedNumber value={streak.current} durationMs={600} />
        </span>
        <span className="text-muted text-[10px] uppercase tracking-wide">d</span>
      </div>
      <span aria-hidden className="h-3.5 w-px bg-line" />
      <div className="flex items-center gap-1 pl-3 pr-2.5">
        <span className={`font-mono font-semibold tabular-nums ${goalMet ? "text-good" : "text-text"}`}>
          <AnimatedNumber value={streak.todayCount} durationMs={500} />
        </span>
        <span className="text-muted">/</span>
        <span className="font-mono tabular-nums text-muted">{goal}</span>
        {goalMet && <span aria-hidden className="text-good text-xs ml-0.5">✓</span>}
      </div>
    </div>
  );
}
