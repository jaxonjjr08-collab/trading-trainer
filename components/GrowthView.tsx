"use client";

// v3.1 — Longitudinal growth view at /journal/growth. Buckets attempts by
// ISO-week and computes per-skill average per week. Renders one sparkline per
// skill (reuses the SVG pattern from SkillTrendChart) plus a "what you got
// better at this month" headline that compares the last 4 weeks to the prior 4.
//
// Pure read of listAttempts(); same storage model as v2.7's skill trends, but
// time-bucketed instead of attempt-indexed. Hidden when fewer than 2 weeks of
// data exist (nothing meaningful to compare yet).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listAttempts } from "@/lib/storage";
import { SKILLS, computeSkillScores, type SkillId } from "@/lib/skills";
import type { Attempt } from "@/lib/types";
import MascotBubble from "./MascotBubble";

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

// Bucket key: YYYY-W## using ISO week-of-year. Local-time bucketing matches
// the rest of the app (streak counts days in local time too).
function weekKey(d: Date): string {
  // Copy date so we don't mutate. Move to Thursday of this week (ISO week
  // anchor), then compute the week number relative to Jan 4 of that year.
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (c.getDay() + 6) % 7; // Mon=0..Sun=6
  c.setDate(c.getDate() - day + 3);
  const jan4 = new Date(c.getFullYear(), 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  jan4.setDate(jan4.getDate() - jan4Day + 3);
  const week = 1 + Math.round((c.getTime() - jan4.getTime()) / MS_WEEK);
  return `${c.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  return c;
}

type WeekBucket = {
  key: string;
  start: Date;
  attempts: Attempt[];
};

function bucketByWeek(attempts: Attempt[]): WeekBucket[] {
  if (attempts.length === 0) return [];
  const map = new Map<string, WeekBucket>();
  for (const a of attempts) {
    const d = new Date(a.createdAt);
    const k = weekKey(d);
    let b = map.get(k);
    if (!b) {
      b = { key: k, start: startOfWeek(d), attempts: [] };
      map.set(k, b);
    }
    b.attempts.push(a);
  }
  return [...map.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

type SkillRow = {
  id: SkillId;
  label: string;
  points: Array<{ key: string; start: Date; score: number | null }>;
  currentScore: number | null;
  prior4Avg: number | null;
  recent4Avg: number | null;
  delta: number | null;
};

function computeSkillRows(buckets: WeekBucket[]): SkillRow[] {
  return SKILLS.map((skill) => {
    const points = buckets.map((b) => {
      const scores = computeSkillScores(b.attempts);
      const s = scores.find((x) => x.id === skill.id);
      return {
        key: b.key,
        start: b.start,
        score: s && s.hasData ? s.score : null,
      };
    });
    const withData = points.filter((p) => p.score != null) as Array<{ key: string; start: Date; score: number }>;
    const currentScore = withData.length > 0 ? withData[withData.length - 1].score : null;
    const recent4 = withData.slice(-4);
    const prior4 = withData.slice(-8, -4);
    const recent4Avg =
      recent4.length === 0 ? null : Math.round(recent4.reduce((s, p) => s + p.score, 0) / recent4.length);
    const prior4Avg =
      prior4.length === 0 ? null : Math.round(prior4.reduce((s, p) => s + p.score, 0) / prior4.length);
    const delta = recent4Avg != null && prior4Avg != null ? recent4Avg - prior4Avg : null;
    return {
      id: skill.id,
      label: skill.label,
      points,
      currentScore,
      prior4Avg,
      recent4Avg,
      delta,
    };
  });
}

const W = 280;
const H = 64;
const PADX = 6;
const PADY = 8;

function WeeklySparkline({ points }: { points: SkillRow["points"] }) {
  const data = points.map((p, i) => ({ i, score: p.score }));
  const withScore = data.filter((p) => p.score != null) as Array<{ i: number; score: number }>;
  if (withScore.length === 0) {
    return (
      <div className="text-xs text-muted italic h-[64px] flex items-center">
        No data in this period.
      </div>
    );
  }
  const innerW = W - PADX * 2;
  const innerH = H - PADY * 2;
  const N = data.length;
  const xFor = (i: number) =>
    PADX + (N <= 1 ? innerW / 2 : (i / (N - 1)) * innerW);
  const yFor = (v: number) => PADY + innerH - (v / 100) * innerH;

  const path = withScore
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFor(p.i).toFixed(1)} ${yFor(p.score).toFixed(1)}`)
    .join(" ");

  const last = withScore[withScore.length - 1];
  const tone =
    last.score >= 70 ? "var(--good)" : last.score >= 50 ? "var(--warn)" : "var(--bad)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-16"
      role="img"
      aria-label="Weekly trend"
    >
      <line
        x1={PADX}
        x2={W - PADX}
        y1={yFor(50)}
        y2={yFor(50)}
        stroke="var(--muted)"
        strokeOpacity={0.25}
        strokeDasharray="3 3"
      />
      <path d={path} fill="none" stroke={tone} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {withScore.map((p) => (
        <circle key={p.i} cx={xFor(p.i)} cy={yFor(p.score)} r={2} fill={tone} />
      ))}
    </svg>
  );
}

export default function GrowthView() {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    setAttempts(listAttempts());
  }, []);

  const buckets = useMemo(() => bucketByWeek(attempts ?? []), [attempts]);
  const rows = useMemo(() => computeSkillRows(buckets), [buckets]);

  // Headline: biggest improver, biggest regression, weeks tracked.
  const headline = useMemo(() => {
    const ranked = [...rows]
      .filter((r) => r.delta != null)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
    const biggestGain = ranked[0];
    const biggestLoss = ranked[ranked.length - 1];
    return { biggestGain, biggestLoss };
  }, [rows]);

  if (attempts == null) return <div className="text-muted text-sm">Loading…</div>;

  if (buckets.length < 2) {
    return (
      <div className="py-8 flex justify-center">
        <MascotBubble mood="confused" size="xl" layout="stack">
          <p className="font-semibold">Not enough history to chart growth yet.</p>
          <p className="mt-1 text-muted">
            Growth view compares week to week. Save attempts across at least two different weeks and the lines start appearing.
          </p>
          <Link
            href="/practice"
            className="mt-3 inline-block text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
          >
            Open Practice →
          </Link>
        </MascotBubble>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-accent/40 bg-accent/5 p-4">
        <div className="text-xs uppercase tracking-wider text-accent">This month vs. last month</div>
        <div className="mt-2 text-sm leading-relaxed">
          {headline.biggestGain && headline.biggestGain.delta != null && headline.biggestGain.delta > 0 ? (
            <>
              You got better at <span className="font-semibold">{headline.biggestGain.label}</span>{" "}
              — <span className="font-mono text-good">+{headline.biggestGain.delta}</span> over the last 4 weeks.
            </>
          ) : (
            <>No clear gains over the last 4 weeks yet. Keep practicing — the line moves with volume.</>
          )}
          {headline.biggestLoss && headline.biggestLoss.delta != null && headline.biggestLoss.delta < -3 && (
            <>
              {" "}One to watch: <span className="font-semibold">{headline.biggestLoss.label}</span>{" "}
              slipped <span className="font-mono text-bad">{headline.biggestLoss.delta}</span>.
            </>
          )}
        </div>
        <div className="text-[10px] text-muted mt-2">
          Tracking {buckets.length} week{buckets.length === 1 ? "" : "s"} of attempts.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const tone =
            r.currentScore == null
              ? "text-muted"
              : r.currentScore >= 70
              ? "text-good"
              : r.currentScore >= 50
              ? "text-warn"
              : "text-bad";
          const deltaTone =
            r.delta == null
              ? "text-muted"
              : r.delta > 0
              ? "text-good"
              : r.delta < 0
              ? "text-bad"
              : "text-muted";
          return (
            <div key={r.id} className="rounded-md border border-line bg-panel p-3 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{r.label}</span>
                {r.delta != null && (
                  <span className={`text-xs font-mono ${deltaTone}`}>
                    {r.delta > 0 ? "+" : ""}
                    {r.delta} <span className="text-[10px] text-muted">last 4w</span>
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono tab-nums ${tone}`}>
                  {r.currentScore ?? "—"}
                </span>
                {r.currentScore != null && <span className="text-xs text-muted">/100</span>}
              </div>
              <WeeklySparkline points={r.points} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
