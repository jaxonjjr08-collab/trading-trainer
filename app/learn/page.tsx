import { Suspense } from "react";
import Link from "next/link";
import LearnRoute from "@/components/LearnRoute";
import FeatureCard, { SectionMarks } from "@/components/FeatureCard";
import { LEARN_CATEGORIES, LEARN_TERMS, CATEGORY_THEME } from "@/lib/learn";

// v5.10.4 — the Learn hands-on cards get their own personalized symbols
// (hand-drawn here) instead of the shared generic icons: a magnified candle,
// a lightning bolt, and a nested-frame "zoom out for context" mark.
const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const learnIcons = {
  // Candle School — a candlestick under a magnifier (you study the candle).
  candleSchool: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M6.5 3v3M6.5 14v3" />
      <rect x="4" y="6" width="5" height="8" rx="1" />
      <circle cx="15.5" cy="13" r="4" />
      <path d="m18.4 15.9 2.4 2.4" />
    </svg>
  ),
  // Speed-read drills — a lightning bolt.
  speedRead: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M13 2 5 13h6l-1 9 9-12h-6Z" />
    </svg>
  ),
  // Context-first — a big frame (HTF) with a smaller zoomed region (LTF).
  contextFirst: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M6 10.5 8.5 13 12 9" />
      <rect x="12.5" y="11" width="6" height="5.5" rx="1" />
    </svg>
  ),
};

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

        {/* v5.10.1 — hands-on practice tools as proper feature cards (was a
            stack of cramped text buttons). Surfaced at the top of Learn so
            beginners find Candle School + the drills before the term path.
            v5.10.2 — section gets a custom hand-drawn mark, matching the
            dashboard launcher's section symbols. */}
        <div className="mt-5 flex items-center gap-1.5">
          <span className="text-accent shrink-0" aria-hidden>
            {SectionMarks.handsOn}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted/80">
            Hands-on
          </span>
        </div>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FeatureCard
            href="/learn/candles"
            title="Candle School"
            description="Shape a candle to name it, then browse the patterns the chart flags."
            icon={learnIcons.candleSchool}
            tone="accent"
          />
          <FeatureCard
            href="/learn/drills"
            title="Speed-read drills"
            description="Ten 5-second flashcards that build the chart-reading reflex."
            icon={learnIcons.speedRead}
            tone="accent"
          />
          <FeatureCard
            href="/learn/context-first"
            title="Context-first drill"
            description="Read the higher timeframe first, call the trend, then see the LTF."
            icon={learnIcons.contextFirst}
            tone="accent"
          />
        </div>
      </div>
      <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
        <LearnRoute />
      </Suspense>
    </div>
  );
}
