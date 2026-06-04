"use client";

import { useMemo } from "react";
import type {
  Decision,
  ManagementAction,
  ManagementDecision,
  ManagementPoint,
  Scenario,
} from "@/lib/types";

type Props = {
  scenario: Scenario;
  decision: Decision;
  decisions: ManagementDecision[];
  pointIdx: number;
  remainingPct: number;
  workingStop: number;
  onAction: (action: ManagementAction) => void;
};

const ACTION_LABEL: Record<ManagementAction, string> = {
  hold: "Hold",
  move_stop_be: "Move stop to break-even",
  partial_50: "Take 50% off",
  exit: "Exit fully",
};

const ACTION_HINT: Record<ManagementAction, string> = {
  hold: "Do nothing. Let the trade play out.",
  move_stop_be: "Stop moves to your entry price. Worst case is scratch.",
  partial_50: "Close half of what's left at the current candle close. Lock in gain.",
  exit: "Close the entire remaining position at the current candle close.",
};

export default function ManagementPanel({
  scenario,
  decision,
  decisions: _decisions,
  pointIdx,
  remainingPct,
  workingStop,
  onAction,
}: Props) {
  const points = scenario.managementPoints ?? [];
  const point: ManagementPoint | undefined = points[pointIdx];

  // Current candle context — show price at the management point so the user
  // can see what price did since entry.
  const candleAtPoint = useMemo(() => {
    if (!point) return null;
    const visLen = scenario.visibleCandles.length;
    const hiddenIdx = point.candleIndex - visLen;
    return scenario.hiddenCandles[hiddenIdx] ?? null;
  }, [scenario, point]);

  if (!point || !candleAtPoint) {
    return (
      <div className="text-sm text-muted">
        Computing outcome…
      </div>
    );
  }

  const fmt = (n: number) => (n >= 1000 ? n.toFixed(0) : n.toFixed(2));
  const moveFromEntry =
    decision.entry != null
      ? ((candleAtPoint.close - decision.entry) / decision.entry) * 100
      : 0;
  const inFavor =
    decision.direction === "long" ? moveFromEntry > 0 : moveFromEntry < 0;
  const absMove = Math.abs(moveFromEntry).toFixed(2);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-accent">
          <span>Trade management — point {pointIdx + 1} of {points.length}</span>
          <span className="text-muted normal-case tracking-normal">
            position: {Math.round(remainingPct)}%
          </span>
        </div>
        <h2 className="text-lg font-semibold mt-1">{point.prompt}</h2>
      </div>

      <div className="rounded-md border border-line bg-panel2 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted">Price now</span>
          <span className="font-mono font-semibold">${fmt(candleAtPoint.close)}</span>
        </div>
        {decision.entry != null && (
          <div className="flex justify-between">
            <span className="text-muted">Your entry</span>
            <span className="font-mono">${fmt(decision.entry)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted">Working stop</span>
          <span className="font-mono">${fmt(workingStop)}</span>
        </div>
        {decision.takeProfit != null && (
          <div className="flex justify-between">
            <span className="text-muted">Take profit</span>
            <span className="font-mono">${fmt(decision.takeProfit)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t border-line">
          <span className="text-muted">Move from entry</span>
          <span className={`font-mono font-semibold ${inFavor ? "text-good" : "text-bad"}`}>
            {inFavor ? "+" : "-"}{absMove}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(["hold", "move_stop_be", "partial_50", "exit"] as ManagementAction[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAction(a)}
            className="text-left rounded-md border border-line bg-panel hover:bg-panel2 hover:border-accent/40 px-3 py-2 transition-colors"
          >
            <div className="text-sm font-semibold">{ACTION_LABEL[a]}</div>
            <div className="text-xs text-muted mt-0.5">{ACTION_HINT[a]}</div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted leading-snug">
        Pick one. The rationale and ideal action are revealed in the review after outcome.
      </p>
    </div>
  );
}
