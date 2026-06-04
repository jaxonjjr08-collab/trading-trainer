// v5.3.0 — Pins the perp leverage math used by the paper-trading and
// portfolio surfaces. These functions drive the displayed liquidation
// price, the funding-cost accrual per candle, and the "did the candle
// liquidate me?" check — every wrong-direction bug here would be a
// visible "you got rugged" moment for the user.

import { describe, it, expect } from "vitest";
import {
  DEFAULT_FUNDING_RATE_PCT_PER_8H,
  FUNDING_PERIOD_SECONDS,
  fundingCostForCandle,
  liquidationPrice,
  wasLiquidated,
  MAINTENANCE_MARGIN_PCT,
} from "../leverage";
import type { PortfolioPosition } from "../types";

function mkPosition(over: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: "p1",
    symbol: "BTC-USD",
    direction: "long",
    entry: 60000,
    stopLoss: 58000,
    takeProfit: 65000,
    riskPercent: 1,
    openedAtIdx: 0,
    status: "open",
    ...over,
  };
}

describe("liquidationPrice", () => {
  it("returns null for spot (leverage 1)", () => {
    expect(liquidationPrice(60000, "long", 1)).toBeNull();
  });

  it("returns null for invalid leverage or entry", () => {
    expect(liquidationPrice(0, "long", 10)).toBeNull();
    expect(liquidationPrice(60000, "long", NaN)).toBeNull();
  });

  it("long liquidation sits below entry; tighter as leverage grows", () => {
    const liq10 = liquidationPrice(100, "long", 10)!;
    const liq25 = liquidationPrice(100, "long", 25)!;
    expect(liq10).toBeLessThan(100);
    expect(liq25).toBeLessThan(100);
    expect(liq25).toBeGreaterThan(liq10); // tighter to entry at higher leverage
  });

  it("short liquidation sits above entry; tighter as leverage grows", () => {
    const liq10 = liquidationPrice(100, "short", 10)!;
    const liq25 = liquidationPrice(100, "short", 25)!;
    expect(liq10).toBeGreaterThan(100);
    expect(liq25).toBeGreaterThan(100);
    expect(liq25).toBeLessThan(liq10);
  });

  it("formula matches entry * (1 ± (1 - maint)/leverage)", () => {
    const entry = 100;
    const lev = 10;
    const maint = MAINTENANCE_MARGIN_PCT / 100;
    const expectedLong = entry * (1 - (1 - maint) / lev);
    const expectedShort = entry * (1 + (1 - maint) / lev);
    expect(liquidationPrice(entry, "long", lev)).toBeCloseTo(expectedLong, 6);
    expect(liquidationPrice(entry, "short", lev)).toBeCloseTo(expectedShort, 6);
  });
});

describe("fundingCostForCandle", () => {
  it("returns 0 for spot positions", () => {
    expect(fundingCostForCandle(mkPosition({ leverage: 1 }), 3600)).toBe(0);
    expect(fundingCostForCandle(mkPosition(), 3600)).toBe(0); // undefined leverage = spot
  });

  it("longs pay positive funding (cost to PnL)", () => {
    const cost = fundingCostForCandle(
      mkPosition({ leverage: 10 }),
      FUNDING_PERIOD_SECONDS
    );
    expect(cost).toBeGreaterThan(0);
  });

  it("shorts receive negative funding (subtract a negative = boost PnL)", () => {
    const cost = fundingCostForCandle(
      mkPosition({ direction: "short", leverage: 10 }),
      FUNDING_PERIOD_SECONDS
    );
    expect(cost).toBeLessThan(0);
  });

  it("scales linearly with the candle interval", () => {
    const oneHour = fundingCostForCandle(
      mkPosition({ leverage: 5 }),
      3600
    );
    const eightHours = fundingCostForCandle(
      mkPosition({ leverage: 5 }),
      FUNDING_PERIOD_SECONDS
    );
    expect(eightHours).toBeCloseTo(oneHour * 8, 8);
  });

  it("scales with leverage (more leverage = more notional = more drag)", () => {
    const lev2 = fundingCostForCandle(mkPosition({ leverage: 2 }), 3600);
    const lev10 = fundingCostForCandle(mkPosition({ leverage: 10 }), 3600);
    expect(lev10).toBeCloseTo(lev2 * 5, 8);
  });

  it("uses default funding rate when not overridden", () => {
    const cost = fundingCostForCandle(
      mkPosition({ leverage: 5 }),
      FUNDING_PERIOD_SECONDS,
      DEFAULT_FUNDING_RATE_PCT_PER_8H
    );
    // Trainer's simplified formula: cost = rate × leverage × riskPercent.
    // With rate = 0.01 (per 8h), leverage = 5, riskPercent = 1 →
    //   cost = 0.01 × 5 × 1 = 0.05 (% of account per 8h period).
    expect(cost).toBeCloseTo(0.05, 6);
  });
});

describe("wasLiquidated", () => {
  it("returns false for spot positions (no liquidation level)", () => {
    const p = mkPosition({ leverage: 1, liquidationPrice: undefined });
    expect(wasLiquidated(p, 60000, 50000)).toBe(false);
  });

  it("long: liquidated when candle low crosses the liq level", () => {
    const liq = 54000;
    const p = mkPosition({
      leverage: 10,
      liquidationPrice: liq,
    });
    expect(wasLiquidated(p, 60500, 55000)).toBe(false); // low above liq
    expect(wasLiquidated(p, 60500, liq)).toBe(true); // low touches liq
    expect(wasLiquidated(p, 60500, 53000)).toBe(true); // low below liq
  });

  it("short: liquidated when candle high crosses the liq level", () => {
    const liq = 66000;
    const p = mkPosition({
      direction: "short",
      leverage: 10,
      liquidationPrice: liq,
    });
    expect(wasLiquidated(p, 65500, 59000)).toBe(false); // high below liq
    expect(wasLiquidated(p, liq, 59000)).toBe(true); // high touches liq
    expect(wasLiquidated(p, 67000, 59000)).toBe(true); // high above liq
  });
});
