// v5.12.0 — Derive trade-management points from a scenario's ideal plan and
// its actual hidden price action.
//
// Background: only 3 of the authored scenarios shipped hand-written
// `managementPoints`, so the "manage the trade after entry" skill (move stop
// to break-even, take partials, exit the runner) almost never got practiced.
// Hand-authoring the other ~40 is tedious AND fragile — a wrong candleIndex or
// an idealAction that contradicts what price actually did teaches the wrong
// lesson.
//
// Instead we derive them. Every authored scenario carries an
// `idealDecisionPlan` (entry / stop / take-profit / direction). We replay that
// reference trade through the hidden candles and place management prompts at
// the moments that matter:
//
//   +1R reached      → move stop to break-even  (protect a paying trade)
//   +2R / near target → take a partial           (bank some of the win)
//   near TP / matured → exit the runner          (don't give it back)
//
// Crucially, we only emit points when the trade genuinely runs in profit —
// if the reference trade would hit its stop before reaching +1R, there's
// nothing to manage and we return []. That keeps the management flow honest:
// it fires on the winners, where management actually changes the result.
//
// Pure + deterministic so it's testable and safe to run at module load over
// the whole scenario list.

import type { ManagementPoint, Scenario } from "./types";

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

// Generic, action-specific teaching rationale. Mirrors the tone of the
// hand-authored scenarios so derived and authored points read alike.
const RATIONALE = {
  move_stop_be:
    "A trade that's run a full R in your favour should never be allowed to become a loss. Moving the stop to entry makes the worst case a scratch — protection that costs you nothing.",
  partial_50:
    "Banking half here locks in a real win and takes the pressure off the rest. The runner can chase the target with house money; if it reverses, you've still booked profit.",
  exit:
    "The move is stretched and the easy part is over. Taking the rest near the target beats holding for a few extra ticks and giving back the move on the inevitable pullback.",
} as const;

export function deriveManagementPoints(scenario: Scenario): ManagementPoint[] {
  const plan = scenario.idealDecisionPlan;
  if (!plan || plan.direction === "wait") return [];
  const { direction } = plan;
  const entry = plan.entry;
  const stop = plan.stopLoss;
  const tp = plan.takeProfit;
  if (entry == null || stop == null || tp == null) return [];

  const R = Math.abs(entry - stop);
  if (R <= 0) return [];
  const tpDist = Math.abs(tp - entry);
  if (tpDist <= 0) return [];

  const hidden = scenario.hiddenCandles;
  // Need a few candles of room after entry for management to make sense.
  if (hidden.length < 4) return [];
  const visLen = scenario.visibleCandles.length;
  const isLong = direction === "long";

  // Favourable excursion at a candle, in price units (how far the trade is
  // in profit at this bar's extreme).
  const favOf = (c: Scenario["hiddenCandles"][number]) =>
    isLong ? c.high - entry : entry - c.low;
  // Whether this candle would tag the ORIGINAL stop (the trade loses).
  const stopHit = (c: Scenario["hiddenCandles"][number]) =>
    isLong ? c.low <= stop : c.high >= stop;

  // Scan for milestones. Bail the moment the trade would have lost before
  // reaching +1R — there's nothing to manage on a loser.
  let idx1R = -1;
  let idx2R = -1;
  let idxNearTp = -1;
  let maxFavR = 0;

  for (let i = 0; i < hidden.length; i++) {
    const c = hidden[i];
    if (idx1R === -1 && stopHit(c)) return []; // lost before any profit
    const favR = favOf(c) / R;
    if (favR > maxFavR) maxFavR = favR;
    if (idx1R === -1 && favR >= 1) idx1R = i;
    if (idx1R !== -1 && idx2R === -1 && i > idx1R && favR >= 2) idx2R = i;
    // Near target = within 10% of the entry→TP distance.
    if (
      idxNearTp === -1 &&
      favOf(c) >= tpDist * 0.9 &&
      (idx1R === -1 || i >= idx1R)
    ) {
      idxNearTp = i;
    }
  }

  if (idx1R === -1) return []; // never reached +1R

  const points: ManagementPoint[] = [];
  const used = new Set<number>();

  const pushPoint = (
    hiddenIdx: number,
    idealAction: keyof typeof RATIONALE,
    acceptableActions: ManagementPoint["acceptableActions"],
    prompt: string
  ) => {
    if (hiddenIdx < 0 || hiddenIdx >= hidden.length) return;
    if (used.has(hiddenIdx)) return;
    used.add(hiddenIdx);
    points.push({
      candleIndex: visLen + hiddenIdx,
      prompt,
      idealAction,
      acceptableActions,
      rationale: RATIONALE[idealAction],
    });
  };

  // M1 — protect at +1R.
  {
    const c = hidden[idx1R];
    pushPoint(
      idx1R,
      "move_stop_be",
      ["hold"],
      `Price has run about +1R in your favour (now ${fmtPrice(c.close)}). Protect the trade?`
    );
  }

  // M2 — partial once the trade reaches +2R (only on a real extension).
  if (idx2R !== -1 && maxFavR >= 2) {
    const c = hidden[idx2R];
    pushPoint(
      idx2R,
      "partial_50",
      ["hold"],
      `The trade is up roughly +2R (${fmtPrice(c.close)}), past halfway to target. Bank some?`
    );
  }

  // M3 — exit the runner near the target / once the move has matured.
  if (idxNearTp !== -1 && idxNearTp > idx1R) {
    const c = hidden[idxNearTp];
    pushPoint(
      idxNearTp,
      "exit",
      ["partial_50"],
      `Price is near your target (${fmtPrice(c.close)}) and the move is stretched. Take the rest?`
    );
  }

  // Keep them in candle order (pushPoint order is already ascending by
  // construction, but sort defensively in case thresholds overlap).
  points.sort((a, b) => a.candleIndex - b.candleIndex);
  return points;
}

// Returns the scenario with managementPoints filled in: authored points are
// kept as-is; otherwise derived ones are attached (only when non-empty so we
// don't store empty arrays).
export function withDerivedManagement(scenario: Scenario): Scenario {
  if (scenario.managementPoints && scenario.managementPoints.length > 0) {
    return scenario;
  }
  const derived = deriveManagementPoints(scenario);
  if (derived.length === 0) return scenario;
  return { ...scenario, managementPoints: derived };
}
