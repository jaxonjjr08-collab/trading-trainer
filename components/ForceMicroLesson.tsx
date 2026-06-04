"use client";

// v2.1 Phase 4 — the panel that interrupts the post-submit flow when the user
// has triggered the same mistake 3+ times in their last 10 attempts and
// hasn't reviewed the matching Learn term in the last 24h.
//
// Sits between submit and the ReviewHeadline. After the user clicks "Got it"
// we mark the lesson as shown (24h cooldown so it doesn't re-fire on every
// subsequent attempt) and reveal the score. Opening the full lesson via the
// secondary link also marks the lesson as reviewed.

import Link from "next/link";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import type { LearnTerm } from "@/lib/learn";
import type { MistakeTag } from "@/lib/types";

type Props = {
  tag: MistakeTag;
  term: LearnTerm;
  count: number;
  windowSize: number;
  onContinue: () => void;
  onOpenLesson: () => void;
};

export default function ForceMicroLesson({
  tag,
  term,
  count,
  windowSize,
  onContinue,
  onOpenLesson,
}: Props) {
  const tagInfo = MISTAKE_TAGS[tag];

  return (
    <div className="rounded-md border-2 border-warn/50 bg-warn/5 p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-warn">
          Repeated mistake — quick refresher
        </div>
        <h2 className="text-2xl font-bold mt-1">{term.term}</h2>
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        <p>{term.simpleDefinition}</p>
        <p className="text-muted">{term.whyItMatters}</p>
      </div>

      <div className="rounded-md border border-line bg-panel2 p-3 text-xs">
        <div className="text-muted">
          You've triggered{" "}
          <span className="text-text font-semibold">{tagInfo.label}</span>{" "}
          <span className="text-text font-mono font-semibold">{count}</span>{" "}
          {count === 1 ? "time" : "times"} in your last{" "}
          <span className="text-text font-mono">{windowSize}</span> attempts.
        </div>
        <div className="text-muted mt-1 italic">
          Two minutes here, less time bleeding capital.
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-md hover:opacity-90"
        >
          Got it — show my score →
        </button>
        <Link
          href={`/learn?term=${term.id}`}
          onClick={onOpenLesson}
          className="text-sm border border-line bg-panel text-text px-4 py-2 rounded-md hover:bg-panel2"
        >
          Open full lesson
        </Link>
      </div>
    </div>
  );
}
