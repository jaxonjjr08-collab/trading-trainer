// v4.1 — Multi-symbol synthetic OHLC for the portfolio simulator.
//
// Generates aligned-timestamp candles for N symbols over a 7-day window
// (default: 4h candles → 42 ticks). Each symbol's drift is a linear
// combination of a shared "market" drift and an idiosyncratic noise term,
// weighted so the realized close-on-close correlation matches the desired ρ:
//
//   drift_i = ρ_i * market + sqrt(1 - ρ_i²) * idio_i
//
// The candle OHLC is then built around the drift much like lib/scenarios'
// genCandles — deterministic via seed, mild wick added per candle.
//
// We don't reuse genCandles directly because:
//   - it takes a fixed move script, but here the drift sequence is derived
//     from the market factor at runtime
//   - we want all symbols to share the same time index (aligned) which means
//     we drive volume + wick noise from a deterministic per-symbol sub-seed
//
// Defaults are tuned so a 7-day session has visible drift but no symbol
// blows up by more than ~25% in either direction — the lesson is about
// portfolio composition, not catastrophic scenarios.

import { makeRng } from "./scenarios";
import type { Candle, PortfolioSymbol } from "./types";

export const DEFAULT_INTERVAL_SEC = 14400; // 4h
export const DEFAULT_CANDLE_COUNT = 42; // 4h × 7d
export const PORTFOLIO_DATA_VERSION = 1;

// Per-tick standard deviation of returns. Picks a vol mild enough that a 5%
// risk-per-trade beginner doesn't get blown out by candle noise alone, while
// being lively enough that a stop placed 1.5% from entry actually gets tested
// across a 42-candle window.
const TICK_VOL = 0.012;

// Mild upward drift on the synthetic market — crypto trainers should reflect
// real long-bias most of the time. Tunable per session via opts.marketDrift.
const DEFAULT_MARKET_DRIFT = 0.001;

export type PortfolioSymbolSpec = {
  symbol: string;
  basePrice: number;
  marketCorrelation: number; // ρ ∈ [0, 1]
};

// The default basket: BTC + ETH highly correlated; SOL a moderate
// follower; DOGE a sentiment-driven mid-correlation alt; LINK a low-
// correlation diversifier. Five symbols on purpose — the drill is "Run 5
// concurrent trades for 7 days."
export const DEFAULT_BASKET: PortfolioSymbolSpec[] = [
  { symbol: "BTC/USD", basePrice: 62000, marketCorrelation: 0.9 },
  { symbol: "ETH/USD", basePrice: 3200, marketCorrelation: 0.85 },
  { symbol: "SOL/USD", basePrice: 145, marketCorrelation: 0.75 },
  { symbol: "DOGE/USD", basePrice: 0.12, marketCorrelation: 0.5 },
  { symbol: "LINK/USD", basePrice: 14, marketCorrelation: 0.25 },
];

// Box-Muller normal sampler from a uniform RNG. Produces ~N(0, 1).
function gaussian(rng: () => number): number {
  // Avoid log(0).
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Build one symbol's candles from a shared drift sequence. Wicks + volume are
// driven by a per-symbol sub-seed so each symbol's noise is independent even
// though their drifts are correlated.
function buildSymbolCandles(
  spec: PortfolioSymbolSpec,
  marketDrifts: number[],
  startTime: number,
  intervalSec: number,
  symbolSeed: number
): Candle[] {
  const idioRng = makeRng(symbolSeed);
  const wickRng = makeRng(symbolSeed ^ 0xa5a5_a5a5);
  const out: Candle[] = [];
  const rho = spec.marketCorrelation;
  const idioWeight = Math.sqrt(Math.max(0, 1 - rho * rho));
  let price = spec.basePrice;

  for (let i = 0; i < marketDrifts.length; i++) {
    const market = marketDrifts[i];
    const idio = gaussian(idioRng) * TICK_VOL;
    const drift = rho * market + idioWeight * idio;
    const open = price;
    const close = open * (1 + drift);
    const body = Math.abs(close - open);
    const wickAmp = open * TICK_VOL * 0.8;
    const high =
      Math.max(open, close) + body * wickRng() * 0.7 + wickAmp * wickRng();
    const low =
      Math.min(open, close) - body * wickRng() * 0.7 - wickAmp * wickRng();
    const volume = Math.round(
      100 + wickRng() * 4000 + Math.abs(drift) * 50000
    );
    const round = spec.basePrice >= 1000 ? 2 : spec.basePrice >= 10 ? 3 : 5;
    out.push({
      time: startTime + i * intervalSec,
      open: Number(open.toFixed(round)),
      high: Number(high.toFixed(round)),
      low: Number(low.toFixed(round)),
      close: Number(close.toFixed(round)),
      volume,
    });
    price = close;
  }
  return out;
}

export type GeneratePortfolioOpts = {
  seed: number;
  startTime?: number;          // unix seconds at candle 0
  intervalSec?: number;        // candle width
  candleCount?: number;        // total ticks in the timeline
  basket?: PortfolioSymbolSpec[];
  marketDrift?: number;        // per-tick mean drift of the market factor
};

// Generates aligned-timestamp PortfolioSymbol[] using a market-beta model.
// Deterministic per (seed, basket, candleCount).
export function generatePortfolio(
  opts: GeneratePortfolioOpts
): PortfolioSymbol[] {
  const startTime = opts.startTime ?? Math.floor(Date.now() / 1000);
  const intervalSec = opts.intervalSec ?? DEFAULT_INTERVAL_SEC;
  const candleCount = opts.candleCount ?? DEFAULT_CANDLE_COUNT;
  const basket = opts.basket ?? DEFAULT_BASKET;
  const drift = opts.marketDrift ?? DEFAULT_MARKET_DRIFT;

  // Synthetic market drift series — every symbol gets a weighted share of
  // this. Same seed → same series; chained sub-seeds keep symbol noise
  // independent across runs.
  const marketRng = makeRng(opts.seed);
  const marketDrifts: number[] = new Array(candleCount);
  for (let i = 0; i < candleCount; i++) {
    marketDrifts[i] = drift + gaussian(marketRng) * TICK_VOL;
  }

  return basket.map((spec, idx) => {
    // Mix the seed with the symbol index so changing basket order doesn't
    // silently produce identical candles for the symbol in slot 0.
    const symbolSeed = (opts.seed ^ (0x9e37_79b9 * (idx + 1))) >>> 0;
    const candles = buildSymbolCandles(
      spec,
      marketDrifts,
      startTime,
      intervalSec,
      symbolSeed
    );
    return {
      symbol: spec.symbol,
      basePrice: spec.basePrice,
      marketCorrelation: spec.marketCorrelation,
      candles,
    };
  });
}
