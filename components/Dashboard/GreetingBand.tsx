"use client";

// v2.6 — Dashboard hero. Owl mascot + a personalised greeting + sparkline of
// recent scores. No card border — type and mascot do all the work. Sets the
// emotional contract for the Dashboard scroll.

import type { Attempt } from "@/lib/types";
import Mascot from "../Mascot";

type Props = {
  attempts: Attempt[];
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function recentLine(attempts: Attempt[]): string {
  if (attempts.length === 0) {
    return "Let's start with one attempt. Nothing is at risk — the goal is to notice your reasoning.";
  }
  if (attempts.length < 5) {
    return `${attempts.length} attempt${attempts.length === 1 ? "" : "s"} in. Pick up where you left off — patterns appear faster than you'd think.`;
  }
  const last5 = attempts.slice(-5);
  const avg = Math.round(last5.reduce((s, a) => s + a.score.total, 0) / last5.length);
  if (avg >= 80) return `Last 5 attempts averaged ${avg}. The process is sticking — keep going.`;
  if (avg >= 60) return `Last 5 attempts averaged ${avg}. Mixed bag — open the weakest one and look for the gap.`;
  return `Last 5 attempts averaged ${avg}. The trainer is supposed to surface what you don't see yet. This is the work.`;
}

// Tiny SVG sparkline of the last N scores. Uses the accent color.
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const W = 160;
  const H = 36;
  const max = 100;
  const min = 0;
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * W;
    const y = H - ((s - min) / (max - min)) * H;
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="overflow-visible"
      aria-label="Recent score trend"
      role="img"
    >
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="var(--accent)" />
    </svg>
  );
}

export default function GreetingBand({ attempts }: Props) {
  const recent = attempts.slice(-10).map((a) => a.score.total);
  const line = recentLine(attempts);
  return (
    <div className="flex items-start gap-5">
      <div className="shrink-0 hidden sm:block">
        <Mascot mood="watching" size="xl" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted">
          {greeting()}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
          {attempts.length === 0
            ? "Let's see what you do."
            : "Where you left off."}
        </h1>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">{line}</p>
        {recent.length >= 2 && (
          <div className="pt-2 flex items-center gap-3">
            <Sparkline scores={recent} />
            <span className="text-[11px] text-muted">
              Last {recent.length} score{recent.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
