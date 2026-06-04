"use client";

// v2.9 — Drill completion summary. Shown above the chart on the Practice
// page once activeDrill.completed >= drill.targetAttempts. Surfaces the
// before/after skill delta for the drill's focus area, plus CTAs for what to
// do next (clear drill / pick a new drill / continue free practice).
//
// "Before" = skill score over attempts saved BEFORE the drill started.
// "After"  = skill score over attempts saved DURING the drill.

import Link from "next/link";
import { useMemo } from "react";
import type { Attempt } from "@/lib/types";
import type { ActiveDrill } from "@/lib/storage";
import type { DrillSet } from "@/lib/drills";
import { SKILL_BY_ID, computeSkillScores } from "@/lib/skills";

type Props = {
  drill: DrillSet;
  activeDrill: ActiveDrill;
  attempts: Attempt[];
  onClear: () => void;
};

export default function DrillCompletion({ drill, activeDrill, attempts, onClear }: Props) {
  const skill = SKILL_BY_ID[drill.skillFocus];

  const { during, before, deltaScore, deltaAttempts } = useMemo(() => {
    const startedAt = activeDrill.startedAt;
    const duringAttempts = attempts.filter((a) => a.createdAt >= startedAt);
    const beforeAttempts = attempts.filter((a) => a.createdAt < startedAt);
    const beforeSkill = computeSkillScores(beforeAttempts).find((s) => s.id === drill.skillFocus);
    const duringSkill = computeSkillScores(duringAttempts).find((s) => s.id === drill.skillFocus);
    // Bug fix: previously referenced `before` from the destructuring target,
    // which TS couldn't type-check (circular ref). Use the local beforeSkill
    // instead — that's the value we just computed in the same closure.
    const delta =
      beforeSkill && beforeSkill.hasData && duringSkill && duringSkill.hasData
        ? duringSkill.score - beforeSkill.score
        : null;
    return {
      during: duringSkill,
      before: beforeSkill,
      deltaScore: delta,
      deltaAttempts: duringAttempts.length,
    };
  }, [activeDrill.startedAt, attempts, drill.skillFocus]);

  const duringAvg =
    deltaAttempts > 0
      ? Math.round(
          attempts
            .filter((a) => a.createdAt >= activeDrill.startedAt)
            .reduce((s, a) => s + a.score.total, 0) / deltaAttempts
        )
      : null;

  const deltaTone =
    deltaScore == null
      ? "text-muted"
      : deltaScore > 0
      ? "text-good"
      : deltaScore < 0
      ? "text-bad"
      : "text-muted";

  return (
    <div className="rounded-md border-2 border-good/50 bg-good/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-good">Drill complete</div>
          <h2 className="text-xl font-bold mt-1">
            {drill.title} — {activeDrill.completed} / {drill.targetAttempts} done
          </h2>
          <p className="text-sm text-muted mt-1 max-w-2xl leading-snug">
            Focus skill: <span className="text-text font-semibold">{skill.label}</span>. The numbers below compare attempts during this drill to everything before it.
          </p>
        </div>
        <span
          className="shrink-0 w-10 h-10 rounded-full bg-good text-bg flex items-center justify-center text-lg font-bold"
          aria-hidden
        >
          ✓
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Attempts in drill</div>
          <div className="text-2xl font-bold font-mono tab-nums mt-0.5">{deltaAttempts}</div>
        </div>
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Drill avg score</div>
          <div className="text-2xl font-bold font-mono tab-nums mt-0.5">
            {duringAvg ?? "—"}
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">{skill.label} delta</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tab-nums ${deltaTone}`}>
              {deltaScore == null
                ? "—"
                : deltaScore > 0
                ? `+${deltaScore}`
                : `${deltaScore}`}
            </span>
            {before?.hasData && during?.hasData && (
              <span className="text-xs text-muted font-mono">
                {before.score} → {during.score}
              </span>
            )}
          </div>
          {(!before?.hasData || !during?.hasData) && (
            <div className="text-[10px] text-muted mt-1">
              Not enough data on both sides to compare.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
        >
          Mark drill complete →
        </button>
        <Link
          href="/training"
          className="text-xs font-semibold border border-line bg-panel text-text px-3 py-1.5 rounded-md hover:bg-panel2"
        >
          Pick a new drill
        </Link>
        <Link
          href="/practice"
          className="text-xs font-semibold border border-line bg-panel text-text px-3 py-1.5 rounded-md hover:bg-panel2"
        >
          Continue free practice
        </Link>
      </div>
    </div>
  );
}
