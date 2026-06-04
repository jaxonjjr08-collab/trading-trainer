"use client";

// v2.9 — Weekly digest on the Dashboard. Single horizontal strip summarising
// the trailing 7 days vs the prior 7 — gives the user a "where am I trending"
// read without scrolling to the Journal. Pure read of listAttempts(); no new
// storage.
//
// Hidden when the user has no attempts in the trailing 14-day window (nothing
// useful to show, and the empty card adds clutter).

import { useMemo } from "react";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import type { Attempt, MistakeTag } from "@/lib/types";

type Props = { attempts: Attempt[] };

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

type WindowStats = {
  count: number;
  avgScore: number | null;
  daysActive: number;
  topMistake: { tag: MistakeTag; count: number } | null;
};

function statsFor(attempts: Attempt[]): WindowStats {
  if (attempts.length === 0) {
    return { count: 0, avgScore: null, daysActive: 0, topMistake: null };
  }
  const days = new Set<string>();
  const tagCount = new Map<MistakeTag, number>();
  let scoreSum = 0;
  for (const a of attempts) {
    const d = new Date(a.createdAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    scoreSum += a.score.total;
    for (const t of a.score.tags) {
      const info = MISTAKE_TAGS[t];
      // Skip positive tags — "wait was correct" isn't a mistake to lead with.
      if (info?.positive) continue;
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    }
  }
  let topMistake: WindowStats["topMistake"] = null;
  for (const [tag, count] of tagCount) {
    if (!topMistake || count > topMistake.count) topMistake = { tag, count };
  }
  return {
    count: attempts.length,
    avgScore: Math.round(scoreSum / attempts.length),
    daysActive: days.size,
    topMistake,
  };
}

export default function WeeklyDigest({ attempts }: Props) {
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = Date.now();
    const start = now - WEEK;
    const priorStart = start - WEEK;
    return {
      thisWeek: statsFor(attempts.filter((a) => a.createdAt >= start && a.createdAt <= now)),
      lastWeek: statsFor(
        attempts.filter((a) => a.createdAt >= priorStart && a.createdAt < start)
      ),
    };
  }, [attempts]);

  if (thisWeek.count === 0 && lastWeek.count === 0) {
    return null;
  }

  const countDelta = thisWeek.count - lastWeek.count;
  const scoreDelta =
    thisWeek.avgScore != null && lastWeek.avgScore != null
      ? thisWeek.avgScore - lastWeek.avgScore
      : null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">This week</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted">
          vs. previous 7 days
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Attempts"
          value={thisWeek.count.toString()}
          delta={
            countDelta === 0
              ? null
              : `${countDelta > 0 ? "+" : ""}${countDelta}`
          }
          deltaTone={countDelta > 0 ? "good" : countDelta < 0 ? "bad" : "muted"}
        />
        <Stat
          label="Avg score"
          value={thisWeek.avgScore != null ? `${thisWeek.avgScore}` : "—"}
          delta={
            scoreDelta == null || scoreDelta === 0
              ? null
              : `${scoreDelta > 0 ? "+" : ""}${scoreDelta}`
          }
          deltaTone={
            scoreDelta == null
              ? "muted"
              : scoreDelta > 0
              ? "good"
              : scoreDelta < 0
              ? "bad"
              : "muted"
          }
        />
        <Stat
          label="Days active"
          value={`${thisWeek.daysActive} / 7`}
          delta={null}
        />
        <TopMistakeStat top={thisWeek.topMistake} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  delta,
  deltaTone = "muted",
}: {
  label: string;
  value: string;
  delta: string | null;
  deltaTone?: "good" | "bad" | "muted";
}) {
  const toneClass =
    deltaTone === "good" ? "text-good" : deltaTone === "bad" ? "text-bad" : "text-muted";
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tab-nums">{value}</span>
        {delta && <span className={`text-xs font-mono ${toneClass}`}>{delta}</span>}
      </div>
    </div>
  );
}

function TopMistakeStat({ top }: { top: WindowStats["topMistake"] }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">Top mistake</div>
      {top ? (
        <>
          <div className="mt-0.5 text-sm font-semibold leading-tight">
            {MISTAKE_TAGS[top.tag]?.label ?? top.tag}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {top.count}× this week
          </div>
        </>
      ) : (
        <div className="mt-0.5 text-sm text-muted italic">No mistakes tagged</div>
      )}
    </div>
  );
}
