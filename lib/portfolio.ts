// v4.1 — Portfolio session state + portfolio_risk scoring.
//
// Single source of truth for the simulator's mechanical model:
//   - createSession: produces a fresh PortfolioSession with generated candles
//   - openPosition / closePosition: immutable updates
//   - advanceTo: advances currentIdx and auto-resolves SL/TP hits in between
//   - scorePortfolioRisk: end-of-session 10-pt portfolio_risk score
//
// Position P&L uses the R-multiple convention:
//   R = |entry - stop|
//   pnlR = signed (exit - entry) / R   (sign flipped for shorts)
//   pnlPercentOfAccount = pnlR × riskPercent
// This couples stop placement to position sizing the same way single-trade
// scoring does, so the lesson reads consistently across both surfaces.

import { candleClosePearsonSlice } from "./correlation";
import {
  DEFAULT_BASKET,
  DEFAULT_CANDLE_COUNT,
  DEFAULT_INTERVAL_SEC,
  generatePortfolio,
  type PortfolioSymbolSpec,
} from "./portfolio-data";
import { fetchInitialHistory, type Granularity } from "./live-data";
import {
  fundingCostForCandle,
  liquidationPrice,
  wasLiquidated,
} from "./leverage";
import type {
  Candle,
  MistakeTag,
  PortfolioPosition,
  PortfolioPositionStatus,
  PortfolioScore,
  PortfolioSession,
  PortfolioSymbol,
  ScoreCategoryResult,
} from "./types";

export const PORTFOLIO_SCORING_VERSION = "1.0.0";
export const DEFAULT_PORTFOLIO_ACCOUNT_SIZE = 10_000;
export const PORTFOLIO_RISK_BUDGET_PCT = 5;
export const CORRELATION_OVERLAP_THRESHOLD = 0.7;

// ── Session lifecycle ───────────────────────────────────────────────────────

export type CreateSessionOpts = {
  seed?: number;
  basket?: PortfolioSymbolSpec[];
  accountSize?: number;
  startTime?: number;
  intervalSec?: number;
  candleCount?: number;
};

function makeSessionId(): string {
  return `port-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(opts: CreateSessionOpts = {}): PortfolioSession {
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const intervalSec = opts.intervalSec ?? DEFAULT_INTERVAL_SEC;
  const candleCount = opts.candleCount ?? DEFAULT_CANDLE_COUNT;
  const basket = opts.basket ?? DEFAULT_BASKET;
  const symbols = generatePortfolio({
    seed,
    intervalSec,
    candleCount,
    basket,
    startTime: opts.startTime,
  });
  return {
    id: makeSessionId(),
    startedAt: Date.now(),
    datasetSeed: seed,
    intervalSec,
    candleCount,
    symbols,
    currentIdx: 0,
    positions: [],
    status: "active",
    accountSize: opts.accountSize ?? DEFAULT_PORTFOLIO_ACCOUNT_SIZE,
    mode: "synthetic",
  };
}

// ── Live session (v5.0) ─────────────────────────────────────────────────────

export type CreateLiveSessionOpts = {
  productId: string;          // Coinbase product, e.g. "BTC-USD"
  symbolLabel?: string;       // display label; defaults to productId
  granularity: Granularity;   // candle width in seconds
  initialHistoryCount?: number; // candles to seed; default 150
  accountSize?: number;
};

// Async because we hit the network. Caller renders a loading state until this
// resolves. The returned session is shaped exactly like a synthetic one — same
// PortfolioSession type — so every existing position-engine function works
// over it (openPosition, advanceTo, positionMarkPnl, ...). Only the data
// source differs.
export async function createLiveSession(
  opts: CreateLiveSessionOpts
): Promise<PortfolioSession> {
  // v5.6.1 — default bumped from 150 → 280. Coinbase's cap is ~300, the
  // fetcher safely caps at 290; on 1m candles 150 bars only covered 2.5h
  // of chart which wasn't enough history to read structure. 280 bars
  // gives ~4.7h on 1m, ~11 days on 1h, ~9 months on 1d.
  const initialCount = opts.initialHistoryCount ?? 280;
  const initialCandles = await fetchInitialHistory(
    opts.productId,
    opts.granularity,
    initialCount
  );
  if (initialCandles.length === 0) {
    throw new Error(
      `Coinbase returned no candles for ${opts.productId} at granularity ${opts.granularity}s`
    );
  }
  const symbol: PortfolioSymbol = {
    symbol: opts.symbolLabel ?? opts.productId,
    basePrice: initialCandles[0].close,
    marketCorrelation: 0,    // unused in live mode (no correlation hint at single-symbol scope)
    candles: initialCandles,
    productId: opts.productId,
    granularitySec: opts.granularity,
  };
  return {
    id: makeSessionId(),
    startedAt: Date.now(),
    // datasetSeed/candleCount/intervalSec are vestigial for live but kept in
    // the shape so positionMarkPnl etc don't need a discriminated union.
    datasetSeed: 0,
    intervalSec: opts.granularity,
    candleCount: initialCandles.length,
    symbols: [symbol],
    currentIdx: initialCandles.length - 1,
    positions: [],
    status: "active",
    accountSize: opts.accountSize ?? DEFAULT_PORTFOLIO_ACCOUNT_SIZE,
    mode: "live",
  };
}

// v5.0.1 — Replace a live session's symbol candles with a fresh fetch at a
// different granularity. Used by the timeframe switcher in /paper-trading.
// Open positions stay open and keep their entry/stop/TP prices, but their
// openedAtIdx is shifted to the new "now" so forward SL/TP resolution only
// scans the NEW bars — we don't retroactively close positions on history
// that happened at a different resolution.
export function switchLiveSessionTimeframe(
  session: PortfolioSession,
  symbolKey: string,
  newCandles: Candle[],
  newGranularitySec: number
): PortfolioSession {
  if (newCandles.length === 0) return session;
  const newCurrentIdx = newCandles.length - 1;
  const symbols = session.symbols.map((s) => {
    if (s.symbol !== symbolKey) return s;
    return {
      ...s,
      candles: newCandles,
      granularitySec: newGranularitySec,
      // basePrice stays as authored; not meaningful in live mode anyway.
    };
  });
  const positions = session.positions.map((p) => {
    if (p.status !== "open") return p;
    // Anchor forward scans at the new last index. advanceTo computes
    //   from = max(openedAtIdx, session.currentIdx + 1)
    // so this guarantees future polls only consider truly-new bars.
    return { ...p, openedAtIdx: newCurrentIdx };
  });
  return {
    ...session,
    symbols,
    positions,
    candleCount: newCandles.length,
    currentIdx: newCurrentIdx,
    intervalSec: newGranularitySec,
  };
}

// v5.8.0 — Append a new symbol to an existing live session. Used by the
// "+ Add symbol" flow on /paper-trading mid-session: the caller fetches
// initial history for the new symbol, calls this with the candles, and
// the session grows by one entry in symbols[]. Returns the session
// unchanged if the symbol is already present (idempotent).
export function addLiveSymbol(
  session: PortfolioSession,
  spec: {
    symbol: string;
    productId: string;
    granularitySec: number;
    candles: Candle[];
  }
): PortfolioSession {
  if (session.symbols.some((s) => s.symbol === spec.symbol)) return session;
  if (spec.candles.length === 0) return session;
  const sym: PortfolioSymbol = {
    symbol: spec.symbol,
    basePrice: spec.candles[0].close,
    marketCorrelation: 0,
    candles: spec.candles,
    productId: spec.productId,
    granularitySec: spec.granularitySec,
  };
  // candleCount tracks the longest symbol's array. The new symbol might be
  // shorter (just fetched), so this is usually a no-op, but defensive.
  const newCount = Math.max(session.candleCount, spec.candles.length);
  return {
    ...session,
    symbols: [...session.symbols, sym],
    candleCount: newCount,
  };
}

// v5.6.2 — Prepend older candles to a live session for the "Load older"
// button on /paper-trading. Inserts the fetched bars before the current
// oldest, dedups, and pushes openedAtIdx forward on every existing
// position by the prepend count so SL/TP scanning still anchors to the
// right point in the candle array.
//
// Returns the original session unchanged if the new run is empty or fully
// overlaps the existing data. Otherwise returns a new immutable session.
export function prependLiveCandles(
  session: PortfolioSession,
  symbolKey: string,
  olderCandles: Candle[]
): PortfolioSession {
  if (olderCandles.length === 0) return session;
  const sym = session.symbols.find((s) => s.symbol === symbolKey);
  if (!sym) return session;
  const firstExistingTime = sym.candles[0]?.time ?? Infinity;
  // Defensive: only keep candles strictly older than the current oldest.
  const filtered = olderCandles
    .filter((c) => c.time < firstExistingTime)
    .sort((a, b) => a.time - b.time);
  if (filtered.length === 0) return session;
  const prependCount = filtered.length;
  const symbols = session.symbols.map((s) => {
    if (s.symbol !== symbolKey) return s;
    return { ...s, candles: [...filtered, ...s.candles] };
  });
  // Every existing position was opened relative to the OLD index space;
  // shifting the array forward by `prependCount` would invalidate
  // openedAtIdx / exitIdx pointers. Re-anchor them.
  const positions = session.positions.map((p) => {
    if (p.symbol !== symbolKey) return p;
    return {
      ...p,
      openedAtIdx: p.openedAtIdx + prependCount,
      ...(p.exitIdx != null ? { exitIdx: p.exitIdx + prependCount } : {}),
    };
  });
  return {
    ...session,
    symbols,
    candleCount: session.candleCount + prependCount,
    currentIdx: session.currentIdx + prependCount,
    positions,
  };
}

// Append newly-polled candles to a live session and re-run SL/TP resolution
// over the new ticks. Returns the new session (immutable update). Polling
// hook calls this with the candles it fetched; we keep candleCount + currentIdx
// in sync so advanceTo can scan the just-appended region.
export function appendLiveCandles(
  session: PortfolioSession,
  symbolKey: string,
  newCandles: Candle[]
): PortfolioSession {
  if (newCandles.length === 0) return session;
  const symbols = session.symbols.map((s) => {
    if (s.symbol !== symbolKey) return s;
    // Defensive: drop any newCandles whose time is <= the current last.
    const last = s.candles[s.candles.length - 1];
    const filtered = last
      ? newCandles.filter((c) => c.time > last.time)
      : newCandles;
    if (filtered.length === 0) return s;
    return { ...s, candles: [...s.candles, ...filtered] };
  });
  // candleCount tracks the longest symbol's candle array. With single-symbol
  // v5.0 it's just symbols[0].candles.length.
  const newCandleCount = Math.max(
    ...symbols.map((s) => s.candles.length),
    session.candleCount
  );
  const withAppended: PortfolioSession = {
    ...session,
    symbols,
    candleCount: newCandleCount,
  };
  // Now advance the cursor so the position engine scans the new candles for
  // SL/TP fills. advanceTo is the same function /portfolio uses.
  return advanceTo(withAppended, newCandleCount - 1);
}

// ── Position lifecycle ──────────────────────────────────────────────────────

function genPositionId(): string {
  return `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export type OpenPositionParams = {
  symbol: string;
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  // v5.3.0 — optional leverage. Missing or <= 1 means spot (no
  // liquidation, no funding). Caller-validated upstream; portfolio.ts
  // double-checks against MAX_LEVERAGE.
  leverage?: number;
};

// v5.3.0 — upper bound on leverage the trainer will accept. Crypto
// exchanges go higher (some up to 125×) but anything past 25× is so close
// to a one-bar liquidation that the lesson degenerates to "you got
// liquidated immediately." Keep the ceiling pedagogical.
export const MAX_LEVERAGE = 25;

// Validates and appends a position at the session's current tick. Returns the
// new session immutably. Throws Error with a human-readable reason when the
// position is rejected — callers (UI) should surface the message verbatim.
export function openPosition(
  session: PortfolioSession,
  params: OpenPositionParams
): PortfolioSession {
  if (session.status !== "active") {
    throw new Error("Session has ended.");
  }
  if (!session.symbols.find((s) => s.symbol === params.symbol)) {
    throw new Error(`Unknown symbol: ${params.symbol}`);
  }
  if (!isFinite(params.entry) || !isFinite(params.stopLoss) || !isFinite(params.takeProfit)) {
    throw new Error("Entry, stop, and take-profit are required.");
  }
  if (params.riskPercent <= 0 || params.riskPercent > 50) {
    throw new Error("Risk % must be between 0 and 50.");
  }
  if (params.direction === "long") {
    if (params.stopLoss >= params.entry) throw new Error("Long stop must be below entry.");
    if (params.takeProfit <= params.entry) throw new Error("Long target must be above entry.");
  } else {
    if (params.stopLoss <= params.entry) throw new Error("Short stop must be above entry.");
    if (params.takeProfit >= params.entry) throw new Error("Short target must be below entry.");
  }
  // v5.3.0 — validate leverage. Spot (undefined or 1) skips the perp paths.
  const leverage = params.leverage ?? 1;
  if (leverage < 1) throw new Error("Leverage must be at least 1× (spot).");
  if (leverage > MAX_LEVERAGE) {
    throw new Error(`Leverage capped at ${MAX_LEVERAGE}× in the trainer.`);
  }
  const liq = liquidationPrice(params.entry, params.direction, leverage);
  // Guard: if the user's stop sits beyond their own liquidation, the
  // liquidation will trigger first and the stop never fires. Surface this
  // before the position opens — it's exactly the lesson the leverage trap
  // teaches.
  if (liq != null) {
    if (params.direction === "long" && params.stopLoss <= liq) {
      throw new Error(
        `Your stop (${params.stopLoss.toFixed(2)}) is below the liquidation price (${liq.toFixed(2)}) at ${leverage}× leverage. Use lower leverage or a tighter stop.`
      );
    }
    if (params.direction === "short" && params.stopLoss >= liq) {
      throw new Error(
        `Your stop (${params.stopLoss.toFixed(2)}) is above the liquidation price (${liq.toFixed(2)}) at ${leverage}× leverage. Use lower leverage or a tighter stop.`
      );
    }
  }
  const position: PortfolioPosition = {
    id: genPositionId(),
    symbol: params.symbol,
    direction: params.direction,
    entry: params.entry,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    riskPercent: params.riskPercent,
    openedAtIdx: session.currentIdx,
    status: "open",
    leverage: leverage > 1 ? leverage : undefined,
    liquidationPrice: liq ?? undefined,
    fundingCostPct: leverage > 1 ? 0 : undefined,
  };
  return { ...session, positions: [...session.positions, position] };
}

function rMultiple(p: PortfolioPosition, exitPrice: number): number {
  const R = Math.abs(p.entry - p.stopLoss);
  if (R === 0) return 0;
  return p.direction === "long"
    ? (exitPrice - p.entry) / R
    : (p.entry - exitPrice) / R;
}

// Realized P&L as a percentage of account for a closed position. Open
// positions get a mark-to-market via positionMarkPnl below — that result is
// not stored, just computed on read.
// v5.3.0 — when a closed position carries a stamped pnlPercent (advanceTo
// stamps it on every close path, with funding cost already subtracted),
// prefer that. Falls back to the rMultiple recomputation for old saves.
function realizedPnl(p: PortfolioPosition): number {
  if (p.status === "open" || p.exitPrice == null) return 0;
  if (p.pnlPercent != null) return p.pnlPercent;
  return rMultiple(p, p.exitPrice) * p.riskPercent;
}

// Mark-to-market for an open position at the session's current tick.
// v5.3.0 — subtracts accrued funding cost for leveraged positions so the
// open-PnL display matches what the user would actually pocket on close.
export function positionMarkPnl(
  session: PortfolioSession,
  p: PortfolioPosition
): number {
  if (p.status !== "open") return realizedPnl(p);
  const sym = session.symbols.find((s) => s.symbol === p.symbol);
  if (!sym) return 0;
  const idx = Math.min(session.currentIdx, sym.candles.length - 1);
  const markPrice = sym.candles[idx]?.close ?? p.entry;
  const fundingDrag = p.fundingCostPct ?? 0;
  return rMultiple(p, markPrice) * p.riskPercent - fundingDrag;
}

export function realizedSessionPnl(session: PortfolioSession): number {
  return session.positions.reduce((s, p) => s + realizedPnl(p), 0);
}

export function totalSessionPnl(session: PortfolioSession): number {
  return session.positions.reduce((s, p) => s + positionMarkPnl(session, p), 0);
}

export function totalRiskPercent(
  session: PortfolioSession,
  openOnly = true
): number {
  return session.positions
    .filter((p) => !openOnly || p.status === "open")
    .reduce((s, p) => s + p.riskPercent, 0);
}

// Manually close an open position at the current tick's close.
// v5.3.0 — net out any accrued funding cost on close so the realized PnL
// matches what mark-to-market was reading just before the close.
export function closePosition(
  session: PortfolioSession,
  positionId: string
): PortfolioSession {
  const positions = session.positions.map((p) => {
    if (p.id !== positionId || p.status !== "open") return p;
    const sym = session.symbols.find((s) => s.symbol === p.symbol);
    const idx = Math.min(session.currentIdx, (sym?.candles.length ?? 1) - 1);
    const close = sym?.candles[idx]?.close ?? p.entry;
    const fundingDrag = p.fundingCostPct ?? 0;
    const closed: PortfolioPosition = {
      ...p,
      status: "closed_manual",
      exitIdx: idx,
      exitPrice: close,
      pnlPercent: rMultiple(p, close) * p.riskPercent - fundingDrag,
    };
    return closed;
  });
  return { ...session, positions };
}

// Advance the session timeline to `targetIdx`. For each open position, scan
// each candle from the position's "next unseen" tick through targetIdx and
// resolve SL/TP on first touch. Conservative tie-break: if a single candle
// could plausibly hit both SL and TP (long with stop and target both inside
// the wick range), SL wins — the pessimistic assumption matches how live
// orders fill on exchanges that don't guarantee fill ordering.
export function advanceTo(
  session: PortfolioSession,
  targetIdx: number
): PortfolioSession {
  const clamped = Math.max(
    session.currentIdx,
    Math.min(targetIdx, session.candleCount - 1)
  );
  if (clamped === session.currentIdx) {
    return session;
  }

  const positions = session.positions.map((p) => {
    if (p.status !== "open") return p;
    const sym = session.symbols.find((s) => s.symbol === p.symbol);
    if (!sym) return p;
    // Start scanning from the candle after the position's open tick OR after
    // the session's previous currentIdx, whichever is later. We don't re-scan
    // already-seen candles, but we DO include the open tick itself so a stop
    // wicked on the entry bar resolves correctly.
    const from = Math.max(p.openedAtIdx, session.currentIdx + 1);
    // v5.3.0 — accumulate funding for leveraged positions as we walk
    // candles. Funding ticks per closed candle regardless of whether the
    // position is hit; if the position survives to the end of the scan
    // window, the accumulated cost is stamped onto the position so the
    // open-PnL display reflects it.
    let fundingAccrued = p.fundingCostPct ?? 0;
    const isLeveraged = (p.leverage ?? 1) > 1;
    for (let i = from; i <= clamped; i++) {
      const c = sym.candles[i];
      if (!c) break;
      // Funding accrual happens before close-out evaluation so a candle that
      // both pays funding AND hits SL/TP/liquidation has the funding
      // included in the final P&L.
      if (isLeveraged) {
        fundingAccrued += fundingCostForCandle(p, session.intervalSec);
      }
      // Liquidation is checked first because on leveraged positions where
      // the stop sits beyond the liquidation level (which openPosition
      // should have prevented, but defense-in-depth) the liquidation
      // controls. The liquidation level is closer to entry than the stop
      // by construction.
      if (isLeveraged && wasLiquidated(p, c.high, c.low)) {
        // Liquidation = loss of full margin. With our R-multiple model,
        // margin = riskPercent × leverage of account. Stamp pnlPercent at
        // exactly -riskPercent × leverage so the loss reads as "you lost
        // all the leverage-amplified margin you posted."
        const closed: PortfolioPosition = {
          ...p,
          status: "closed_liq",
          exitIdx: i,
          exitPrice: p.liquidationPrice ?? p.entry,
          pnlPercent: -(p.riskPercent * (p.leverage ?? 1)) - fundingAccrued,
          fundingCostPct: fundingAccrued,
        };
        return closed;
      }
      const hitStop =
        p.direction === "long" ? c.low <= p.stopLoss : c.high >= p.stopLoss;
      const hitTp =
        p.direction === "long" ? c.high >= p.takeProfit : c.low <= p.takeProfit;
      if (hitStop || hitTp) {
        // Pessimistic: stop wins ties. R-multiple is exactly -1 for SL fills.
        const status: PortfolioPositionStatus = hitStop ? "closed_sl" : "closed_tp";
        const exitPrice = hitStop ? p.stopLoss : p.takeProfit;
        const closed: PortfolioPosition = {
          ...p,
          status,
          exitIdx: i,
          exitPrice,
          pnlPercent: rMultiple(p, exitPrice) * p.riskPercent - fundingAccrued,
          fundingCostPct: isLeveraged ? fundingAccrued : p.fundingCostPct,
        };
        return closed;
      }
    }
    // Position still open at end of scan window — stamp the accrued
    // funding so the next call to advanceTo continues from this point.
    if (isLeveraged && fundingAccrued !== (p.fundingCostPct ?? 0)) {
      return { ...p, fundingCostPct: fundingAccrued };
    }
    return p;
  });

  return { ...session, currentIdx: clamped, positions };
}

export function endSession(session: PortfolioSession): PortfolioSession {
  if (session.status === "ended") return session;
  // Mark-to-close any still-open positions at the final tick.
  const finalIdx = session.candleCount - 1;
  const advanced = advanceTo(session, finalIdx);
  const positions = advanced.positions.map((p) => {
    if (p.status !== "open") return p;
    const sym = advanced.symbols.find((s) => s.symbol === p.symbol);
    const close = sym?.candles[finalIdx]?.close ?? p.entry;
    // v5.3.0 — net out the position's accrued funding cost on close.
    // advanceTo above stamps fundingCostPct on every open leveraged
    // position; we just subtract it from the realized PnL.
    const fundingDrag = p.fundingCostPct ?? 0;
    return {
      ...p,
      status: "closed_manual" as PortfolioPositionStatus,
      exitIdx: finalIdx,
      exitPrice: close,
      pnlPercent: rMultiple(p, close) * p.riskPercent - fundingDrag,
    };
  });
  return {
    ...advanced,
    status: "ended",
    endedAt: Date.now(),
    positions,
    scoringVersion: PORTFOLIO_SCORING_VERSION,
  };
}

// ── Correlation hints ───────────────────────────────────────────────────────

export type CorrelationPair = {
  a: string;
  b: string;
  rho: number;
};

// All pairs of OPEN positions with realized correlation ≥ threshold over the
// candles seen so far. Same-direction overlap is the one we tag; pairs of
// opposite directions are excluded since they hedge rather than concentrate.
export function findCorrelatedOverlap(
  session: PortfolioSession,
  threshold = CORRELATION_OVERLAP_THRESHOLD
): CorrelationPair[] {
  const open = session.positions.filter((p) => p.status === "open");
  const sliceEnd = Math.max(2, session.currentIdx + 1);
  const out: CorrelationPair[] = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const a = open[i];
      const b = open[j];
      if (a.symbol === b.symbol) continue;
      if (a.direction !== b.direction) continue;
      const symA = session.symbols.find((s) => s.symbol === a.symbol);
      const symB = session.symbols.find((s) => s.symbol === b.symbol);
      if (!symA || !symB) continue;
      const rho = candleClosePearsonSlice(symA.candles, symB.candles, sliceEnd);
      if (rho != null && rho >= threshold) {
        out.push({ a: a.symbol, b: b.symbol, rho });
      }
    }
  }
  return out;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

// portfolio_risk: 10 pts.
//   - Starts at 10
//   - Total-risk-budget penalty: −1 pt per 1% over the 5% budget, max −5
//   - Correlated-overlap penalty: −3 pts per overlapping pair (no cap; the
//     more concentrated the basket, the larger the penalty)
//   - Floors at 0
// Returns null when the session never opened a position (no signal to score).
export function scorePortfolioRisk(session: PortfolioSession): PortfolioScore | null {
  if (session.positions.length === 0) return null;

  const max = 10;
  let points = max;
  const tags: MistakeTag[] = [];
  const notes: string[] = [];

  // Peak total risk across the session (we use the count across ALL positions
  // including closed ones because the lesson is "did you ever build a stack
  // that exceeded your budget?", not "is the leftover after stops fired safe?").
  const totalRiskEver = session.positions.reduce((s, p) => s + p.riskPercent, 0);
  if (totalRiskEver > PORTFOLIO_RISK_BUDGET_PCT) {
    const over = totalRiskEver - PORTFOLIO_RISK_BUDGET_PCT;
    const penalty = Math.min(5, over);
    points -= penalty;
    tags.push("portfolio_overconcentrated");
    notes.push(
      `Total risk across the session reached ${totalRiskEver.toFixed(1)}% (${session.positions.length} positions) — above the ${PORTFOLIO_RISK_BUDGET_PCT}% session budget.`
    );
  }

  const overlaps = findCorrelatedOverlap(session);
  if (overlaps.length > 0) {
    points -= 3 * overlaps.length;
    tags.push("portfolio_correlated_overlap");
    notes.push(
      `Correlated overlap: ${overlaps
        .map((o) => `${o.a} + ${o.b} (ρ=${o.rho.toFixed(2)})`)
        .join(", ")}.`
    );
  }

  points = Math.max(0, points);
  const positive = tags.length === 0;
  if (positive) {
    tags.push("portfolio_balanced");
    notes.push(
      `Total risk ${totalRiskEver.toFixed(1)}% across ${session.positions.length} ${
        session.positions.length === 1 ? "position" : "positions"
      } with no high-correlation overlap.`
    );
  }

  const category: ScoreCategoryResult = {
    id: "portfolio_risk",
    label: "Portfolio risk",
    points,
    max,
    note: notes.join(" "),
    tags: tags.filter((t) => t !== "portfolio_balanced"),
    positive,
  };

  const strengths = positive ? [category.note] : [];
  const weaknesses = positive ? [] : [category.note];

  return {
    total: points,
    max,
    breakdown: [category],
    tags,
    strengths,
    weaknesses,
  };
}
