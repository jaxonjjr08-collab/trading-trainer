"use client";

// v3.1 — Revisit prompt on the Dashboard. Picks one old attempt worth
// re-reading with fresh eyes and surfaces it as a single quiet card. Two
// candidate sources, in priority order:
//
//   1. An attempt you ANNOTATED 14+ days ago and haven't returned to since.
//      The note is the user's own marker that this one matters.
//   2. An attempt with a sub-60 score that's 14+ days old and hasn't been
//      revisited. Old failures are the highest-EV thing to re-read once your
//      eye has matured.
//
// Hidden when nothing qualifies, so the dashboard doesn't sprout a card that
// just says "nothing to revisit yet."

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listAttempts } from "@/lib/storage";
import { getScenarioById } from "@/lib/scenarios";
import type { Attempt } from "@/lib/types";

const MS_DAY = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 14;

type Pick = {
  attempt: Attempt;
  kind: "annotated" | "low-score";
  ageDays: number;
  scenarioTitle: string;
};

function pickRevisit(attempts: Attempt[], now: number): Pick | null {
  const stale = (a: Attempt) => (now - a.createdAt) / MS_DAY >= STALE_AFTER_DAYS;
  const recentlyAnnotated = (a: Attempt) => {
    if (!a.annotations || a.annotations.length === 0) return false;
    const lastNote = Math.max(...a.annotations.map((n) => n.at));
    return (now - lastNote) / MS_DAY < STALE_AFTER_DAYS;
  };
  const annotatedOld = attempts.filter(
    (a) => stale(a) && a.annotations && a.annotations.length > 0 && !recentlyAnnotated(a)
  );
  if (annotatedOld.length > 0) {
    // Oldest annotation date wins — "I haven't touched this in the longest."
    annotatedOld.sort((a, b) => a.createdAt - b.createdAt);
    const pick = annotatedOld[0];
    return {
      attempt: pick,
      kind: "annotated",
      ageDays: Math.floor((now - pick.createdAt) / MS_DAY),
      scenarioTitle: scenarioTitleFor(pick),
    };
  }
  const lowOld = attempts.filter(
    (a) => stale(a) && a.score.total < 60 && (!a.annotations || a.annotations.length === 0)
  );
  if (lowOld.length > 0) {
    lowOld.sort((a, b) => a.score.total - b.score.total);
    const pick = lowOld[0];
    return {
      attempt: pick,
      kind: "low-score",
      ageDays: Math.floor((now - pick.createdAt) / MS_DAY),
      scenarioTitle: scenarioTitleFor(pick),
    };
  }
  return null;
}

function scenarioTitleFor(a: Attempt): string {
  if (a.scenarioSnapshot?.title) return a.scenarioSnapshot.title;
  const live = getScenarioById(a.scenarioId);
  if (live) return live.title;
  return a.scenarioId.startsWith("proc-") ? "Procedural scenario" : "Removed scenario";
}

export default function RevisitPrompt() {
  const [pick, setPick] = useState<Pick | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = listAttempts();
    setPick(pickRevisit(all, Date.now()));
    setHydrated(true);
  }, []);

  if (!hydrated || !pick) return null;

  return (
    <section className="rounded-md border border-warn/40 bg-warn/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wider text-warn">Read with fresh eyes</div>
        <div className="text-sm mt-1">
          {pick.kind === "annotated" ? (
            <>
              You annotated <span className="font-semibold">{pick.scenarioTitle}</span>{" "}
              <span className="text-muted">{pick.ageDays} days ago</span>. Re-open it — what do you see now that you didn't then?
            </>
          ) : (
            <>
              <span className="font-semibold">{pick.scenarioTitle}</span> scored{" "}
              <span className="text-bad font-mono">{pick.attempt.score.total}</span>{" "}
              <span className="text-muted">{pick.ageDays} days ago</span>. The old failures are usually the easiest lessons to spot the second time.
            </>
          )}
        </div>
      </div>
      <Link
        href={`/journal/${pick.attempt.id}`}
        className="shrink-0 text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
      >
        Re-read →
      </Link>
    </section>
  );
}
