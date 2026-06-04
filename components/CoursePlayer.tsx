"use client";

// v3.2 — Course player for /learn/course/[moduleId]. Walks the user through
// each step's Teach → Practice → Test arc. Completion is computed live from
// the journal — taking a passing-scored attempt on the testScenarioId marks
// the step complete and unlocks the next.
//
// Practice and Test launch into /practice via deep link with ?course= and
// ?phase= so the practice page can render a "you're in a course" banner and
// return navigation. The user can always escape back to /learn/course/[id].

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CURRICULUM,
  DEFAULT_PASSING_SCORE,
  isStepComplete,
  nextStepInModule,
  type CurriculumModule,
  type CurriculumStep,
} from "@/lib/curriculum";
import { LEARN_TERMS, type LearnTerm } from "@/lib/learn";
import { getScenarioById } from "@/lib/scenarios";
import { listAttempts } from "@/lib/storage";
import type { Attempt, Scenario } from "@/lib/types";

type Props = { moduleId: string };

type StepView = {
  step: CurriculumStep;
  index: number;
  concept: LearnTerm | null;
  practice: Scenario | null;
  test: Scenario | null;
  practiceAttempts: Attempt[];
  testAttempts: Attempt[];
  bestTestScore: number | null;
  complete: boolean;
};

export default function CoursePlayer({ moduleId }: Props) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const mod = useMemo<CurriculumModule | undefined>(
    () => CURRICULUM.find((m) => m.id === moduleId),
    [moduleId]
  );

  useEffect(() => {
    setAttempts(listAttempts());
  }, []);

  // Map Attempt → AttemptSummary once so the curriculum helpers (which only
  // need scenarioId + score.total) get the shape they expect.
  const attemptSummaries = useMemo(
    () => (attempts ?? []).map((a) => ({ scenarioId: a.scenarioId, score: a.score.total })),
    [attempts]
  );

  const views = useMemo<StepView[]>(() => {
    if (!mod?.steps || attempts == null) return [];
    return mod.steps.map((step, index) => {
      const practiceAttempts = attempts.filter((a) => a.scenarioId === step.practiceScenarioId);
      const testAttempts = attempts.filter((a) => a.scenarioId === step.testScenarioId);
      const bestTestScore =
        testAttempts.length === 0
          ? null
          : Math.max(...testAttempts.map((a) => a.score.total));
      return {
        step,
        index,
        concept: LEARN_TERMS.find((t) => t.id === step.conceptTermId) ?? null,
        practice: getScenarioById(step.practiceScenarioId) ?? null,
        test: getScenarioById(step.testScenarioId) ?? null,
        practiceAttempts,
        testAttempts,
        bestTestScore,
        complete: isStepComplete(step, attemptSummaries),
      };
    });
  }, [mod, attempts, attemptSummaries]);

  const currentStep = useMemo(
    () => (mod && attempts ? nextStepInModule(mod, attemptSummaries) : null),
    [mod, attempts, attemptSummaries]
  );

  if (!mod || !mod.steps) {
    return <div className="text-muted text-sm">Module not found.</div>;
  }
  if (attempts == null) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  const completedCount = views.filter((v) => v.complete).length;
  const totalCount = views.length;
  const allDone = completedCount >= totalCount;

  return (
    <div className="space-y-5">
      <CourseProgressBar completed={completedCount} total={totalCount} allDone={allDone} />

      {allDone && (
        <div className="rounded-md border-2 border-good/50 bg-good/5 p-4 text-sm">
          <div className="text-xs uppercase tracking-wider text-good">Course complete</div>
          <p className="mt-1">
            You passed every test in <span className="font-semibold">{mod.title}</span>. Open another module from the path, or revisit any step below to push the scores higher.
          </p>
        </div>
      )}

      <ol className="space-y-4 list-none">
        {views.map((v) => (
          <li key={v.step.id}>
            <StepCard view={v} moduleId={moduleId} isCurrent={!allDone && v.step.id === currentStep?.id} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function CourseProgressBar({
  completed,
  total,
  allDone,
}: {
  completed: number;
  total: number;
  allDone: boolean;
}) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-muted">Course progress</span>
        <span className="text-xs">
          <span className={`font-semibold ${allDone ? "text-good" : "text-text"}`}>
            {completed}/{total}
          </span>
          <span className="text-muted"> steps complete</span>
        </span>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div
          className={`h-full ${allDone ? "bg-good" : "bg-accent"} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StepCard({
  view,
  moduleId,
  isCurrent,
}: {
  view: StepView;
  moduleId: string;
  isCurrent: boolean;
}) {
  const { step, index, concept, practice, test, complete, practiceAttempts, bestTestScore } = view;
  const passingScore = step.passingScore ?? DEFAULT_PASSING_SCORE;
  const headerClass = complete
    ? "border-good/40 bg-good/5"
    : isCurrent
    ? "border-accent/50 bg-accent/5"
    : "border-line bg-panel opacity-80";

  return (
    <div className={`rounded-md border ${headerClass} transition-all p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <StepBadge index={index} complete={complete} isCurrent={isCurrent} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted">
              Step {index + 1}
            </div>
            <h2 className="text-lg font-bold mt-0.5">{concept?.term ?? step.conceptTermId}</h2>
          </div>
        </div>
        {complete && bestTestScore != null && (
          <span className="shrink-0 text-xs font-mono text-good">
            Best test {bestTestScore}/100
          </span>
        )}
      </div>

      {/* TEACH phase. Surfaced inline so the user doesn't have to bounce to a
          term detail page — keeps the course feel cohesive. The full Learn
          term page is one click away if they want examples + quiz. */}
      {concept && (
        <section className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted">Teach</div>
          <p className="text-sm leading-relaxed">{concept.simpleDefinition}</p>
          <p className="text-sm text-muted leading-relaxed">{concept.whyItMatters}</p>
          <Link
            href={`/learn?term=${concept.id}`}
            className="inline-block text-xs text-accent hover:underline"
          >
            Open full lesson →
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* PRACTICE phase */}
        <div className="rounded-md border border-line bg-panel p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-muted">Practice</span>
            <span className="text-[10px] text-muted">
              {practiceAttempts.length > 0
                ? `${practiceAttempts.length} attempt${practiceAttempts.length === 1 ? "" : "s"}`
                : "Not started"}
            </span>
          </div>
          <p className="text-xs text-muted leading-snug">
            {practice ? practice.title : "Scenario unavailable."}
          </p>
          {practice && (
            <Link
              href={`/practice?scenarioId=${practice.id}&course=${moduleId}&phase=practice&step=${step.id}`}
              className="inline-block text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
            >
              {practiceAttempts.length > 0 ? "Practice again →" : "Start practice →"}
            </Link>
          )}
        </div>

        {/* TEST phase */}
        <div className="rounded-md border border-line bg-panel p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-muted">Test</span>
            <span className="text-[10px] text-muted">
              Pass at {passingScore}+
            </span>
          </div>
          <p className="text-xs text-muted leading-snug">
            {test ? test.title : "Scenario unavailable."}
          </p>
          {test && (
            <Link
              href={`/practice?scenarioId=${test.id}&course=${moduleId}&phase=test&step=${step.id}`}
              className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-md ${
                complete
                  ? "bg-good text-bg hover:opacity-90"
                  : "bg-accent text-white hover:opacity-90"
              }`}
            >
              {complete ? "Retake test →" : "Take test →"}
            </Link>
          )}
          {bestTestScore != null && !complete && (
            <div className="text-[10px] text-warn">
              Best so far: {bestTestScore}/100 — needs {passingScore} to pass.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBadge({
  index,
  complete,
  isCurrent,
}: {
  index: number;
  complete: boolean;
  isCurrent: boolean;
}) {
  if (complete) {
    return (
      <span
        className="shrink-0 w-7 h-7 rounded-full bg-good text-bg flex items-center justify-center text-sm font-bold"
        title="Step complete"
      >
        ✓
      </span>
    );
  }
  if (isCurrent) {
    return (
      <span
        className="shrink-0 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold"
        title="Current step"
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span
      className="shrink-0 w-7 h-7 rounded-full border border-line bg-panel2 text-muted flex items-center justify-center text-sm font-semibold"
      title="Upcoming step"
    >
      {index + 1}
    </span>
  );
}
