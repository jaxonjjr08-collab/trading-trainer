"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Diagnostic from "./Diagnostic";
import {
  getActiveDrill,
  getDiagnostic,
  listAttempts,
  masteryFor,
  type ActiveDrill,
} from "@/lib/storage";
import {
  DIAGNOSTIC_QUESTIONS,
  PROFILE_BLURB,
  PROFILE_LABEL,
  isCorrect as isPickCorrect,
  type DiagnosticResult,
} from "@/lib/diagnostic";
import {
  computeSkillScores,
  SKILL_BY_ID,
  weakestSkill,
  type SkillScore,
} from "@/lib/skills";
import { drillById, drillForSkill, type DrillSet } from "@/lib/drills";
import { focusForTerm, termById } from "@/lib/learn";
import { quizFor } from "@/lib/learn-quizzes";
import type { Attempt } from "@/lib/types";

export default function TrainingPath() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeDrill, setActiveDrillState] = useState<ActiveDrill | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDiagnostic(getDiagnostic());
    setAttempts(listAttempts());
    setActiveDrillState(getActiveDrill());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  if (!diagnostic) {
    return (
      <Diagnostic
        onComplete={(r) => {
          setDiagnostic(r);
          setActiveDrillState(getActiveDrill());
        }}
      />
    );
  }

  const skillScores = computeSkillScores(attempts);
  // Prefer measured weakness once data exists; fall back to the diagnostic's bias.
  const measuredWeak = weakestSkill(skillScores);
  const weakSkillId = measuredWeak?.id ?? diagnostic.weakSkill;
  const weakSkill = SKILL_BY_ID[weakSkillId];
  const weakSkillScore: SkillScore | undefined = skillScores.find((s) => s.id === weakSkillId);

  const recommendedTerm = termById(weakSkill.termId);
  const recommendedFocus = recommendedTerm ? focusForTerm(recommendedTerm.id) : null;
  const recommendedDrill: DrillSet | null =
    (activeDrill && drillById(activeDrill.drillId)) ?? drillForSkill(weakSkillId);

  const recommendedQuizExists = recommendedTerm ? quizFor(recommendedTerm.id) != null : false;
  const recommendedTermMastery = recommendedTerm ? masteryFor(recommendedTerm.id) : "not_started";

  // Next assignment: lesson → quiz → drill, in that order, skipping completed steps.
  const nextAssignment = chooseNextAssignment({
    termId: recommendedTerm?.id ?? null,
    quizExists: recommendedQuizExists,
    quizMastery: recommendedTermMastery,
    drill: recommendedDrill,
    activeDrill,
    focus: recommendedFocus,
  });

  // Show the refresh prompt when the user has done meaningful practice since their last
  // diagnostic. Old diagnostics (pre-v1.7) lack the stamp, so they default to 0 — any
  // user with 50+ attempts on an old diagnostic gets nudged to take the new 8-question
  // version.
  const sinceDiagnostic = attempts.length - (diagnostic.attemptCountAtDiagnostic ?? 0);
  const shouldPromptRefresh = sinceDiagnostic >= 50;

  function retake() {
    // v2.4 — do NOT call clearDiagnostic. The existing result needs to remain
    // in storage so saveDiagnostic can chain it as `previous` on the next save.
    // The Diagnostic UI re-renders by setting local state to null; the new
    // result will overwrite the storage key with the previous one nested inside.
    setDiagnostic(null);
  }

  return (
    <div className="space-y-5">
      {shouldPromptRefresh && (
        <RefreshPrompt
          attemptsSince={sinceDiagnostic}
          onRetake={retake}
        />
      )}

      <ProfileHeader diagnostic={diagnostic} onRetake={retake} />

      {/* v2.4 — Before/Now comparison when the user has retaken the diagnostic.
          Shows concrete skill growth — which questions they got right then vs
          now — instead of an abstract delta. */}
      {diagnostic.previous && (
        <DiagnosticCompare current={diagnostic} previous={diagnostic.previous} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Tile label="Weakest skill" tone="bad">
          <div className="text-base font-semibold">{weakSkill.label}</div>
          <div className="text-xs text-muted mt-1">
            {weakSkillScore?.hasData
              ? `${weakSkillScore.score}% over ${weakSkillScore.attempts} signals`
              : "From diagnostic — refresh after a few practice attempts."}
          </div>
        </Tile>

        <Tile label="Recommended lesson" tone="accent">
          {recommendedTerm ? (
            <>
              <div className="text-base font-semibold">{recommendedTerm.term}</div>
              <Link
                href={`/learn?term=${recommendedTerm.id}`}
                className="text-xs text-accent hover:underline mt-1 inline-block"
              >
                Open lesson →
              </Link>
            </>
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </Tile>

        <Tile label="Recommended quiz" tone="accent">
          {recommendedQuizExists && recommendedTerm ? (
            <>
              <div className="text-base font-semibold">{recommendedTerm.term} quiz</div>
              <Link
                href={`/learn?term=${recommendedTerm.id}#quiz`}
                className="text-xs text-accent hover:underline mt-1 inline-block"
              >
                Take quiz →
              </Link>
            </>
          ) : (
            <span className="text-sm text-muted">No quiz for this term.</span>
          )}
        </Tile>
      </div>

      <DrillCard drill={recommendedDrill} activeDrill={activeDrill} />

      <NextAssignmentCard assignment={nextAssignment} />
    </div>
  );
}

function RefreshPrompt({
  attemptsSince,
  onRetake,
}: {
  attemptsSince: number;
  onRetake: () => void;
}) {
  return (
    <div className="rounded-md border border-warn/40 bg-warn/5 p-3 flex items-center justify-between gap-3 text-sm">
      <div>
        <span className="font-semibold text-warn">Time to re-diagnose.</span>{" "}
        <span className="text-text">
          You've logged {attemptsSince} attempts since your last diagnostic.
        </span>{" "}
        <span className="text-muted">
          Re-take to refresh your profile and weakest skill.
        </span>
      </div>
      <button
        type="button"
        onClick={onRetake}
        className="shrink-0 text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
      >
        Retake diagnostic →
      </button>
    </div>
  );
}

// v2.4 — Before/Now diagnostic comparison. Shown only when the user has
// retaken the diagnostic (so `previous` is populated). Gives concrete
// proof of skill growth — which questions flipped from wrong to right —
// instead of an abstract score delta.
function DiagnosticCompare({
  current,
  previous,
}: {
  current: DiagnosticResult;
  previous: DiagnosticResult;
}) {
  const currentScore = current.picks.reduce<number>(
    (n, p, i) => (isPickCorrect(i, p) ? n + 1 : n),
    0
  );
  const previousScore = previous.picks.reduce<number>(
    (n, p, i) => (isPickCorrect(i, p) ? n + 1 : n),
    0
  );
  const delta = currentScore - previousScore;
  const flips = DIAGNOSTIC_QUESTIONS.map((q, i) => ({
    title: q.title,
    wasRight: isPickCorrect(i, previous.picks[i]),
    nowRight: isPickCorrect(i, current.picks[i]),
  }));
  const fixedCount = flips.filter((f) => !f.wasRight && f.nowRight).length;
  const regressedCount = flips.filter((f) => f.wasRight && !f.nowRight).length;

  return (
    <div className="rounded-md border border-good/40 bg-good/5 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-good">Before / Now</div>
          <p className="text-sm mt-1">
            Previous diagnostic{" "}
            <span className="text-muted">{new Date(previous.completedAt).toLocaleDateString()}</span>
            : <span className="font-mono font-semibold">{previousScore}/8</span>. Today:{" "}
            <span className="font-mono font-semibold">{currentScore}/8</span>{" "}
            {delta !== 0 && (
              <span
                className={
                  delta > 0 ? "text-good font-semibold" : "text-bad font-semibold"
                }
              >
                ({delta > 0 ? "+" : ""}{delta})
              </span>
            )}
            .
          </p>
        </div>
      </div>

      <ul className="space-y-1 text-xs">
        {flips.map((f, i) => {
          const tone =
            !f.wasRight && f.nowRight
              ? "text-good"
              : f.wasRight && !f.nowRight
              ? "text-bad"
              : "text-muted";
          const icon =
            !f.wasRight && f.nowRight
              ? "↑"
              : f.wasRight && !f.nowRight
              ? "↓"
              : f.nowRight
              ? "✓"
              : "·";
          const label =
            !f.wasRight && f.nowRight
              ? "Fixed"
              : f.wasRight && !f.nowRight
              ? "Lost"
              : f.nowRight
              ? "Steady"
              : "Still missing";
          return (
            <li key={i} className="flex items-center gap-2">
              <span className={`w-4 text-center font-mono ${tone}`}>{icon}</span>
              <span className="flex-1">{f.title}</span>
              <span className={`text-[10px] uppercase tracking-wider ${tone}`}>{label}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted leading-snug">
        {fixedCount > 0 && `${fixedCount} question${fixedCount === 1 ? "" : "s"} you got right today were wrong before — that's the growth. `}
        {regressedCount > 0 && `${regressedCount} regressed — worth a careful re-read of the Learn term. `}
        {fixedCount === 0 && regressedCount === 0 && "Nothing flipped. The pattern of what you know and don't know is stable; keep practicing the weak spots."}
      </p>
    </div>
  );
}

function ProfileHeader({
  diagnostic,
  onRetake,
}: {
  diagnostic: DiagnosticResult;
  onRetake: () => void;
}) {
  return (
    <div className="rounded-md border border-accent/40 bg-accent/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-accent">Your profile</div>
          <div className="text-2xl font-bold mt-1">
            {PROFILE_LABEL[diagnostic.profile]}
          </div>
          <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
            {PROFILE_BLURB[diagnostic.profile]}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetake}
          className="text-xs text-muted hover:text-text border border-line bg-panel px-3 py-1.5 rounded-md"
        >
          Retake diagnostic
        </button>
      </div>
    </div>
  );
}

function DrillCard({
  drill,
  activeDrill,
}: {
  drill: DrillSet | null;
  activeDrill: ActiveDrill | null;
}) {
  if (!drill) {
    return (
      <div className="rounded-md border border-line bg-panel p-4 text-sm text-muted">
        No drill recommended yet — complete a few practice attempts to unlock targeted drills.
      </div>
    );
  }
  const isActive = activeDrill && activeDrill.drillId === drill.id;
  const done = isActive ? activeDrill.completed : 0;
  return (
    <div className="rounded-md border border-warn/40 bg-warn/5 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-warn">Recommended drill</div>
          <div className="text-lg font-bold mt-1">{drill.title}</div>
          <p className="text-sm text-muted mt-1 max-w-2xl">{drill.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted">Progress</div>
          <div className="text-base font-bold">
            {done}<span className="text-muted text-sm">/{drill.targetAttempts}</span>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div
          className={`h-full ${done >= drill.targetAttempts ? "bg-good" : "bg-warn"}`}
          style={{ width: `${Math.min(100, (done / drill.targetAttempts) * 100)}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/practice?drill=${drill.id}`}
          className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
        >
          {isActive ? "Continue drill →" : "Start drill →"}
        </Link>
        <Link
          href="/practice?skill="
          className="text-xs font-semibold border border-line bg-panel text-text px-3 py-1.5 rounded-md hover:bg-panel2"
        >
          Free practice
        </Link>
      </div>
    </div>
  );
}

type NextAssignment =
  | { kind: "lesson"; href: string; label: string; rationale: string }
  | { kind: "quiz"; href: string; label: string; rationale: string }
  | { kind: "drill"; href: string; label: string; rationale: string }
  | { kind: "none"; rationale: string };

function chooseNextAssignment(args: {
  termId: string | null;
  quizExists: boolean;
  quizMastery: string;
  drill: DrillSet | null;
  activeDrill: ActiveDrill | null;
  focus: string | null;
}): NextAssignment {
  // Step 1: read the lesson (always first if a term is recommended).
  if (args.termId) {
    // If a drill is active and incomplete, switch order: drill is the priority.
    const drillActive =
      args.activeDrill && args.drill && args.activeDrill.drillId === args.drill.id;
    const drillDone = drillActive
      ? args.activeDrill!.completed >= args.drill!.targetAttempts
      : false;
    if (drillActive && !drillDone && args.drill) {
      return {
        kind: "drill",
        href: `/practice?drill=${args.drill.id}`,
        label: `Continue drill: ${args.drill.title}`,
        rationale: `You've completed ${args.activeDrill!.completed}/${args.drill.targetAttempts}. Finish the drill before switching.`,
      };
    }

    // Otherwise: lesson first, then quiz, then drill.
    if (args.quizExists && args.quizMastery !== "strong") {
      // Lesson and quiz combined — push the lesson if mastery is not_started,
      // push the quiz if the user has at least seen the lesson before.
      if (args.quizMastery === "not_started") {
        return {
          kind: "lesson",
          href: `/learn?term=${args.termId}`,
          label: "Read the recommended lesson",
          rationale: "Start with the concept before the quiz.",
        };
      }
      return {
        kind: "quiz",
        href: `/learn?term=${args.termId}#quiz`,
        label: "Take the recommended quiz",
        rationale: `Current mastery: ${args.quizMastery.replace("_", " ")}. Push it to Strong.`,
      };
    }

    if (args.drill) {
      return {
        kind: "drill",
        href: `/practice?drill=${args.drill.id}`,
        label: `Start drill: ${args.drill.title}`,
        rationale: `Apply the concept across ${args.drill.targetAttempts} scenarios.`,
      };
    }

    return {
      kind: "lesson",
      href: `/learn?term=${args.termId}`,
      label: "Read the recommended lesson",
      rationale: "Refresh the concept linked to your weakest skill.",
    };
  }
  return {
    kind: "none",
    rationale: "Take a few practice attempts to unlock targeted assignments.",
  };
}

function NextAssignmentCard({ assignment }: { assignment: NextAssignment }) {
  return (
    <div className="rounded-md border border-good/40 bg-good/5 p-5 flex items-center justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-good">Next assignment</div>
        {assignment.kind === "none" ? (
          <div className="text-sm text-muted mt-1">{assignment.rationale}</div>
        ) : (
          <>
            <div className="text-base font-semibold mt-1">{assignment.label}</div>
            <p className="text-xs text-muted mt-1">{assignment.rationale}</p>
          </>
        )}
      </div>
      {assignment.kind !== "none" && (
        <Link
          href={assignment.href}
          className="shrink-0 text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
        >
          Start →
        </Link>
      )}
    </div>
  );
}

function Tile({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "good" | "bad" | "accent" | "warn";
  children: React.ReactNode;
}) {
  const border =
    tone === "good"
      ? "border-good/40 bg-good/5"
      : tone === "bad"
      ? "border-bad/40 bg-bad/5"
      : tone === "warn"
      ? "border-warn/40 bg-warn/5"
      : "border-accent/40 bg-accent/5";
  const text =
    tone === "good"
      ? "text-good"
      : tone === "bad"
      ? "text-bad"
      : tone === "warn"
      ? "text-warn"
      : "text-accent";
  return (
    <div className={`rounded-md border ${border} p-4`}>
      <div className={`text-xs uppercase tracking-wide ${text}`}>{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
