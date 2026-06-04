import { Suspense } from "react";
import Link from "next/link";
import LearnRoute from "@/components/LearnRoute";
import { LEARN_CATEGORIES, LEARN_TERMS, CATEGORY_THEME } from "@/lib/learn";

export default function LearnPage() {
  const counts = LEARN_CATEGORIES.map((c) => ({
    ...c,
    count: LEARN_TERMS.filter((t) => t.category === c.id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-panel p-6">
        <h1 className="text-2xl font-bold">Learn</h1>
        <p className="text-muted text-sm mt-2 max-w-3xl leading-relaxed">
          A 7-module path through the concepts behind the scoring. Open the recommended lesson, take the quiz, then move on. Need a quick definition instead? Use the <Link href="/glossary" className="text-accent hover:underline">Glossary</Link>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {counts.map((c) => {
            const theme = CATEGORY_THEME[c.id];
            return (
              <div
                key={c.id}
                className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded-md border ${theme.badge}`}
              >
                {c.label} <span className="opacity-70">{c.count}</span>
              </div>
            );
          })}
        </div>

        {/* v2.4 — entry to the speed-read flashcard drills. Sits inside the
            Learn hero so users discover it from the top of the page rather
            than as a hidden route. v4.1.3 — context-first drill added beside
            it; same shape (10 rounds, 5s reveal) but trains HTF-first reading
            instead of generic chart pattern recognition. */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/learn/drills"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              ⚡ Speed-read drills →
            </Link>
            <span className="text-xs text-muted">
              10 quick 5-second flashcards — builds the chart-reading reflex.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/learn/context-first"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-panel2 border border-line text-text px-4 py-2 rounded-md hover:border-accent/60"
            >
              ◆ Context-first drill →
            </Link>
            <span className="text-xs text-muted">
              HTF for 5 seconds, call the trend, then see the LTF — trains the read-the-bigger-chart-first reflex.
            </span>
          </div>
        </div>
      </div>
      <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
        <LearnRoute />
      </Suspense>
    </div>
  );
}
