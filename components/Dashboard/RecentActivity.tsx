"use client";

// v2.6 — Recent activity. Five most-recent attempts as a clean inline list.
// Replaces the History tab's full-list (which moves to /journal). No card
// border, no separator rules — just a quiet list with hover affordance.

import Link from "next/link";
import type { Attempt } from "@/lib/types";
import { getScenarioById } from "@/lib/scenarios";

type Props = {
  attempts: Attempt[];
  limit?: number;
};

function scoreTone(n: number): string {
  if (n >= 70) return "text-good";
  if (n >= 50) return "text-warn";
  return "text-bad";
}

export default function RecentActivity({ attempts, limit = 5 }: Props) {
  if (attempts.length === 0) return null;
  const recent = [...attempts].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Recent attempts</h2>
        <Link href="/journal" className="text-xs text-muted hover:text-text underline">
          Open journal →
        </Link>
      </div>
      <ul className="space-y-1">
        {recent.map((a) => {
          const scn = getScenarioById(a.scenarioId);
          return (
            <li key={a.id}>
              <Link
                href={`/journal/${a.id}`}
                className="flex items-center gap-3 text-sm rounded-md px-3 py-2 hover:bg-panel2/60 transition-colors"
              >
                <span className="text-xs text-muted w-24 tab-nums">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <span className="w-16 uppercase font-semibold text-xs">
                  {a.decision.direction}
                </span>
                <span className="text-xs flex-1 truncate text-text">
                  {scn ? scn.title : (
                    <span className="text-muted italic">
                      {a.scenarioId.startsWith("proc-") ? "Procedural scenario" : "Removed scenario"}
                    </span>
                  )}
                </span>
                <span className={`font-mono font-semibold tab-nums ${scoreTone(a.score.total)}`}>
                  {a.score.total}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
