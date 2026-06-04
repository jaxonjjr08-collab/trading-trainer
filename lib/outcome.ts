import type { Decision, ManagementDecision, Outcome, Scenario } from "./types";
import { estimateLiquidationPrice } from "./scoring";

/**
 * v2.0 — outcome simulation that honours trade-management decisions.
 *
 * Walks the hidden candles in order. At each managementDecision's candleIndex,
 * applies the action:
 *   - move_stop_be: updates the working stop to entry
 *   - partial_50:   books a fill at that candle's close for half the position
 *   - exit:         books a fill at that candle's close for the full remaining
 *   - hold:         no-op
 *
 * Then continues scanning candles for liq / stop / TP on the remaining position.
 * Final PnL is the weighted sum of every fill (partials + final).
 */
export function simulateOutcomeWithManagement(
  scenario: Scenario,
  decision: Decision,
  managementDecisions: ManagementDecision[]
): Outcome {
  if (decision.direction === "wait") return simulateOutcome(scenario, decision);
  const { entry, stopLoss, takeProfit, leverage, riskPercent, direction } = decision;
  if (entry == null || stopLoss == null || takeProfit == null) {
    return simulateOutcome(scenario, decision);
  }

  const lev = leverage ?? 1;
  const liq = estimateLiquidationPrice(direction, entry, lev);
  // managementDecision candleIndex is into the combined visible+hidden list.
  // Translate to hidden-only index for our loop.
  const visLen = scenario.visibleCandles.length;
  const mgmtByHiddenIdx = new Map<number, ManagementDecision>();
  for (const m of managementDecisions) {
    const hiddenIdx = m.candleIndex - visLen;
    if (hiddenIdx >= 0 && hiddenIdx < scenario.hiddenCandles.length) {
      mgmtByHiddenIdx.set(hiddenIdx, m);
    }
  }

  let workingStop = stopLoss;
  let remainingPct = 1; // 1 = full
  const fills: { pct: number; price: number; reason: "tp" | "sl" | "liq" | "partial" | "exit" | "end" }[] = [];
  let liquidated = false;
  let finalExitIdx = -1;
  let finalHit: Outcome["hit"] = "neither";

  for (let i = 0; i < scenario.hiddenCandles.length; i++) {
    const c = scenario.hiddenCandles[i];

    // Process any management action that fires at the START of this candle.
    const m = mgmtByHiddenIdx.get(i);
    if (m && remainingPct > 0) {
      if (m.action === "move_stop_be") {
        workingStop = entry;
      } else if (m.action === "partial_50") {
        const part = remainingPct * 0.5;
        fills.push({ pct: part, price: c.close, reason: "partial" });
        remainingPct -= part;
      } else if (m.action === "exit") {
        fills.push({ pct: remainingPct, price: c.close, reason: "exit" });
        remainingPct = 0;
        finalExitIdx = i;
        finalHit = "neither";
        break;
      }
    }

    if (remainingPct === 0) break;

    // Now check liq / stop / TP on the remaining position.
    if (direction === "long") {
      if (liq != null && c.low <= liq) {
        fills.push({ pct: remainingPct, price: liq, reason: "liq" });
        liquidated = true;
        finalExitIdx = i;
        finalHit = "liq";
        remainingPct = 0;
        break;
      }
      if (c.low <= workingStop) {
        fills.push({ pct: remainingPct, price: workingStop, reason: "sl" });
        finalExitIdx = i;
        finalHit = "sl";
        remainingPct = 0;
        break;
      }
      if (c.high >= takeProfit) {
        fills.push({ pct: remainingPct, price: takeProfit, reason: "tp" });
        finalExitIdx = i;
        finalHit = "tp";
        remainingPct = 0;
        break;
      }
    } else {
      if (liq != null && c.high >= liq) {
        fills.push({ pct: remainingPct, price: liq, reason: "liq" });
        liquidated = true;
        finalExitIdx = i;
        finalHit = "liq";
        remainingPct = 0;
        break;
      }
      if (c.high >= workingStop) {
        fills.push({ pct: remainingPct, price: workingStop, reason: "sl" });
        finalExitIdx = i;
        finalHit = "sl";
        remainingPct = 0;
        break;
      }
      if (c.low <= takeProfit) {
        fills.push({ pct: remainingPct, price: takeProfit, reason: "tp" });
        finalExitIdx = i;
        finalHit = "tp";
        remainingPct = 0;
        break;
      }
    }
  }

  if (remainingPct > 0) {
    // Trade never resolved within the hidden window — exit at last close.
    const last = scenario.hiddenCandles[scenario.hiddenCandles.length - 1];
    fills.push({ pct: remainingPct, price: last?.close ?? entry, reason: "end" });
    finalExitIdx = scenario.hiddenCandles.length - 1;
    finalHit = "neither";
  }

  // Weighted PnL across all fills.
  let pnlPercent = 0;
  if (riskPercent != null && riskPercent > 0) {
    const riskFraction = riskPercent / 100;
    const stopDist = Math.abs(entry - stopLoss) / entry;
    if (stopDist > 0) {
      const notionalFraction = riskFraction / stopDist;
      for (const f of fills) {
        const priceChange = direction === "long" ? (f.price - entry) / entry : (entry - f.price) / entry;
        pnlPercent += priceChange * notionalFraction * 100 * f.pct;
      }
    }
  } else {
    for (const f of fills) {
      const priceChange = direction === "long" ? (f.price - entry) / entry : (entry - f.price) / entry;
      pnlPercent += priceChange * lev * 100 * f.pct;
    }
  }
  if (liquidated) pnlPercent = Math.max(pnlPercent, -100);

  const finalFill = fills[fills.length - 1];
  return {
    hit: finalHit,
    exitPrice: finalFill?.price ?? entry,
    exitCandleIndex: finalExitIdx,
    pnlPercent,
    liquidated,
    estimatedLiquidationPrice: liq,
  };
}

export function simulateOutcome(scenario: Scenario, decision: Decision): Outcome {
  if (decision.direction === "wait") {
    return {
      hit: "neither",
      exitPrice: scenario.context.currentPrice,
      exitCandleIndex: -1,
      pnlPercent: 0,
      liquidated: false,
      estimatedLiquidationPrice: null,
    };
  }

  const { entry, stopLoss, takeProfit, leverage, riskPercent, accountSize, direction } = decision;
  if (entry == null || stopLoss == null || takeProfit == null) {
    return {
      hit: "neither",
      exitPrice: scenario.context.currentPrice,
      exitCandleIndex: -1,
      pnlPercent: 0,
      liquidated: false,
      estimatedLiquidationPrice: null,
    };
  }

  const lev = leverage ?? 1;
  const liq = estimateLiquidationPrice(direction, entry, lev);

  let hit: Outcome["hit"] = "neither";
  let exitPrice = scenario.hiddenCandles[scenario.hiddenCandles.length - 1]?.close ?? entry;
  let exitCandleIndex = -1;
  let liquidated = false;

  for (let i = 0; i < scenario.hiddenCandles.length; i++) {
    const c = scenario.hiddenCandles[i];
    if (direction === "long") {
      if (liq != null && c.low <= liq) {
        hit = "liq";
        exitPrice = liq;
        exitCandleIndex = i;
        liquidated = true;
        break;
      }
      if (c.low <= stopLoss) {
        hit = "sl";
        exitPrice = stopLoss;
        exitCandleIndex = i;
        break;
      }
      if (c.high >= takeProfit) {
        hit = "tp";
        exitPrice = takeProfit;
        exitCandleIndex = i;
        break;
      }
    } else {
      if (liq != null && c.high >= liq) {
        hit = "liq";
        exitPrice = liq;
        exitCandleIndex = i;
        liquidated = true;
        break;
      }
      if (c.high >= stopLoss) {
        hit = "sl";
        exitPrice = stopLoss;
        exitCandleIndex = i;
        break;
      }
      if (c.low <= takeProfit) {
        hit = "tp";
        exitPrice = takeProfit;
        exitCandleIndex = i;
        break;
      }
    }
  }

  // PnL on account, factoring leverage. Position notional sized so that a move
  // from entry to stop equals riskPercent of account (when riskPercent provided).
  let pnlPercent = 0;
  if (riskPercent != null && riskPercent > 0) {
    const riskFraction = riskPercent / 100;
    const stopDist = Math.abs(entry - stopLoss) / entry;
    if (stopDist > 0) {
      // Notional as fraction of account: riskFraction / stopDist (in entry-price terms).
      const notionalFraction = riskFraction / stopDist;
      const priceChange = direction === "long" ? (exitPrice - entry) / entry : (entry - exitPrice) / entry;
      pnlPercent = priceChange * notionalFraction * 100;
    }
  } else {
    // Fallback: full account at chosen leverage.
    const priceChange = direction === "long" ? (exitPrice - entry) / entry : (entry - exitPrice) / entry;
    pnlPercent = priceChange * lev * 100;
  }

  if (liquidated) {
    // Floor at -100%: you can't lose more than your account.
    pnlPercent = Math.max(pnlPercent, -100);
  }

  return {
    hit,
    exitPrice,
    exitCandleIndex,
    pnlPercent,
    liquidated,
    estimatedLiquidationPrice: liq,
  };
}
