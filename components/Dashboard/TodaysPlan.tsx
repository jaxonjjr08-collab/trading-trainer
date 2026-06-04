"use client";

// v2.6 — Today's plan. Replaces the bare "0/3 attempts" daily counter with
// three concrete things you can do today: read one lesson, pass one quiz,
// take three attempts. Each cell shows progress; cells complete fill with
// the accent. Borderless, just a tint, so it sits second in the visual
// hierarchy after the greeting.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Attempt } from "@/lib/types";
import { getDailyGoal } from "@/lib/streak";
import { listQuizAttempts } from "@/lib/storage";

type Props = {
  attempts: Attempt[];
};

function isToday(t: number): boolean {
  const d = new Date(t);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type Cell = {
  label: string;
  current: number;
  target: number;
  href: string;
  cta: string;
};

export default function TodaysPlan({ attempts }: Props) {
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    const attemptsToday = attempts.filter((a) => isToday(a.createdAt)).length;
    const dailyGoal = getDailyGoal();
    const quizToday = listQuizAttempts().filter((q) => isToday(q.completedAt) && q.scorePercent >= 80).length;
    const lessonsToday = countLessonsReadToday();
    setCells([
      {
        label: "Lesson read",
        current: lessonsToday >= 1 ? 1 : 0,
        target: 1,
        href: "/learn",
        cta: "Open Learn",
      },
      {
        label: "Quiz passed (≥80%)",
        current: quizToday >= 1 ? 1 : 0,
        target: 1,
        href: "/learn",
        cta: "Take a quiz",
      },
      {
        label: "Practice attempts",
        current: attemptsToday,
        target: dailyGoal,
        href: "/practice",
        cta: "Open Practice",
      },
    ]);
  }, [attempts]);

  const completed = cells.filter((c) => c.current >= c.target).length;
  const allDone = cells.length > 0 && completed === cells.length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Today</h2>
        <span className="text-xs text-muted">
          {allDone
            ? "All three done. The rest is bonus."
            : `${completed} of ${cells.length} done`}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cells.map((c) => {
          const done = c.current >= c.target;
          const pct = Math.min(100, Math.round((c.current / Math.max(1, c.target)) * 100));
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`group rounded-xl p-4 transition-colors ${
                done
                  ? "bg-accent/10"
                  : "bg-panel2/50 hover:bg-panel2"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs uppercase tracking-wider text-muted">{c.label}</div>
                <span
                  className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${
                    done ? "bg-accent text-bg" : "border border-line text-muted"
                  }`}
                  aria-hidden
                >
                  {done ? "✓" : ""}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tab-nums">{c.current}</span>
                <span className="text-sm text-muted">/ {c.target}</span>
              </div>
              {!done && (
                <div className="mt-2 h-1 bg-panel rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/60 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              <div className="mt-2 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                {c.cta} →
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Helpers — keep these here so the Dashboard composition doesn't grow more
// imports. listReadAtMap is a tiny shim that wraps localStorage read of the
// lessons-read map maintained by `markLessonReviewed` in lib/storage.ts.

function countLessonsReadToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("trainer.lessonsReadAt.v1");
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    let n = 0;
    for (const ts of Object.values(map)) {
      if (typeof ts === "number" && isToday(ts)) n++;
    }
    return n;
  } catch {
    return 0;
  }
}
