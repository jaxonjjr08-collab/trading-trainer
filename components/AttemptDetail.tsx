"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  appendAttemptAnnotation,
  listAttempts,
  deleteAttempt as deleteAttemptFromStorage,
  updateAttempt,
} from "@/lib/storage";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import { getScenarioById, SETUP_TYPE_LABELS } from "@/lib/scenarios";
import { recommendLesson } from "@/lib/lessons";
import { pickPrincipleForScore } from "@/lib/principles";
import {
  primaryMistakeTag,
  primaryTermForTags,
  SEVERITY_CLASS,
  tagSeverity,
  termById,
  termForTag,
} from "@/lib/learn";
import { scenarioMeta } from "@/lib/scenario-meta";
import LessonCard from "./LessonCard";
import ReviewHeadline from "./ReviewHeadline";
import AIReviewCard from "./AIReviewCard";
import AICoachChat from "./AICoachChat";
import WhatIfSandbox from "./WhatIfSandbox";
import ReplayScrubber from "./ReplayScrubber";
import { useRouter } from "next/navigation";
import type { Attempt } from "@/lib/types";

type Props = { attemptId: string };

export default function AttemptDetail({ attemptId }: Props) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const all = listAttempts();
    setAttempt(all.find((a) => a.id === attemptId) ?? null);
    setHydrated(true);
  }, [attemptId]);

  if (!hydrated) return <div className="text-muted text-sm">Loading…</div>;

  if (!attempt) {
    return (
      <div className="rounded-md border border-line bg-panel p-6">
        <p className="text-sm text-muted">
          Attempt not found. It may have been deleted or this link is from another browser.
        </p>
        <Link
          href="/journal"
          className="inline-block mt-3 text-xs text-accent hover:underline"
        >
          ← Back to journal
        </Link>
      </div>
    );
  }

  const scenario = getScenarioById(attempt.scenarioId);
  const meta = scenario ? scenarioMeta(scenario) : null;
  const rr =
    attempt.decision.entry != null &&
    attempt.decision.stopLoss != null &&
    attempt.decision.takeProfit != null
      ? (() => {
          const risk = Math.abs(attempt.decision.entry! - attempt.decision.stopLoss!);
          const reward = Math.abs(attempt.decision.takeProfit! - attempt.decision.entry!);
          return risk > 0 ? (reward / risk).toFixed(2) : "—";
        })()
      : "—";

  const recommendedLesson = recommendLesson(attempt.score);
  const recommendedTerm = primaryTermForTags(attempt.score.tags);
  const recommendedTag = primaryMistakeTag(attempt.score.tags);
  const principle = pickPrincipleForScore(attempt.score);

  function handleDelete() {
    if (!confirm("Delete this attempt? This cannot be undone.")) return;
    deleteAttemptFromStorage(attemptId);
    router.push("/journal");
  }

  const retryHref = scenario
    ? `/practice?scenarioId=${scenario.id}`
    : "/practice";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to journal
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/journal/compare?left=${attempt.id}`}
            className="text-xs font-semibold border border-line bg-panel text-text px-3 py-1.5 rounded-md hover:bg-panel2"
          >
            Compare →
          </Link>
          <Link
            href={retryHref}
            className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
          >
            Retry similar scenario →
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-bad hover:underline"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Top card: title + meta only. Score moves into ReviewHeadline below
          so the user reads the headline first, not the raw number. */}
      <div className="rounded-md border border-line bg-panel p-5">
        <h2 className="text-xl font-bold">
          {scenario?.title ?? attempt.scenarioId}
        </h2>
        <p className="text-xs text-muted mt-1">
          {new Date(attempt.createdAt).toLocaleString()}
          {attempt.scoringVersion && (
            <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">
              scoring v{attempt.scoringVersion}
            </span>
          )}
        </p>
        {scenario && meta && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-3">
            <span>
              <span className="text-text">Category:</span> {meta.categoryLabel}
            </span>
            <span>
              <span className="text-text">Difficulty:</span> {meta.difficultyLabel}
            </span>
            <span>
              <span className="text-text">Setup:</span>{" "}
              {SETUP_TYPE_LABELS[scenario.setupType]}
            </span>
            <span>
              <span className="text-text">Symbol:</span> {scenario.symbol}
            </span>
            <span>
              <span className="text-text">Timeframe:</span> {scenario.timeframe}
            </span>
          </div>
        )}
      </div>

      {/* v2.1 Phase 1 — single-sentence headline. AttemptDetail keeps the full
          wall of sections below (it's the deep-dive view); we don't collapse
          here, just anchor attention at the top with the same headline as
          Practice uses post-submit. */}
      <ReviewHeadline score={attempt.score} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Decision">
          <Row label="Direction" value={attempt.decision.direction.toUpperCase()} />
          {attempt.decision.direction !== "wait" && (
            <>
              <Row label="Entry" value={attempt.decision.entry?.toLocaleString()} />
              <Row label="Stop loss" value={attempt.decision.stopLoss?.toLocaleString()} />
              <Row label="Take profit" value={attempt.decision.takeProfit?.toLocaleString()} />
              <Row
                label="Leverage"
                value={
                  attempt.decision.leverage != null ? `${attempt.decision.leverage}×` : undefined
                }
              />
              <Row
                label="Risk %"
                value={
                  attempt.decision.riskPercent != null
                    ? `${attempt.decision.riskPercent}%`
                    : undefined
                }
              />
              <Row label="R:R" value={rr} />
            </>
          )}
          <Row
            label="Outcome"
            value={
              attempt.outcome.hit === "neither"
                ? "No exit"
                : attempt.outcome.hit.toUpperCase()
            }
          />
          {attempt.decision.direction !== "wait" && (
            <Row
              label="PnL %"
              value={`${attempt.outcome.pnlPercent >= 0 ? "+" : ""}${attempt.outcome.pnlPercent.toFixed(2)}%`}
            />
          )}
        </Section>

        <Section title="Score breakdown">
          <div className="space-y-1">
            {attempt.score.breakdown.map((b) => {
              const p = b.points / b.max;
              return (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <div className="w-32 shrink-0 text-muted">{b.label}</div>
                  <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        p >= 0.8 ? "bg-good" : p >= 0.5 ? "bg-warn" : "bg-bad"
                      }`}
                      style={{ width: `${Math.max(0, p) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-right font-mono">
                    {b.points}/{b.max}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <ReplayScrubber
        snapshot={attempt.scenarioSnapshot}
        liveVisible={scenario?.visibleCandles}
        liveHidden={scenario?.hiddenCandles}
        liveKeyLevels={scenario?.keyLevels}
        decision={attempt.decision}
        estimatedLiquidationPrice={attempt.outcome.estimatedLiquidationPrice}
      />

      {scenario && (
        <WhatIfSandbox
          scenario={scenario}
          decision={attempt.decision}
          originalScore={attempt.score}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Thesis">
          <p className="text-sm whitespace-pre-wrap">
            {attempt.decision.thesis || <span className="text-muted">—</span>}
          </p>
        </Section>
        <Section title="Invalidation">
          <p className="text-sm whitespace-pre-wrap">
            {attempt.decision.invalidation || <span className="text-muted">—</span>}
          </p>
        </Section>
      </div>

      {/* v2.0 — trade management decisions, if any were made */}
      {attempt.managementDecisions && attempt.managementDecisions.length > 0 && scenario?.managementPoints && (
        <Section title="Trade management">
          <ul className="space-y-2 text-sm">
            {scenario.managementPoints.map((point, i) => {
              const d = attempt.managementDecisions!.find((x) => x.candleIndex === point.candleIndex);
              if (!d) return null;
              const matched = d.action === point.idealAction;
              const acceptable = !matched && point.acceptableActions?.includes(d.action);
              const toneClass = matched
                ? "border-good/40 bg-good/5"
                : acceptable
                ? "border-warn/40 bg-warn/5"
                : "border-bad/40 bg-bad/5";
              const verdict = matched
                ? "Matched ideal play"
                : acceptable
                ? "Defensible alternative"
                : "Suboptimal";
              const verdictClass = matched
                ? "text-good"
                : acceptable
                ? "text-warn"
                : "text-bad";
              return (
                <li key={point.candleIndex} className={`rounded-md border ${toneClass} p-3 space-y-1`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs uppercase tracking-wide text-muted">
                      Point {i + 1}
                    </span>
                    <span className={`text-xs font-semibold ${verdictClass}`}>{verdict}</span>
                  </div>
                  <div className="text-sm">{point.prompt}</div>
                  <div className="text-xs text-muted">
                    You chose: <span className="text-text font-mono">{d.action}</span>
                    {!matched && (
                      <> · Ideal: <span className="text-text font-mono">{point.idealAction}</span></>
                    )}
                  </div>
                  <div className="text-xs leading-snug text-muted">{point.rationale}</div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {attempt.score.tags.length > 0 && (
        <Section title="Mistake tags">
          <div className="flex flex-wrap gap-2">
            {attempt.score.tags.map((t) => {
              const info = MISTAKE_TAGS[t];
              const learn = termForTag(t);
              const sevClass = info.positive
                ? "border border-good/40 bg-good/10 text-good"
                : SEVERITY_CLASS[tagSeverity(t)];
              return (
                <span
                  key={t}
                  className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md ${sevClass}`}
                >
                  <span title={info.description}>{info.label}</span>
                  {learn && (
                    <Link
                      href={`/learn?term=${learn.id}`}
                      className="text-xs uppercase tracking-wider underline opacity-70 hover:opacity-100"
                    >
                      Learn this
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attempt.score.strengths.length > 0 && (
          <Section title="What went right" tone="good">
            <ul className="text-sm space-y-1">
              {attempt.score.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-good">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {attempt.score.weaknesses.length > 0 && (
          <Section title="What to improve" tone="bad">
            <ul className="text-sm space-y-1">
              {attempt.score.weaknesses.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-bad">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {scenario && (
        <Section title="What actually happened">
          <p className="text-sm">{scenario.outcome.description}</p>
          <p className="text-xs text-muted leading-snug mt-2">
            {scenario.outcome.takeaway}
          </p>
        </Section>
      )}

      <LessonCard
        lesson={recommendedLesson}
        term={recommendedTerm}
        primaryTag={recommendedTag}
      />

      {/* v2.5 — AI review + chat, mirrored from the Practice page so cached
          content shows on journal revisit and new threads can start from
          here. Both self-hide when AI is disabled. */}
      {scenario && (
        <>
          <AIReviewCard attempt={attempt} scenario={scenario} />
          <AICoachChat attempt={attempt} scenario={scenario} />
        </>
      )}

      <ReflectionEditor attemptId={attempt.id} initial={attempt.reflection ?? ""} />

      <AnnotationsPanel
        attemptId={attempt.id}
        annotations={attempt.annotations ?? []}
        onChange={(updated) => setAttempt({ ...attempt, annotations: updated })}
      />

      {meta && meta.lessonLinks.length > 0 && (
        <Section title="Related Learn terms">
          <div className="flex flex-wrap gap-2">
            {meta.lessonLinks.map((id) => {
              const t = termById(id);
              if (!t) return null;
              return (
                <Link
                  key={id}
                  href={`/learn?term=${t.id}`}
                  className="text-xs px-3 py-1.5 rounded-md border border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
                >
                  {t.term}
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {principle && (
        <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
          <div className="text-xs uppercase tracking-wide text-accent mb-1">
            Why this matters
          </div>
          <div className="text-sm font-semibold mb-1">{principle.title}</div>
          <p className="text-xs text-muted leading-snug">{principle.body}</p>
        </div>
      )}
    </div>
  );
}

function ReflectionEditor({
  attemptId,
  initial,
}: {
  attemptId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    // No persistence on first render — only when the user edits.
    if (value === initial) return;
    setStatus("saving");
    const handle = setTimeout(() => {
      updateAttempt(attemptId, { reflection: value });
      setStatus("saved");
    }, 500);
    return () => clearTimeout(handle);
  }, [value, attemptId, initial]);

  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-muted">
          What did you learn?
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : ""}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What did you notice? What would you do differently?"
        rows={3}
        className="w-full bg-panel2 border border-line rounded-md text-sm p-2 leading-snug focus:outline-none focus:ring-1 focus:ring-accent/40"
      />
      <p className="text-[10px] text-muted mt-1">
        Saved automatically to your browser. Free-text — for your eyes only.
      </p>
    </div>
  );
}

// v2.4 — annotated replay. Lets the user return to an old attempt months
// later and add timestamped notes about what they now see differently. The
// original `reflection` field stays as the post-submit one-shot note; this
// panel is the meta-learning loop where insight compounds over time.
function AnnotationsPanel({
  attemptId,
  annotations,
  onChange,
}: {
  attemptId: string;
  annotations: import("@/lib/types").AttemptAnnotation[];
  onChange: (updated: import("@/lib/types").AttemptAnnotation[]) => void;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  function handleAdd() {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    appendAttemptAnnotation(attemptId, trimmed);
    const next = [...annotations, { at: Date.now(), note: trimmed }];
    onChange(next);
    setValue("");
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <div className="rounded-md border border-line bg-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted">
          Annotated replay
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted">
          {status === "saved" ? "Added ✓" : annotations.length === 0 ? "" : `${annotations.length} note${annotations.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <p className="text-[11px] text-muted leading-snug">
        Come back to this attempt later. When you re-read it with what you've learned since, add a note here — "I now see the
        lower high I missed," "the volume tell was right there." The reflection above is your first take; these annotations
        are your evolving read.
      </p>

      {annotations.length > 0 && (
        <ul className="space-y-2">
          {annotations.map((a, i) => (
            <li
              key={i}
              className="rounded-md border border-line bg-panel2 p-2.5 space-y-1"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted">
                {new Date(a.at).toLocaleString()}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-snug">{a.note}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What do you see now that you didn't see then?"
          rows={2}
          className="w-full bg-panel2 border border-line rounded-md text-sm p-2 leading-snug focus:outline-none focus:ring-1 focus:ring-accent/40"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={value.trim().length === 0}
            className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add annotation
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: "neutral" | "good" | "bad";
  children: React.ReactNode;
}) {
  const headerTone =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-muted";
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className={`text-xs uppercase tracking-wide mb-2 ${headerTone}`}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-1 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-mono">{value ?? "—"}</span>
    </div>
  );
}
