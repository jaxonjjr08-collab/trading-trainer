"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// v2.4 — pre-scenario macro context. Reads the lookup table by first-candle
// time and renders a dismissible card. Default-expanded the first time per
// scenario in a session so beginners actually see it; dismissal sticks within
// the session (different scenarios from the same era re-expand by design).

import { useEffect, useState } from "react";
import { macroContextForTime } from "@/lib/macro-context";

export default function MacroBriefCard({
  timeSec,
  scenarioId,
}: {
  timeSec: number;
  scenarioId: string;
}) {
  const brief = macroContextForTime(timeSec);
  const [collapsed, setCollapsed] = useState(false);
  // Reset collapse when the scenario changes so each scenario gets one shot
  // at attention.
  useEffect(() => {
    setCollapsed(false);
  }, [scenarioId]);
  if (!brief) return null;
  return (
    <div className="rounded-md border border-accent/30 bg-accent/5">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent/10"
      >
        <span className="text-xs uppercase tracking-wide text-accent">
          Macro context — what was happening at the time
        </span>
        <span className="text-xs text-accent shrink-0">{collapsed ? "Show" : "Hide"}</span>
      </button>
      {!collapsed && (
        <div className="border-t border-accent/20 px-3 py-3 text-sm text-text leading-relaxed">
          <p>{brief}</p>
          <p className="text-[10px] text-muted mt-2 italic">
            This is background. The scenario was real — knowing the macro doesn't change the chart, but it changes how you read it.
          </p>
        </div>
      )}
    </div>
  );
}
