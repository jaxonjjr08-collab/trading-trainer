"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// v2.9 — Replaces the old ActiveDrillBanner. While the drill is in progress
// (completed < targetAttempts), renders the same warn-tinted progress strip.
// Once the target is hit, swaps to the DrillCompletion celebration card with
// before/after skill delta and a Mark-complete CTA.

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearActiveDrill, getActiveDrill, listAttempts } from "@/lib/storage";
import { drillById } from "@/lib/drills";
import DrillCompletion from "../DrillCompletion";
import type { Attempt } from "@/lib/types";

export default function DrillStatusBanner({
  drillId,
  sessionTrigger,
  onClearDrill,
}: {
  drillId: string | null;
  sessionTrigger: number;
  onClearDrill: () => void;
}) {
  const [active, setActive] = useState<ReturnType<typeof getActiveDrill>>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    setActive(getActiveDrill());
    setAttempts(listAttempts());
    // sessionTrigger re-reads after each save so the count updates without a
    // page reload. eslint-disable to keep the dep array honest about the
    // trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillId, sessionTrigger]);

  if (!drillId) return null;
  const drill = drillById(drillId);
  if (!drill || !active || active.drillId !== drill.id) return null;

  const done = active.completed;
  const isComplete = done >= drill.targetAttempts;

  if (isComplete) {
    return (
      <DrillCompletion
        drill={drill}
        activeDrill={active}
        attempts={attempts}
        onClear={() => {
          clearActiveDrill();
          onClearDrill();
        }}
      />
    );
  }

  return (
    <div className="rounded-md border border-warn/40 bg-warn/5 p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-warn">Active drill</div>
        <div className="text-sm font-semibold mt-0.5">
          {drill.title}
          <span className="text-muted font-normal ml-2">
            {done}/{drill.targetAttempts} attempts
          </span>
        </div>
      </div>
      <Link
        href="/training"
        className="shrink-0 text-xs text-muted hover:text-text border border-line bg-panel px-3 py-1.5 rounded-md"
      >
        Back to Training Path
      </Link>
    </div>
  );
}
