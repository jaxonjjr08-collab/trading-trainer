"use client";

// v2.4 — Local-only achievements panel for the Dashboard. Reads attempts +
// diagnostic from storage and computes which badges are currently earned.
// No leaderboard, no social pressure — just markers for noticing your own
// growth in dimensions the average score doesn't capture.
//
// v2.6 — Variant prop. The Dashboard uses "row" (horizontal scroller, no
// border on the section, badge pills only). The AttemptDetail / Performance
// callers (if any) keep "grid" which preserves the original look.

import { useEffect, useState } from "react";
import { listAttempts, getDiagnostic } from "@/lib/storage";
import {
  ACHIEVEMENTS,
  earnedAchievements,
  type Achievement,
} from "@/lib/achievements";

const CATEGORY_TONE: Record<Achievement["category"], string> = {
  first: "border-accent/40 bg-accent/5 text-accent",
  discipline: "border-good/40 bg-good/5 text-good",
  skill: "border-good/40 bg-good/5 text-good",
  milestone: "border-warn/40 bg-warn/5 text-warn",
  comeback: "border-warn/40 bg-warn/5 text-warn",
};

type Variant = "grid" | "row";

export default function AchievementsPanel({ variant = "grid" }: { variant?: Variant } = {}) {
  const [earned, setEarned] = useState<Achievement[] | null>(null);
  const [total] = useState(ACHIEVEMENTS.length);

  useEffect(() => {
    function read() {
      const state = {
        attempts: listAttempts(),
        diagnostic: getDiagnostic(),
      };
      setEarned(earnedAchievements(state));
    }
    read();
    window.addEventListener("trainer:streak-updated", read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("trainer:streak-updated", read);
      window.removeEventListener("focus", read);
    };
  }, []);

  if (!earned) return null;

  // ─── Row variant — Dashboard horizontal scroller, borderless section ─────
  if (variant === "row") {
    if (earned.length === 0) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Achievements</h2>
          <span className="text-xs text-muted">
            <span className="text-text font-semibold tab-nums">{earned.length}</span> of {total}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 snap-x">
          {earned.map((a) => (
            <div
              key={a.id}
              className={`shrink-0 snap-start min-w-[12rem] max-w-xs rounded-xl border p-3 ${CATEGORY_TONE[a.category]}`}
              title={a.blurb}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-text">{a.label}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  {a.category}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-snug">{a.blurb}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ─── Grid variant — original card with bordered tiles ────────────────────
  if (earned.length === 0) {
    return (
      <div className="rounded-md border border-line bg-panel p-4">
        <div className="text-xs uppercase tracking-wide text-muted">Achievements</div>
        <p className="text-sm text-muted mt-1">
          None earned yet. Save your first attempt to unlock the first badge.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-panel p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wide text-muted">Achievements</div>
        <div className="text-xs text-muted">
          <span className="text-text font-semibold">{earned.length}</span> of {total} earned
        </div>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {earned.map((a) => (
          <li
            key={a.id}
            className={`rounded-md border p-3 ${CATEGORY_TONE[a.category]}`}
            title={a.blurb}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-text">{a.label}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {a.category}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-snug">{a.blurb}</p>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted italic">
        Stored locally only. No leaderboard, no sharing — these are markers for you.
      </p>
    </div>
  );
}
