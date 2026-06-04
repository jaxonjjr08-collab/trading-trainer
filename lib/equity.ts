// v2.2 — Dashboard equity curve. Simulates "what if you had followed every
// decision with your stated risk %", compounding outcome.pnlPercent across
// the user's saved attempts.
//
// pnlPercent already factors in the user's actual riskPercent (see
// lib/outcome.ts line 250) so we compound it directly. Wait attempts
// contribute zero PnL but still produce a point so the curve shows passage
// of time.

import type { Attempt } from "./types";

export type EquityPoint = {
  t: number;        // attempt.createdAt
  equity: number;   // simulated equity in $
  pnlPct: number;   // % move this step contributed
  attemptId: string;
  direction: "long" | "short" | "wait";
};

export type EquitySummary = {
  points: EquityPoint[];
  starting: number;
  current: number;
  peak: number;
  trough: number;
  maxDrawdownPct: number;   // worst peak-to-trough drawdown, as a positive percent
  tradeCount: number;
};

export const DEFAULT_STARTING_EQUITY = 10000;

export function simulateEquityCurve(
  attempts: Attempt[],
  starting: number = DEFAULT_STARTING_EQUITY
): EquitySummary {
  const sorted = [...attempts].sort((a, b) => a.createdAt - b.createdAt);
  const points: EquityPoint[] = [];

  let equity = starting;
  let peak = starting;
  let trough = starting;
  let maxDrawdownPct = 0;

  for (const a of sorted) {
    const pnlPct = a.decision.direction === "wait" ? 0 : a.outcome.pnlPercent;
    equity = equity * (1 + pnlPct / 100);

    if (equity > peak) {
      peak = equity;
      trough = equity;
    } else if (equity < trough) {
      trough = equity;
      const dd = ((peak - trough) / peak) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }

    points.push({
      t: a.createdAt,
      equity,
      pnlPct,
      attemptId: a.id,
      direction: a.decision.direction,
    });
  }

  return {
    points,
    starting,
    current: equity,
    peak,
    trough,
    maxDrawdownPct,
    tradeCount: sorted.length,
  };
}
