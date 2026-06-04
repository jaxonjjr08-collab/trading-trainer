"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// v3.2 — banner shown when the user arrived from /learn/course/[moduleId].
// Tells them which step they're on, whether this is the practice or test
// phase, and how to return. Detects "test passed" live by checking the
// session attempts against the step's passingScore.

import Link from "next/link";
import { useEffect, useState } from "react";
import { CURRICULUM, DEFAULT_PASSING_SCORE } from "@/lib/curriculum";
import { listAttempts } from "@/lib/storage";

export default function CourseBanner({
  courseId,
  phase,
  stepId,
  scenarioId,
  sessionTrigger,
}: {
  courseId: string | null;
  phase: string | null;
  stepId: string | null;
  scenarioId: string;
  sessionTrigger: number;
}) {
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const attempts = listAttempts().filter((a) => a.scenarioId === scenarioId);
    setBestScore(
      attempts.length === 0 ? null : Math.max(...attempts.map((a) => a.score.total))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, scenarioId, sessionTrigger]);

  if (!courseId) return null;

  const mod = CURRICULUM.find((m) => m.id === courseId);
  const step = mod?.steps?.find((s) => s.id === stepId);
  if (!mod) return null;

  const passingScore = step?.passingScore ?? DEFAULT_PASSING_SCORE;
  const isTest = phase === "test";
  const passed = isTest && bestScore != null && bestScore >= passingScore;

  return (
    <div
      className={`rounded-md border p-3 flex items-center justify-between gap-3 ${
        passed
          ? "border-good/40 bg-good/5"
          : "border-accent/40 bg-accent/5"
      }`}
    >
      <div className="min-w-0">
        <div className={`text-[10px] uppercase tracking-wider ${passed ? "text-good" : "text-accent"}`}>
          Course{isTest ? " · test" : phase === "practice" ? " · practice" : ""}
        </div>
        <div className="text-sm font-semibold mt-0.5 truncate">
          {mod.title}
          {step && (
            <>
              <span className="text-muted font-normal mx-1.5">·</span>
              <span className="text-muted font-normal">Step {(mod.steps!.findIndex((s) => s.id === step.id)) + 1}</span>
            </>
          )}
        </div>
        {isTest && (
          <div className="text-[10px] text-muted mt-0.5">
            {passed
              ? `Passed — best ${bestScore}/100.`
              : bestScore != null
              ? `Best so far ${bestScore}/100. Pass at ${passingScore}+.`
              : `Pass this scenario at ${passingScore}+ to mark the step complete.`}
          </div>
        )}
      </div>
      <Link
        href={`/learn/course/${courseId}`}
        className="shrink-0 text-xs font-semibold border border-line bg-panel px-3 py-1.5 rounded-md hover:bg-panel2"
      >
        ← Back to course
      </Link>
    </div>
  );
}
