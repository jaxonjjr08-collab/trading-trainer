// v2.1 Phase 1 — single-sentence summary of an attempt's score.
//
// Replaces the old post-submit fatigue wall (score breakdown + outcome panel +
// what-actually-happened + tags + strengths + weaknesses + lesson card +
// reflection editor, all stacked). With this component at the top, the eye
// lands on one sentence first; everything else collapses behind a disclosure.
//
// Tone:
//   ≥ 80  good   — green border + accent
//   ≥ 60  warn   — amber border
//   <  60 bad    — red border
//
// "Strongest" picks the highest-fraction full-credit positive category.
// "Weakest"  picks the lowest-fraction sub-max category that isn't 0/0.
// Falls back gracefully when the breakdown is unusual (e.g. all max, or all
// zero) so the headline never shows "Strongest: undefined".

import type { Score, ScoreCategoryResult } from "@/lib/types";

const TONE_CLASS = {
  good: "border-good/40 bg-good/5",
  warn: "border-warn/40 bg-warn/5",
  bad: "border-bad/40 bg-bad/5",
} as const;

const TONE_NUMBER = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
} as const;

function pickStrongest(breakdown: ScoreCategoryResult[]): ScoreCategoryResult | null {
  // Full-credit categories that the scorer marked positive (true praise, not
  // "Not applicable for Wait" filler).
  const candidates = breakdown.filter(
    (b) => b.positive && b.points === b.max && b.note && !b.note.startsWith("Not applicable")
  );
  if (candidates.length === 0) return null;
  // Tiebreak by max points (more weight = more meaningful "strongest").
  return [...candidates].sort((a, b) => b.max - a.max)[0];
}

function pickWeakest(breakdown: ScoreCategoryResult[]): ScoreCategoryResult | null {
  // Sub-max categories with a real tag or non-positive flag, sorted by
  // fraction ascending. Skip categories with max=0 (shouldn't exist but safe).
  const candidates = breakdown.filter(
    (b) => b.max > 0 && b.points < b.max && (!b.positive || b.tags.length > 0)
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.points / a.max - b.points / b.max)[0];
}

export default function ReviewHeadline({ score }: { score: Score }) {
  const pct = (score.total / score.max) * 100;
  const tone: keyof typeof TONE_CLASS =
    pct >= 80 ? "good" : pct >= 60 ? "warn" : "bad";
  const strongest = pickStrongest(score.breakdown);
  const weakest = pickWeakest(score.breakdown);

  let summary: string;
  if (strongest && weakest) {
    summary = `Strongest: ${strongest.label.toLowerCase()}. Weakest: ${weakest.label.toLowerCase()}.`;
  } else if (strongest) {
    summary = `Strongest: ${strongest.label.toLowerCase()}. Everything else scored full credit.`;
  } else if (weakest) {
    summary = `Biggest gap: ${weakest.label.toLowerCase()}.`;
  } else {
    summary = "Mixed result across every category.";
  }

  return (
    <div className={`rounded-md border-2 p-5 ${TONE_CLASS[tone]}`}>
      <div className="text-xs uppercase tracking-wide text-muted">Result</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${TONE_NUMBER[tone]}`}>{score.total}</span>
        <span className="text-muted">/{score.max}</span>
      </div>
      <p className="text-sm mt-2">{summary}</p>
    </div>
  );
}
