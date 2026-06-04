"use client";

// v2.7 — Per-skill trend chart for the Journal page. A grid of mini sparklines,
// one per skill, each showing the cumulative skill score across the user's
// attempts. Designed to make growth visible — climbing lines = the trainer is
// working. Hidden when there are <3 attempts (lines aren't meaningful yet).

import { useMemo } from "react";
import { computeSkillTrends, type SkillTrend } from "@/lib/skills";
import type { Attempt } from "@/lib/types";

const W = 200;
const H = 56;
const PADX = 4;
const PADY = 6;

function Sparkline({ trend }: { trend: SkillTrend }) {
  const withData = trend.points.filter((p) => p.score != null) as Array<
    { attemptIdx: number; score: number }
  >;
  if (withData.length === 0) {
    return (
      <div className="text-xs text-muted italic h-[56px] flex items-center">
        No data yet
      </div>
    );
  }
  const innerW = W - PADX * 2;
  const innerH = H - PADY * 2;
  const N = withData.length;
  const xFor = (i: number) =>
    PADX + (N <= 1 ? innerW / 2 : (i / (N - 1)) * innerW);
  const yFor = (v: number) => PADY + innerH - (v / 100) * innerH;
  const path = withData
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.score).toFixed(1)}`)
    .join(" ");
  const last = withData[N - 1];
  const lineColor =
    last.score >= 70 ? "var(--good)" : last.score >= 50 ? "var(--warn)" : "var(--bad)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-14"
      role="img"
      aria-label={`${trend.label} trend`}
    >
      {/* 50% reference line — the "improving / needs work" boundary. */}
      <line
        x1={PADX}
        x2={W - PADX}
        y1={yFor(50)}
        y2={yFor(50)}
        stroke="var(--muted)"
        strokeOpacity={0.25}
        strokeDasharray="3 3"
      />
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={xFor(N - 1)}
        cy={yFor(last.score)}
        r={3}
        fill={lineColor}
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function Tile({ trend }: { trend: SkillTrend }) {
  const scoreColor =
    trend.current == null
      ? "text-muted"
      : trend.current >= 70
      ? "text-good"
      : trend.current >= 50
      ? "text-warn"
      : "text-bad";
  const deltaText =
    trend.delta == null
      ? null
      : trend.delta > 0
      ? `+${trend.delta}`
      : trend.delta < 0
      ? `${trend.delta}`
      : "±0";
  const deltaColor =
    trend.delta == null
      ? "text-muted"
      : trend.delta > 0
      ? "text-good"
      : trend.delta < 0
      ? "text-bad"
      : "text-muted";

  return (
    <div className="rounded-md border border-line bg-panel p-3 space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted truncate">{trend.label}</span>
        <span className="text-xs text-muted shrink-0">
          {deltaText && <span className={`font-mono ${deltaColor}`}>{deltaText}</span>}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-bold font-mono tab-nums ${scoreColor}`}>
          {trend.current ?? "—"}
        </span>
        {trend.current != null && (
          <span className="text-xs text-muted">/100</span>
        )}
      </div>
      <Sparkline trend={trend} />
    </div>
  );
}

export default function SkillTrendChart({ attempts }: { attempts: Attempt[] }) {
  const trends = useMemo(() => computeSkillTrends(attempts), [attempts]);

  if (attempts.length < 3) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Skill trends
        </h2>
        <span className="text-[10px] text-muted">
          Cumulative — delta = vs. 10 attempts ago
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {trends.map((t) => (
          <Tile key={t.id} trend={t} />
        ))}
      </div>
    </section>
  );
}
