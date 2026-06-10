// v3.0 — Procedural scenario generator. Produces fresh Scenarios on demand
// for a given setup type using the existing buildSeries primitive. Each
// scenario is tagged `dataSource: "procedural"` so the UI can badge it, and
// includes a complete ideal-decision plan + outcome notes so the scoring
// engine has everything it needs.
//
// Recipes per setup type are intentionally narrow: each generator returns
// the SAME kind of setup (e.g. trend continuation pullback), but parametrised
// by symbol, base price, and seed so two calls produce visually distinct
// scenarios while preserving the lesson.
//
// Generators must:
//   1. Produce a chart that actually exemplifies the setup type they advertise.
//   2. Return a `preferredDecision` that matches the chart.
//   3. Provide an `idealDecisionPlan` consistent with the chart and entry.
//   4. Provide outcome notes that match what the hidden candles actually do.
//
// We rely on hand-written move scripts (per recipe) so the chart and the
// expected outcome stay in sync — random walks alone wouldn't reliably
// produce a "trend continuation" or "failed breakout."

import type {
  Candle,
  IdealDecisionPlan,
  KeyLevel,
  Scenario,
  ScenarioContext,
  ScenarioOutcomeNote,
  SetupType,
} from "./types";
import { buildSeries, makeRng, type Move } from "./scenarios";
import { withDerivedManagement } from "./management-derivation";

// ── Recipe types ─────────────────────────────────────────────────────────────

type SymbolSpec = {
  symbol: string;
  basePrice: number;
  timeframe: string;
  intervalSec: number;
};

const SYMBOLS: SymbolSpec[] = [
  { symbol: "BTC/USD", basePrice: 62000, timeframe: "6h", intervalSec: 21600 },
  { symbol: "BTC/USD", basePrice: 45000, timeframe: "4h", intervalSec: 14400 },
  { symbol: "ETH/USD", basePrice: 3200, timeframe: "4h", intervalSec: 14400 },
  { symbol: "ETH/USD", basePrice: 2400, timeframe: "6h", intervalSec: 21600 },
  { symbol: "SOL/USD", basePrice: 145, timeframe: "4h", intervalSec: 14400 },
  { symbol: "SOL/USD", basePrice: 220, timeframe: "6h", intervalSec: 21600 },
  // v5.12.1 — more liquid majors so the procedural pool feels less
  // BTC/ETH/SOL-only. All recipes scale proportionally to basePrice and the
  // 2-dp price formatter handles every price >= ~$5 cleanly.
  { symbol: "LINK/USD", basePrice: 14, timeframe: "4h", intervalSec: 14400 },
  { symbol: "AVAX/USD", basePrice: 30, timeframe: "6h", intervalSec: 21600 },
  { symbol: "LTC/USD", basePrice: 85, timeframe: "6h", intervalSec: 21600 },
  { symbol: "DOT/USD", basePrice: 7, timeframe: "4h", intervalSec: 14400 },
];

type Recipe = (symbol: SymbolSpec, seed: number) => Scenario;

// Helpers ────────────────────────────────────────────────────────────────────

function pickSymbol(rng: () => number): SymbolSpec {
  return SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
}

function fmtPrice(p: number, base: number): string {
  if (base >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (base >= 100) return `$${p.toFixed(0)}`;
  return `$${p.toFixed(2)}`;
}

function buildScenario(args: {
  id: string;
  title: string;
  symbol: SymbolSpec;
  setupType: SetupType;
  visibleMoves: Move[];
  hiddenMoves: Move[];
  seed: number;
  keyLevels: KeyLevel[];
  preferredDecision: Scenario["preferredDecision"];
  marketContext: string;
  neutralScenarioNotes: string;
  learningFocus: string;
  outcome: ScenarioOutcomeNote;
  context: ScenarioContext;
  idealDecisionPlan?: IdealDecisionPlan;
}): Scenario {
  const startTime = Math.floor(Date.now() / 1000) - args.visibleMoves.length * args.symbol.intervalSec;
  const series = buildSeries(
    args.symbol.basePrice,
    args.visibleMoves,
    args.hiddenMoves,
    startTime,
    args.symbol.intervalSec,
    args.seed
  );
  // v5.12.0 — run through withDerivedManagement so procedurally-generated
  // scenarios get the same trade-management prompts as the authored ones when
  // their ideal trade runs in profit.
  return withDerivedManagement({
    id: args.id,
    title: args.title,
    symbol: args.symbol.symbol,
    timeframe: args.symbol.timeframe,
    difficulty: "medium",
    setupType: args.setupType,
    marketContext: args.marketContext,
    neutralScenarioNotes: args.neutralScenarioNotes,
    learningFocus: args.learningFocus,
    visibleCandles: series.visible,
    hiddenCandles: series.hidden,
    decisionPointIndex: series.visible.length - 1,
    keyLevels: args.keyLevels,
    preferredDecision: args.preferredDecision,
    outcome: args.outcome,
    lessonRecommendation: "entry_timing",
    context: args.context,
    idealDecisionPlan: args.idealDecisionPlan,
    dataSource: "procedural",
  });
}

function lastClose(candles: Candle[]): number {
  return candles[candles.length - 1].close;
}

// ── Recipes ──────────────────────────────────────────────────────────────────

// Recipe 1: Trend continuation — uptrend with a clean pullback to support.
const trendContinuation: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.012, vol: 0.01 }, { drift: 0.018, vol: 0.012 },
    { drift: -0.005, vol: 0.009 }, { drift: 0.022, vol: 0.014 },
    { drift: 0.008, vol: 0.011 }, { drift: -0.012, vol: 0.013 },
    { drift: -0.016, vol: 0.014 }, { drift: -0.008, vol: 0.011 },
    { drift: 0.003, vol: 0.010 }, { drift: 0.006, vol: 0.009 },
  ];
  // Pullback resolves higher in hidden window.
  const hiddenMoves: Move[] = [
    { drift: 0.014, vol: 0.011 }, { drift: 0.020, vol: 0.013 },
    { drift: 0.011, vol: 0.010 }, { drift: -0.004, vol: 0.009 },
    { drift: 0.015, vol: 0.012 }, { drift: 0.018, vol: 0.013 },
  ];
  // Simulate to find the actual decision-point price for level placement.
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const support = +(entry * 0.965).toFixed(2);
  const resistance = +(entry * 1.06).toFixed(2);
  const stop = +(entry * 0.955).toFixed(2);
  const target = +(entry * 1.055).toFixed(2);
  return buildScenario({
    id: `proc-tc-${seed}`,
    title: `Trend continuation: pullback (${sym.symbol})`,
    symbol: sym,
    setupType: "trend_continuation",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: resistance, label: "near-term resistance" },
      { price: support, label: "pullback support" },
    ],
    preferredDecision: "long",
    marketContext: `${sym.symbol} pulled back inside an established uptrend. Higher lows on the chart suggest buyers are still in control.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. Price ran up, paused, and is now retracing toward a prior support level. Recent lows have been getting higher.`,
    learningFocus:
      "Trend continuation: pullbacks inside an uptrend to a defined level are the highest-quality long entries with tight invalidation.",
    outcome: {
      description: `Price held the pullback support near ${fmtPrice(support, sym.basePrice)} and resumed higher, reaching the ${fmtPrice(resistance, sym.basePrice)} area before resting.`,
      takeaway: "Buying the pullback at the level (not chasing the breakout) gave the best entry with the tightest stop.",
    },
    context: {
      trend: "up",
      support: [support],
      resistance: [resistance],
      currentPrice: entry,
      bestDirection: "long",
      notes: `${sym.symbol} ${sym.timeframe}. Uptrend with higher lows; current pullback testing ${fmtPrice(support, sym.basePrice)}.`,
    },
    idealDecisionPlan: {
      direction: "long",
      entry,
      stopLoss: stop,
      takeProfit: target,
      leverage: 3,
      riskPercent: 1,
      thesis: `Pullback to ${fmtPrice(support, sym.basePrice)} support inside an uptrend with higher lows.`,
      invalidation: `Close below ${fmtPrice(stop, sym.basePrice)} breaks the higher-low structure.`,
    },
  });
};

// Recipe 2: Failed breakout — push above resistance then a hard rejection.
const failedBreakout: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.008, vol: 0.011 }, { drift: 0.014, vol: 0.012 },
    { drift: -0.006, vol: 0.010 }, { drift: 0.016, vol: 0.013 },
    { drift: 0.020, vol: 0.014 }, { drift: 0.026, vol: 0.018 }, // strong push
    { drift: 0.014, vol: 0.020 }, // overextended bar with big wick
    { drift: -0.008, vol: 0.018 }, // rejection starts
  ];
  // Sells off in hidden window.
  const hiddenMoves: Move[] = [
    { drift: -0.018, vol: 0.014 }, { drift: -0.022, vol: 0.015 },
    { drift: -0.010, vol: 0.012 }, { drift: -0.015, vol: 0.013 },
    { drift: 0.004, vol: 0.011 }, { drift: -0.011, vol: 0.012 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const resistance = +(entry * 1.025).toFixed(2);
  const support = +(entry * 0.93).toFixed(2);
  return buildScenario({
    id: `proc-fb-${seed}`,
    title: `Failed breakout near resistance (${sym.symbol})`,
    symbol: sym,
    setupType: "failed_breakout",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: resistance, label: "failed breakout high" },
      { price: support, label: "prior support" },
    ],
    preferredDecision: "wait",
    marketContext: `${sym.symbol} pushed above resistance on a wide bar and immediately sold off into the close. Often the trap for FOMO buyers.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. A wide-range candle tagged a fresh high then closed back inside the prior range.`,
    learningFocus:
      "Failed breakouts: chasing the breakout candle usually means buying the wick. Wait for the retest reclaim or a clear lower-high rejection.",
    outcome: {
      description: `Price failed to hold above ${fmtPrice(resistance, sym.basePrice)} and unwound back toward ${fmtPrice(support, sym.basePrice)} over the following days.`,
      takeaway: "Sitting on hands here was the high-EV play. The breakout candle was the trap.",
    },
    context: {
      trend: "up",
      support: [support],
      resistance: [resistance],
      currentPrice: entry,
      bestDirection: "wait",
      notes: `${sym.symbol} ${sym.timeframe}. Failed push above ${fmtPrice(resistance, sym.basePrice)} with a long upper wick.`,
    },
    idealDecisionPlan: {
      direction: "wait",
      thesis: "Failed breakout — chasing the wick is low-EV. Wait for a clean retest reclaim or lower-high rejection.",
    },
  });
};

// Recipe 3: Range chop — sideways action, no clear setup.
const rangeChop: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.006, vol: 0.010 }, { drift: -0.007, vol: 0.009 },
    { drift: 0.004, vol: 0.008 }, { drift: -0.005, vol: 0.010 },
    { drift: 0.003, vol: 0.009 }, { drift: -0.004, vol: 0.008 },
    { drift: 0.005, vol: 0.011 }, { drift: -0.006, vol: 0.009 },
    { drift: 0.002, vol: 0.010 }, { drift: -0.003, vol: 0.008 },
  ];
  const hiddenMoves: Move[] = [
    { drift: 0.004, vol: 0.009 }, { drift: -0.005, vol: 0.010 },
    { drift: 0.003, vol: 0.008 }, { drift: -0.004, vol: 0.009 },
    { drift: 0.002, vol: 0.010 }, { drift: -0.003, vol: 0.009 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const top = +(entry * 1.018).toFixed(2);
  const bottom = +(entry * 0.982).toFixed(2);
  return buildScenario({
    id: `proc-rc-${seed}`,
    title: `Range chop, no clean setup (${sym.symbol})`,
    symbol: sym,
    setupType: "range_chop",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: top, label: "range top" },
      { price: bottom, label: "range bottom" },
    ],
    preferredDecision: "wait",
    marketContext: `${sym.symbol} stuck in a tight range. No directional edge from the middle; only fade the edges or wait.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. Price oscillates inside a narrow band with no breakout.`,
    learningFocus:
      "Range chop: forced trades from the middle of a range bleed accounts. The highest-EV decision is usually no trade.",
    outcome: {
      description: `Price kept chopping between ${fmtPrice(bottom, sym.basePrice)} and ${fmtPrice(top, sym.basePrice)} for several more bars before any directional resolution.`,
      takeaway: "Trading the middle of a range is forced. Wait for the edge or skip.",
    },
    context: {
      trend: "range",
      support: [bottom],
      resistance: [top],
      currentPrice: entry,
      bestDirection: "wait",
      notes: `${sym.symbol} ${sym.timeframe} chop between ${fmtPrice(bottom, sym.basePrice)} and ${fmtPrice(top, sym.basePrice)}.`,
    },
    idealDecisionPlan: {
      direction: "wait",
      thesis: "No clear level nearby. The middle of a range is a low-edge entry; skip.",
    },
  });
};

// Recipe 4: Support breakdown — price holds above support, then breaks
// decisively below it. Preferred decision: short the break (or its retest).
const supportBreakdown: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.003, vol: 0.009 }, { drift: -0.004, vol: 0.010 },
    { drift: 0.002, vol: 0.008 }, { drift: -0.005, vol: 0.010 },
    { drift: -0.003, vol: 0.009 }, { drift: 0.001, vol: 0.008 },
    { drift: -0.006, vol: 0.011 }, { drift: -0.010, vol: 0.013 },
    { drift: -0.018, vol: 0.016 }, { drift: -0.014, vol: 0.015 }, // break
  ];
  const hiddenMoves: Move[] = [
    { drift: -0.012, vol: 0.013 }, { drift: -0.015, vol: 0.014 },
    { drift: -0.008, vol: 0.012 }, { drift: 0.003, vol: 0.011 },
    { drift: -0.010, vol: 0.012 }, { drift: -0.006, vol: 0.011 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const brokenSupport = +(entry * 1.025).toFixed(2);
  const nextSupport = +(entry * 0.94).toFixed(2);
  const stop = +(entry * 1.022).toFixed(2);
  const target = +(entry * 0.95).toFixed(2);
  return buildScenario({
    id: `proc-sb-${seed}`,
    title: `Support breakdown (${sym.symbol})`,
    symbol: sym,
    setupType: "support_breakdown",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: brokenSupport, label: "broken support (now resistance)" },
      { price: nextSupport, label: "next support" },
    ],
    preferredDecision: "short",
    marketContext: `${sym.symbol} had been defending ${fmtPrice(brokenSupport, sym.basePrice)} for multiple bars before losing it on a decisive close.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. The lower edge of the recent range just gave way on increasing volume.`,
    learningFocus:
      "Support breakdowns: a clean close below a defended level is a structural change. Short the break or its retest, not the wick alone.",
    outcome: {
      description: `Price followed through to ${fmtPrice(nextSupport, sym.basePrice)} over the next several bars; no immediate reclaim.`,
      takeaway: "The structural break is the trade. Chasing without a stop above the broken level invites a wick stop-out.",
    },
    context: {
      trend: "down",
      support: [nextSupport],
      resistance: [brokenSupport],
      currentPrice: entry,
      bestDirection: "short",
      notes: `${sym.symbol} ${sym.timeframe} — support at ${fmtPrice(brokenSupport, sym.basePrice)} broken; structure flipped bearish.`,
    },
    idealDecisionPlan: {
      direction: "short",
      entry,
      stopLoss: stop,
      takeProfit: target,
      leverage: 3,
      riskPercent: 1,
      thesis: `Close below ${fmtPrice(brokenSupport, sym.basePrice)} flips the level from support to resistance. Short the continuation toward ${fmtPrice(nextSupport, sym.basePrice)}.`,
      invalidation: `Reclaim of ${fmtPrice(stop, sym.basePrice)} invalidates the breakdown.`,
    },
  });
};

// Recipe 5: Overextended — parabolic run with widening bars and big wicks.
// Preferred decision: wait. The risk-to-reward on a chase is awful.
const overextended: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.012, vol: 0.011 }, { drift: 0.018, vol: 0.013 },
    { drift: 0.024, vol: 0.015 }, { drift: 0.030, vol: 0.018 },
    { drift: 0.034, vol: 0.022 }, { drift: 0.028, vol: 0.024 }, // peak excitement
    { drift: 0.020, vol: 0.025 }, { drift: 0.012, vol: 0.024 },
    { drift: 0.006, vol: 0.020 }, { drift: -0.002, vol: 0.018 }, // first crack
  ];
  const hiddenMoves: Move[] = [
    { drift: -0.016, vol: 0.018 }, { drift: -0.012, vol: 0.016 },
    { drift: -0.020, vol: 0.018 }, { drift: -0.008, vol: 0.014 },
    { drift: -0.014, vol: 0.015 }, { drift: 0.004, vol: 0.013 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const recentLow = +(entry * 0.86).toFixed(2);
  const peakArea = +(entry * 1.005).toFixed(2);
  return buildScenario({
    id: `proc-ox-${seed}`,
    title: `Overextended — parabolic exhaustion (${sym.symbol})`,
    symbol: sym,
    setupType: "overextended",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: peakArea, label: "exhaustion area" },
      { price: recentLow, label: "would-be mean-reversion target" },
    ],
    preferredDecision: "wait",
    marketContext: `${sym.symbol} ran straight up with widening bars and growing upper wicks. Every chase here is buying near a local top.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. Recent bars are larger and wickier than the early-trend bars — classic exhaustion.`,
    learningFocus:
      "Overextended trends: the late-trend chase has the worst risk-to-reward of any setup. Sitting out beats forcing.",
    outcome: {
      description: `Price gave back a meaningful share of the run over the following bars before stabilising.`,
      takeaway: "The trade was 5 bars ago. Now is the moment to do nothing.",
    },
    context: {
      trend: "up",
      support: [recentLow],
      resistance: [peakArea],
      currentPrice: entry,
      bestDirection: "wait",
      notes: `${sym.symbol} ${sym.timeframe} — parabolic; wicks are widening; do not chase.`,
    },
    idealDecisionPlan: {
      direction: "wait",
      thesis: "Exhaustion-pattern late-trend chase. The high-EV move is to wait for a pullback to structure, not buy the top wick.",
    },
  });
};

// Recipe 6: Liquidity sweep — quick wick below an obvious support, then
// reclaim on the same or next candle. Preferred: long the reclaim.
const liquiditySweep: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.004, vol: 0.009 }, { drift: -0.003, vol: 0.010 },
    { drift: 0.002, vol: 0.009 }, { drift: -0.004, vol: 0.010 },
    { drift: 0.003, vol: 0.009 }, { drift: -0.005, vol: 0.011 },
    { drift: -0.008, vol: 0.013 }, { drift: -0.022, vol: 0.024 }, // sweep wick
    { drift: 0.014, vol: 0.018 }, // strong reclaim
    { drift: 0.008, vol: 0.012 },
  ];
  const hiddenMoves: Move[] = [
    { drift: 0.012, vol: 0.013 }, { drift: 0.016, vol: 0.014 },
    { drift: 0.010, vol: 0.011 }, { drift: -0.004, vol: 0.010 },
    { drift: 0.012, vol: 0.012 }, { drift: 0.014, vol: 0.013 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const sweptLow = +(entry * 0.972).toFixed(2);
  const target = +(entry * 1.045).toFixed(2);
  const stop = +(entry * 0.968).toFixed(2);
  return buildScenario({
    id: `proc-ls-${seed}`,
    title: `Liquidity sweep + reclaim (${sym.symbol})`,
    symbol: sym,
    setupType: "liquidity_sweep",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: sweptLow, label: "swept low (stops sat here)" },
      { price: target, label: "first opposing resistance" },
    ],
    preferredDecision: "long",
    marketContext: `${sym.symbol} wicked below an obvious low — taking out stops — then closed back above on the same range.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. A wide-range candle pierced the recent low and immediately closed back inside the range.`,
    learningFocus:
      "Liquidity sweeps: the wick is the setup. The reclaim is the trigger. Entries from above the swept low have tight invalidation.",
    outcome: {
      description: `Price held above the swept low and trended toward ${fmtPrice(target, sym.basePrice)} over the following bars.`,
      takeaway: "Swept-low reclaim is one of the cleanest long entries — short stop, fast follow-through when it works.",
    },
    context: {
      trend: "up",
      support: [sweptLow],
      resistance: [target],
      currentPrice: entry,
      bestDirection: "long",
      notes: `${sym.symbol} ${sym.timeframe} — stops swept below ${fmtPrice(sweptLow, sym.basePrice)} and reclaimed.`,
    },
    idealDecisionPlan: {
      direction: "long",
      entry,
      stopLoss: stop,
      takeProfit: target,
      leverage: 3,
      riskPercent: 1,
      thesis: `Wick below ${fmtPrice(sweptLow, sym.basePrice)} took stops; reclaim above signals the move was a liquidity grab.`,
      invalidation: `Close back below ${fmtPrice(stop, sym.basePrice)} invalidates the reclaim.`,
    },
  });
};

// Recipe 7: Clean retest — breakout above resistance, pullback to test the
// level as new support, then continuation. Preferred: long at the retest.
const cleanRetest: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.006, vol: 0.010 }, { drift: 0.010, vol: 0.011 },
    { drift: -0.003, vol: 0.009 }, { drift: 0.014, vol: 0.013 },
    { drift: 0.018, vol: 0.015 }, // breakout
    { drift: 0.012, vol: 0.013 }, { drift: -0.006, vol: 0.011 },
    { drift: -0.010, vol: 0.011 }, // pullback to former resistance
    { drift: -0.004, vol: 0.010 }, // touches level
    { drift: 0.002, vol: 0.009 },  // reaction bar
  ];
  const hiddenMoves: Move[] = [
    { drift: 0.012, vol: 0.011 }, { drift: 0.018, vol: 0.013 },
    { drift: 0.014, vol: 0.012 }, { drift: 0.008, vol: 0.010 },
    { drift: 0.014, vol: 0.012 }, { drift: 0.010, vol: 0.011 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const flippedLevel = +(entry * 0.998).toFixed(2);
  const target = +(entry * 1.055).toFixed(2);
  const stop = +(entry * 0.978).toFixed(2);
  return buildScenario({
    id: `proc-cr-${seed}`,
    title: `Clean retest of former resistance (${sym.symbol})`,
    symbol: sym,
    setupType: "clean_retest",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: flippedLevel, label: "former resistance (now support)" },
      { price: target, label: "next resistance" },
    ],
    preferredDecision: "long",
    marketContext: `${sym.symbol} broke above resistance with momentum, paused, and is now pulling back to test the broken level as new support.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. A clean breakout followed by a controlled pullback into the level it just broke.`,
    learningFocus:
      "Clean retests are the highest-quality continuation entry: defined level, tight invalidation, and the trend has already proven willing to break.",
    outcome: {
      description: `The retest held; price resumed higher toward ${fmtPrice(target, sym.basePrice)} over the following bars.`,
      takeaway: "Patience for the retest beats chasing the breakout candle. Same trade, better entry, tighter stop.",
    },
    context: {
      trend: "up",
      support: [flippedLevel],
      resistance: [target],
      currentPrice: entry,
      bestDirection: "long",
      notes: `${sym.symbol} ${sym.timeframe} — broke ${fmtPrice(flippedLevel, sym.basePrice)} cleanly; now retesting it from above.`,
    },
    idealDecisionPlan: {
      direction: "long",
      entry,
      stopLoss: stop,
      takeProfit: target,
      leverage: 3,
      riskPercent: 1,
      thesis: `Retest of ${fmtPrice(flippedLevel, sym.basePrice)} as new support after a clean break.`,
      invalidation: `Close below ${fmtPrice(stop, sym.basePrice)} means the breakout was a fakeout.`,
    },
  });
};

// Recipe 8: Leverage trap — tight consolidation that lures aggressive sizing,
// then a violent move both ways that liquidates over-leveraged positions.
// Preferred: wait. Lowering leverage is the lesson.
const leverageTrap: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.003, vol: 0.006 }, { drift: -0.002, vol: 0.005 },
    { drift: 0.002, vol: 0.005 }, { drift: -0.003, vol: 0.005 },
    { drift: 0.002, vol: 0.005 }, { drift: -0.001, vol: 0.005 },
    { drift: 0.003, vol: 0.005 }, { drift: -0.002, vol: 0.005 }, // very tight
    { drift: 0.004, vol: 0.006 }, { drift: 0.002, vol: 0.005 },
  ];
  const hiddenMoves: Move[] = [
    { drift: 0.024, vol: 0.022 }, // upside spike that liquidates shorts
    { drift: -0.030, vol: 0.026 }, // hard reversal that liquidates longs
    { drift: 0.014, vol: 0.018 }, { drift: -0.018, vol: 0.018 },
    { drift: 0.006, vol: 0.014 }, { drift: 0.002, vol: 0.012 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const topOfRange = +(entry * 1.012).toFixed(2);
  const bottomOfRange = +(entry * 0.988).toFixed(2);
  return buildScenario({
    id: `proc-lt-${seed}`,
    title: `Tight coil — leverage trap (${sym.symbol})`,
    symbol: sym,
    setupType: "leverage_trap",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: topOfRange, label: "coil top (likely sweep)" },
      { price: bottomOfRange, label: "coil bottom (likely sweep)" },
    ],
    preferredDecision: "wait",
    marketContext: `${sym.symbol} has compressed into a very tight range. FOMO + high leverage is the most common combination at this point — both sides get hunted.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. Bars are unusually small and the range has narrowed for several candles.`,
    learningFocus:
      "Leverage traps: tight coils break violently and often whip both directions before resolving. Reduce leverage before entering; better yet, wait for the resolution.",
    outcome: {
      description: `Price spiked one direction, then immediately reversed past the other side of the range, stopping both longs and shorts before settling.`,
      takeaway: "When the range is this tight, the move is rarely one-way. Cutting leverage in half doubles your survival rate here.",
    },
    context: {
      trend: "range",
      support: [bottomOfRange],
      resistance: [topOfRange],
      currentPrice: entry,
      bestDirection: "wait",
      notes: `${sym.symbol} ${sym.timeframe} — coil with sweep risk both ways.`,
    },
    idealDecisionPlan: {
      direction: "wait",
      thesis: "The compression is the warning. Trading the breakout-into-the-coil with high leverage is the textbook way to lose money in chop.",
    },
  });
};

// Recipe 9: News volatility — sudden wide-range candle with no prior
// structure. Preferred: wait until structure re-forms.
const newsVolatility: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.001, vol: 0.008 }, { drift: -0.002, vol: 0.007 },
    { drift: 0.002, vol: 0.008 }, { drift: -0.001, vol: 0.007 },
    { drift: 0.000, vol: 0.007 }, { drift: 0.001, vol: 0.007 },
    { drift: 0.002, vol: 0.008 }, { drift: -0.001, vol: 0.008 },
    { drift: 0.030, vol: 0.034 }, // headline candle
    { drift: -0.018, vol: 0.026 }, // immediate retrace
  ];
  const hiddenMoves: Move[] = [
    { drift: 0.008, vol: 0.018 }, { drift: -0.012, vol: 0.018 },
    { drift: 0.006, vol: 0.014 }, { drift: -0.004, vol: 0.012 },
    { drift: 0.002, vol: 0.011 }, { drift: 0.004, vol: 0.011 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const upperShock = +(entry * 1.025).toFixed(2);
  const lowerShock = +(entry * 0.97).toFixed(2);
  return buildScenario({
    id: `proc-nv-${seed}`,
    title: `Headline volatility — no structure (${sym.symbol})`,
    symbol: sym,
    setupType: "news_volatility",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: upperShock, label: "headline high" },
      { price: lowerShock, label: "headline low" },
    ],
    preferredDecision: "wait",
    marketContext: `${sym.symbol} was drifting flatly when a single wide-range candle blew through the recent range on no prior structure.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. The most recent bar dwarfs the prior bars and has wicks in both directions.`,
    learningFocus:
      "News volatility: the post-headline candle isn't a setup. Wait for at least one more bar of structure before re-entering — the range expands then collapses.",
    outcome: {
      description: `Price chopped inside the headline range for several more bars before any directional structure re-formed.`,
      takeaway: "Trading the news candle is gambling on follow-through. The high-EV move is sitting until a level holds for at least one full bar.",
    },
    context: {
      trend: "range",
      support: [lowerShock],
      resistance: [upperShock],
      currentPrice: entry,
      bestDirection: "wait",
      notes: `${sym.symbol} ${sym.timeframe} — headline candle blew the range out; no structure to trade against yet.`,
    },
    idealDecisionPlan: {
      direction: "wait",
      thesis: "No prior structure, no level holding. Wait one or two bars; let structure re-form before deciding.",
    },
  });
};

// Recipe 10: No setup — flat, low-range action with nothing to trade. The
// "do nothing" is the lesson. Preferred: wait.
const noSetup: Recipe = (sym, seed) => {
  const visibleMoves: Move[] = [
    { drift: 0.001, vol: 0.006 }, { drift: 0.000, vol: 0.005 },
    { drift: -0.001, vol: 0.005 }, { drift: 0.002, vol: 0.006 },
    { drift: -0.001, vol: 0.005 }, { drift: 0.001, vol: 0.005 },
    { drift: 0.000, vol: 0.006 }, { drift: 0.001, vol: 0.005 },
    { drift: -0.001, vol: 0.005 }, { drift: 0.001, vol: 0.005 },
  ];
  const hiddenMoves: Move[] = [
    { drift: 0.002, vol: 0.006 }, { drift: -0.001, vol: 0.005 },
    { drift: 0.000, vol: 0.005 }, { drift: 0.001, vol: 0.006 },
    { drift: -0.002, vol: 0.005 }, { drift: 0.001, vol: 0.005 },
  ];
  const tmp = buildSeries(sym.basePrice, visibleMoves, hiddenMoves, 0, sym.intervalSec, seed);
  const entry = lastClose(tmp.visible);
  const topish = +(entry * 1.006).toFixed(2);
  const bottomish = +(entry * 0.994).toFixed(2);
  return buildScenario({
    id: `proc-ns-${seed}`,
    title: `No setup — flat tape (${sym.symbol})`,
    symbol: sym,
    setupType: "no_setup",
    visibleMoves,
    hiddenMoves,
    seed,
    keyLevels: [
      { price: topish, label: "drifty top" },
      { price: bottomish, label: "drifty bottom" },
    ],
    preferredDecision: "wait",
    marketContext: `${sym.symbol} has been drifting sideways with tiny bars. There is no level being tested and no clear direction.`,
    neutralScenarioNotes: `${sym.symbol} on the ${sym.timeframe} timeframe. Recent bars are small with mixed direction; no structure is forming.`,
    learningFocus:
      "Most charts at most times have no setup. Recognising 'nothing to do' is a learnable skill and saves more money than any single winning trade.",
    outcome: {
      description: `The flat action continued for several more bars before anything resembling a setup formed.`,
      takeaway: "Sitting out a featureless chart is the trade. The next setup will be on a different chart.",
    },
    context: {
      trend: "range",
      support: [bottomish],
      resistance: [topish],
      currentPrice: entry,
      bestDirection: "wait",
      notes: `${sym.symbol} ${sym.timeframe} — flat tape; no level, no structure.`,
    },
    idealDecisionPlan: {
      direction: "wait",
      thesis: "No structure, no level, no edge. The right move on most charts most of the time is no trade.",
    },
  });
};

// ── Registry ────────────────────────────────────────────────────────────────

const RECIPES: Record<string, Recipe> = {
  trend_continuation: trendContinuation,
  failed_breakout: failedBreakout,
  range_chop: rangeChop,
  // v4.1.6 — backfill of the seven setup types previously only available as
  // hand-authored real-data scenarios.
  support_breakdown: supportBreakdown,
  overextended: overextended,
  liquidity_sweep: liquiditySweep,
  clean_retest: cleanRetest,
  leverage_trap: leverageTrap,
  news_volatility: newsVolatility,
  no_setup: noSetup,
};

export const PROCEDURAL_SETUP_TYPES = Object.keys(RECIPES) as SetupType[];

// Generate a fresh procedural scenario. If `setupType` is provided and we
// have a recipe for it, use it. Otherwise pick a random recipe. `seed` is
// optional — defaults to a time-based value so each call yields a new chart.
export function generateProceduralScenario(opts: {
  setupType?: SetupType;
  seed?: number;
} = {}): Scenario {
  const seed = opts.seed ?? (Date.now() & 0x7fffffff);
  const rng = makeRng(seed);
  const sym = pickSymbol(rng);

  const wantedRecipe = opts.setupType ? RECIPES[opts.setupType] : undefined;
  const fallbackKeys = Object.keys(RECIPES);
  const recipe =
    wantedRecipe ?? RECIPES[fallbackKeys[Math.floor(rng() * fallbackKeys.length)]];

  return recipe(sym, seed);
}
