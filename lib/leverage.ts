// v5.3.0 — Pure math for perpetual-futures-style leverage.
//
// The trainer's leverage model is deliberately simplified:
//   - One maintenance-margin rate (0.5%) regardless of position size.
//   - One funding rate (configurable; defaults to 0.01% per 8 hours, the
//     typical baseline on Binance/Bybit/OKX perps for major pairs).
//   - Funding is paid by longs to shorts (or vice versa) every 8 hours; the
//     trainer prorates it per candle so a 1m chart accrues 1/480 of the
//     8-hour rate per bar.
//   - Liquidation triggers when price crosses the calculated level on any
//     intra-bar high/low (worst-case fill — the trainer optimises for
//     teaching the cost of bad sizing, not for sugarcoating it).
//
// These simplifications mean the trainer's "leveraged perp" is honest
// directionally — bigger size means closer liquidation, funding costs
// nibble at the position — without modeling the full complexity of partial
// liquidations, ADL queues, or exchange-specific maintenance tiers.

import type { PortfolioPosition } from "./types";

// Maintenance margin — the cushion that protects the exchange from a
// position whose loss exceeds the posted margin. Standard 0.5% across
// most major venues for liquid pairs.
export const MAINTENANCE_MARGIN_PCT = 0.5;

// Default funding rate: 0.01% per 8h. Crypto perps typically range
// ±0.01% during normal regimes, spiking to ±0.1% during euphoric or
// fearful conditions. The trainer assumes a neutral baseline; future
// versions can vary it per scenario or per market context.
export const DEFAULT_FUNDING_RATE_PCT_PER_8H = 0.01;
export const FUNDING_PERIOD_SECONDS = 8 * 3600;

// Compute the price at which a leveraged position is liquidated. Returns
// null for spot positions (no liquidation). For leveraged positions the
// formula is the textbook one:
//
//   Long  liq = entry × (1 - (1 - maint) / leverage)
//   Short liq = entry × (1 + (1 - maint) / leverage)
//
// Maintenance is expressed as a fraction (0.005 for 0.5%). Higher
// leverage tightens liquidation; lower leverage widens it.
export function liquidationPrice(
  entry: number,
  direction: "long" | "short",
  leverage: number,
  maintenancePct: number = MAINTENANCE_MARGIN_PCT
): number | null {
  if (leverage <= 1) return null; // spot — no liquidation
  if (!isFinite(entry) || entry <= 0) return null;
  if (!isFinite(leverage)) return null;
  const maint = maintenancePct / 100;
  const buffer = (1 - maint) / leverage;
  return direction === "long"
    ? entry * (1 - buffer)
    : entry * (1 + buffer);
}

// Funding cost accrued over a given candle interval. The trainer charges
// LONGS during positive-funding regimes (default) and SHORTS during
// negative ones. Result is a SIGNED percent-of-account number: positive
// means cost paid (subtracts from PnL), negative means funding received.
//
// Convention: rate is per 8h (the standard perp interval). The candle's
// interval may be shorter (1m, 1h, etc.) or longer (1d) — we prorate
// linearly.
//
// For a 1× spot position, returns 0 — spot has no funding.
export function fundingCostForCandle(
  position: PortfolioPosition,
  candleIntervalSec: number,
  ratePct8h: number = DEFAULT_FUNDING_RATE_PCT_PER_8H
): number {
  const lev = position.leverage ?? 1;
  if (lev <= 1) return 0;
  const proratedRate = (ratePct8h * candleIntervalSec) / FUNDING_PERIOD_SECONDS;
  // Funding is applied to the NOTIONAL position size (margin × leverage),
  // expressed as % of account. notional/account = leverage × risk fraction.
  // For the trainer we approximate: cost = rate × leverage × riskPercent.
  // This keeps "more leverage = more funding drag" honest without modeling
  // the exact notional ratio per symbol.
  const cost = proratedRate * lev * position.riskPercent;
  // Longs pay positive funding; shorts pay negative funding (i.e. they
  // receive it). The trainer ships with positive baseline.
  return position.direction === "long" ? cost : -cost;
}

// Decide whether a leveraged position's liquidation level was crossed
// inside a candle's high/low range. Returns true iff the price RANGE for
// that candle would have triggered the liquidation. Conservative — uses
// the worst-case intra-bar excursion, not just the close.
export function wasLiquidated(
  position: PortfolioPosition,
  candleHigh: number,
  candleLow: number
): boolean {
  const liq = position.liquidationPrice;
  if (liq == null) return false;
  return position.direction === "long" ? candleLow <= liq : candleHigh >= liq;
}
