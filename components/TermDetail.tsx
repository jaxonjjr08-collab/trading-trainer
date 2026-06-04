"use client";

// v2.8 — Shared term detail panel, rendered by both /learn?term=X and
// /glossary?term=X. Lifted unchanged from the old LearnBrowser.tsx so the
// content (worked example, related mistake tags, quiz, related terms) stays
// identical — only the "back" target and prev/next behaviour are parameterised.
//
// onClose: navigate back to the list (caller passes a router.replace closure).
// onJump : open a different term in the SAME parent surface (path or glossary).
// backLabel: text rendered next to the back arrow ("Back to path" / "Back to
// glossary"). Just copy — the navigation itself is the caller's job.

import { useEffect } from "react";
import Link from "next/link";
import {
  CATEGORY_THEME,
  LEARN_CATEGORY_LABELS,
  LEARN_TERMS,
  focusForTerm,
  relatedTerms,
  setupTypesForFocus,
  type LearnTerm,
} from "@/lib/learn";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import { chartFor } from "@/lib/learn-charts";
import { quizFor } from "@/lib/learn-quizzes";
import { markLessonReviewed } from "@/lib/storage";
import { markTermRead } from "@/lib/curriculum";
import MiniChart from "./MiniChart";
import TermQuiz from "./TermQuiz";

type Props = {
  term: LearnTerm;
  onClose: () => void;
  onJump: (id: string) => void;
  backLabel?: string;
};

export default function TermDetail({
  term,
  onClose,
  onJump,
  backLabel = "Back to all terms",
}: Props) {
  const theme = CATEGORY_THEME[term.category];

  // v2.1 Phase 4 — opening any term counts as a real review for the cooldown
  // and curriculum read-state. Side-effect retained from the original
  // LearnBrowser implementation; deep-links (ForceMicroLesson, AttemptDetail)
  // depend on it.
  useEffect(() => {
    markTermRead(term.id);
    markLessonReviewed(term.id);
  }, [term.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categoryTerms = LEARN_TERMS.filter((t) => t.category === term.category);
  const idx = categoryTerms.findIndex((t) => t.id === term.id);
  const prev = idx > 0 ? categoryTerms[idx - 1] : null;
  const next = idx < categoryTerms.length - 1 ? categoryTerms[idx + 1] : null;

  const related = relatedTerms(term, 4);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> {backLabel}
        </button>
        <div className="flex items-center gap-2">
          <NavButton disabled={!prev} onClick={() => prev && onJump(prev.id)} label="Previous" hint={prev?.term} />
          <NavButton disabled={!next} onClick={() => next && onJump(next.id)} label="Next" hint={next?.term} flip />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-md border border-line bg-panel p-6 pl-7">
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.bar}`} />
        <div
          className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}
        >
          {LEARN_CATEGORY_LABELS[term.category]}
        </div>
        <h2 className="text-3xl font-bold mt-3">{term.term}</h2>
        <p className="text-base text-muted leading-relaxed mt-2 max-w-3xl">
          {term.simpleDefinition}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DetailSection title="Why it matters" tone={theme.tone}>
          <p className="text-sm leading-relaxed">{term.whyItMatters}</p>
        </DetailSection>

        <DetailSection title="Common mistake" tone="text-bad">
          <p className="text-sm leading-relaxed">{term.commonMistake}</p>
        </DetailSection>

        <DetailSection title="How this affects your score" tone="text-accent">
          <p className="text-sm leading-relaxed text-muted">
            {term.replayScoringConnection}
          </p>
        </DetailSection>
      </div>

      <div className="rounded-md border border-line bg-panel p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={`text-xs uppercase tracking-wider ${theme.tone}`}>Example</div>
          <div className="text-[10px] text-muted">
            {chartFor(term.id) ? "— worked numbers + diagram" : "— worked numbers"}
          </div>
        </div>
        {(() => {
          const spec = chartFor(term.id);
          if (!spec) {
            return (
              <pre className="text-sm font-mono bg-panel2 border border-line rounded-md p-4 whitespace-pre-wrap leading-relaxed">
                {term.example}
              </pre>
            );
          }
          return (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 rounded-md bg-panel2 border border-line p-2">
                <MiniChart spec={spec} />
                <div className="text-[10px] text-muted px-2 pb-1 pt-0.5 italic">
                  Illustrative — schematic, not a real chart.
                </div>
              </div>
              <pre className="lg:col-span-2 text-sm font-mono bg-panel2 border border-line rounded-md p-4 whitespace-pre-wrap leading-relaxed">
                {term.example}
              </pre>
            </div>
          );
        })()}
      </div>

      {term.relatedTags.length > 0 && (
        <div className="rounded-md border border-line bg-panel p-5">
          <div className="text-xs uppercase tracking-wider text-muted mb-3">
            Related mistake tags
          </div>
          <div className="flex flex-wrap gap-2">
            {term.relatedTags.map((tag) => {
              const info = MISTAKE_TAGS[tag];
              return (
                <span
                  key={tag}
                  title={info.description}
                  className={`text-xs px-2 py-1 rounded-md border ${
                    info.positive
                      ? "border-good/40 bg-good/10 text-good"
                      : "border-bad/40 bg-bad/10 text-bad"
                  }`}
                >
                  {info.label}
                </span>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-3">
            These tags appear on your replay review when this concept comes into play.
          </p>
        </div>
      )}

      {(() => {
        const quiz = quizFor(term.id);
        if (!quiz) return null;
        return <TermQuiz termId={term.id} quiz={quiz} toneClass={theme.tone} barClass={theme.bar} />;
      })()}

      <PracticeThisConcept term={term} />

      {related.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-3">Related terms</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {related.map((rt) => {
              const rtTheme = CATEGORY_THEME[rt.category];
              return (
                <button
                  type="button"
                  key={rt.id}
                  onClick={() => onJump(rt.id)}
                  className="text-left relative overflow-hidden rounded-md border border-line bg-panel hover:bg-panel2 transition-colors p-3 pl-4"
                >
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${rtTheme.bar}`} />
                  <div className={`text-[10px] uppercase tracking-wider ${rtTheme.tone}`}>
                    {LEARN_CATEGORY_LABELS[rt.category]}
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{rt.term}</div>
                  <div className="text-xs text-muted line-clamp-2 mt-1">
                    {rt.simpleDefinition}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted hover:text-text"
        >
          ← {backLabel}
        </button>
        <div className="flex items-center gap-2">
          <NavButton disabled={!prev} onClick={() => prev && onJump(prev.id)} label="Previous" hint={prev?.term} />
          <NavButton disabled={!next} onClick={() => next && onJump(next.id)} label="Next" hint={next?.term} flip />
        </div>
      </div>
    </div>
  );
}

function PracticeThisConcept({ term }: { term: LearnTerm }) {
  const focus = focusForTerm(term.id);
  if (!focus) return null;
  const setups = setupTypesForFocus(focus);
  if (setups.length === 0) return null;
  return (
    <div className="rounded-md border border-line bg-panel p-4 flex items-center justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Apply this</div>
        <div className="text-sm mt-0.5">
          Run a scenario that exercises <span className="font-semibold">{term.term}</span>.
        </div>
      </div>
      <Link
        href={`/practice?focus=${focus}`}
        className="shrink-0 text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
      >
        Practice this concept →
      </Link>
    </div>
  );
}

function NavButton({
  disabled,
  onClick,
  label,
  hint,
  flip,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
        disabled
          ? "border-line bg-panel text-muted/50 cursor-not-allowed"
          : "border-line bg-panel text-text hover:bg-panel2"
      }`}
    >
      {!flip && <span aria-hidden>←</span>}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
        {hint && <span className="text-xs">{hint}</span>}
      </span>
      {flip && <span aria-hidden>→</span>}
    </button>
  );
}

function DetailSection({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-panel p-5">
      <div className={`text-xs uppercase tracking-wider ${tone} mb-2`}>{title}</div>
      {children}
    </div>
  );
}
