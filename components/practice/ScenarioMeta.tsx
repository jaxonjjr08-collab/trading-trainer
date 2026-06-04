"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// v2.0.1 — small inline strip above the chart: bookmark toggle + how many times
// you've practiced this scenario. Stays out of the way; key for repeat training.

import { useEffect, useState } from "react";
import { attemptsForScenario, isBookmarked, toggleBookmark } from "@/lib/storage";

export default function ScenarioMeta({
  scenarioId,
  attemptsTrigger,
}: {
  scenarioId: string;
  attemptsTrigger: number;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const [summary, setSummary] = useState<{
    count: number;
    bestScore: number | null;
    lastScore: number | null;
  }>({
    count: 0,
    bestScore: null,
    lastScore: null,
  });

  useEffect(() => {
    setBookmarked(isBookmarked(scenarioId));
    setSummary(attemptsForScenario(scenarioId));
  }, [scenarioId, attemptsTrigger]);

  function handleToggle() {
    setBookmarked(toggleBookmark(scenarioId));
  }

  return (
    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1 px-2 py-1 rounded-md border ${
          bookmarked ? "border-warn/40 bg-warn/10 text-warn" : "border-line bg-panel hover:bg-panel2"
        }`}
        aria-pressed={bookmarked}
        title={bookmarked ? "Remove bookmark" : "Bookmark this scenario"}
      >
        <span aria-hidden>{bookmarked ? "★" : "☆"}</span>
        <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
      </button>
      {summary.count > 0 && (
        <span>
          You've practiced this <span className="text-text font-semibold">{summary.count}</span>{" "}
          time{summary.count === 1 ? "" : "s"}. Best score{" "}
          <span className="text-text font-mono font-semibold">{summary.bestScore}</span>; last{" "}
          <span className="text-text font-mono font-semibold">{summary.lastScore}</span>.
        </span>
      )}
    </div>
  );
}
