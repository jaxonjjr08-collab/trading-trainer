import {
  CHART_TOOL_LABELS,
  type ChartToolId,
  type Decision,
  type IndicatorConfig,
  type ManagementDecision,
  type MistakeTag,
  type Scenario,
  type Score,
  type ScoreCategoryResult,
} from "./types";
import { MISTAKE_TAGS } from "./mistakes";
import { scoreManagement } from "./scoring-management";
import {
  hasStructureWord,
  hasLevelReference,
  hasDirectionWord,
  hasInvalidationHook,
} from "./thesis-critique";

function rrRatio(decision: Decision): number | null {
  if (
    decision.entry == null ||
    decision.stopLoss == null ||
    decision.takeProfit == null
  ) {
    return null;
  }
  const risk = Math.abs(decision.entry - decision.stopLoss);
  const reward = Math.abs(decision.takeProfit - decision.entry);
  if (risk <= 0) return null;
  return reward / risk;
}

/**
 * Estimate liquidation price for an isolated, linear (USDT-margined) perp.
 *
 * Intentionally simplified for teaching: ignores maintenance margin tiers,
 * trading/funding fees, mark-vs-last price differences, and cross-margin
 * pooling. Real exchanges will liquidate sooner than this estimate suggests.
 * Use only to teach the relationship between leverage and stop distance.
 *
 * Returns null when inputs are not enough to compute.
 */
export function estimateLiquidationPrice(
  direction: "long" | "short",
  entry: number,
  leverage: number
): number | null {
  if (!isFinite(entry) || !isFinite(leverage) || leverage <= 0 || entry <= 0) {
    return null;
  }
  const move = entry / leverage;
  return direction === "long" ? entry - move : entry + move;
}

function scoreDirection(scenario: Scenario, d: Decision): ScoreCategoryResult {
  const max = 10;
  const best = scenario.context.bestDirection;
  const rr = rrRatio(d);
  const tags: MistakeTag[] = [];
  let points = 0;
  let note = "";
  let positive = false;

  if (d.direction === best) {
    points = max;
    note =
      d.direction === "wait"
        ? "Correctly waited — conditions don't favor either side."
        : `${d.direction === "long" ? "Long" : "Short"} aligns with the dominant ${scenario.context.trend === "range" ? "structure" : scenario.context.trend + "trend"}.`;
    positive = true;
    if (d.direction === "wait") tags.push("wait_was_best");
  } else if (d.direction === "wait" && best !== "wait") {
    points = 4;
    note = "Waiting is rarely punished, but a clean setup was on the table here.";
    tags.push("missed_valid_setup");
  } else if (best === "wait" && d.direction !== "wait") {
    points = 0;
    note = "Conditions didn't offer a clear edge — taking a position here is a forced trade.";
    tags.push("forced_trade");
  } else {
    // counter-trend
    if (rr != null && rr >= 2.5) {
      points = 6;
      note = "Counter-trend trade, but the reward-to-risk justifies a small attempt.";
    } else {
      points = 0;
      note = `Trading against the ${scenario.context.trend} structure without strong reward-to-risk.`;
      tags.push("counter_trend");
    }
  }

  return { id: "direction", label: "Direction decision", points, max, note, tags, positive };
}

function scoreRisk(d: Decision): ScoreCategoryResult {
  const max = 15;
  const tags: MistakeTag[] = [];
  let points = 0;
  let note = "";
  let positive = false;

  if (d.riskPercent == null || d.direction === "wait") {
    return { id: "risk", label: "Risk control", points: max, max, note: "Not applicable for Wait.", tags, positive: true };
  }
  const r = d.riskPercent;
  if (r >= 0.5 && r <= 2) {
    points = max;
    note = `Risk at ${r}% is in the healthy 0.5–2% band.`;
    positive = true;
  } else if (r < 0.25) {
    points = 10;
    note = `Risk at ${r}% is so small the outcome won't teach you much.`;
    tags.push("risk_too_low_to_learn");
  } else if (r > 2 && r <= 5) {
    points = 8;
    note = `Risk at ${r}% is elevated — a few losses compound quickly.`;
  } else if (r > 5 && r <= 10) {
    points = 3;
    note = `Risk at ${r}% is dangerous for sustained trading.`;
    tags.push("risk_too_high");
  } else if (r > 10) {
    points = 0;
    note = `Risk at ${r}% is account-killer territory.`;
    tags.push("risk_too_high");
  } else {
    points = 12;
    note = `Risk at ${r}% is on the low end.`;
  }
  return { id: "risk", label: "Risk control", points, max, note, tags, positive };
}

function scoreRR(d: Decision): ScoreCategoryResult {
  const max = 15;
  const tags: MistakeTag[] = [];
  if (d.direction === "wait") {
    return { id: "rr", label: "Risk-to-reward", points: max, max, note: "Not applicable for Wait.", tags, positive: true };
  }
  const rr = rrRatio(d);
  if (rr == null) {
    return { id: "rr", label: "Risk-to-reward", points: 0, max, note: "Need entry, stop, and target to evaluate R:R.", tags: [], positive: false };
  }
  let points: number;
  let note: string;
  let positive = false;
  if (rr >= 2) {
    points = max;
    note = `Reward-to-risk of ${rr.toFixed(2)} is solid — you're paid for being right.`;
    positive = true;
  } else if (rr >= 1.5) {
    points = 10;
    note = `Reward-to-risk of ${rr.toFixed(2)} is acceptable but not generous.`;
  } else if (rr >= 1) {
    points = 5;
    note = `Reward-to-risk of ${rr.toFixed(2)} barely pays for being right.`;
    tags.push("poor_risk_reward");
  } else {
    points = 0;
    note = `Reward-to-risk of ${rr.toFixed(2)} means you lose more than you win even when right.`;
    tags.push("poor_risk_reward");
  }
  return { id: "rr", label: "Risk-to-reward", points, max, note, tags, positive };
}

function scoreStop(scenario: Scenario, d: Decision): ScoreCategoryResult {
  const max = 15;
  const tags: MistakeTag[] = [];
  if (d.direction === "wait") {
    return { id: "stop", label: "Stop placement", points: max, max, note: "Not applicable for Wait.", tags, positive: true };
  }
  if (d.stopLoss == null) {
    return {
      id: "stop",
      label: "Stop placement",
      points: 0,
      max,
      note: "No stop loss defined — without one, you can't size the position or review the trade.",
      tags: ["no_stop_loss"],
      positive: false,
    };
  }
  if (d.entry == null) {
    return {
      id: "stop",
      label: "Stop placement",
      points: 0,
      max,
      note: "Can't evaluate stop placement without an entry price.",
      tags: [],
      positive: false,
    };
  }

  const price = scenario.context.currentPrice;
  const distPct = Math.abs(d.entry - d.stopLoss) / price;

  const lastCandle = scenario.visibleCandles[scenario.visibleCandles.length - 1];
  const lastWickRange = { low: lastCandle.low, high: lastCandle.high };

  let points = max;
  let note: string;
  let positive = true;

  // Wrong side
  if (d.direction === "long" && d.stopLoss >= d.entry) {
    return { id: "stop", label: "Stop placement", points: 0, max, note: "For a long, stop loss must be below entry.", tags: ["stop_too_tight"], positive: false };
  }
  if (d.direction === "short" && d.stopLoss <= d.entry) {
    return { id: "stop", label: "Stop placement", points: 0, max, note: "For a short, stop loss must be above entry.", tags: ["stop_too_tight"], positive: false };
  }

  if (distPct < 0.003) {
    points = 3;
    note = `Stop is only ${(distPct * 100).toFixed(2)}% away — likely to be wicked out by normal noise.`;
    tags.push("stop_too_tight");
    positive = false;
  } else if (d.stopLoss >= lastWickRange.low && d.stopLoss <= lastWickRange.high) {
    points = 5;
    note = "Stop sits inside the most recent candle's wick range — that's where wicks sweep.";
    tags.push("stop_in_noise");
    positive = false;
  } else if (d.direction === "long") {
    const nearestSupport = [...scenario.context.support].sort((a, b) => Math.abs(d.entry! - a) - Math.abs(d.entry! - b))[0];
    if (nearestSupport != null && d.stopLoss < nearestSupport) {
      note = "Stop sits beyond support — gives the trade room while keeping invalidation clean.";
    } else {
      note = "Stop placement is workable.";
    }
  } else {
    const nearestResistance = [...scenario.context.resistance].sort((a, b) => Math.abs(d.entry! - a) - Math.abs(d.entry! - b))[0];
    if (nearestResistance != null && d.stopLoss > nearestResistance) {
      note = "Stop sits beyond resistance — clean invalidation if price reclaims the level.";
    } else {
      note = "Stop placement is workable.";
    }
  }

  return { id: "stop", label: "Stop placement", points, max, note, tags, positive };
}

function scoreLeverage(d: Decision): ScoreCategoryResult {
  const max = 10;
  const tags: MistakeTag[] = [];
  if (d.direction === "wait") {
    return { id: "leverage", label: "Leverage control", points: max, max, note: "Not applicable for Wait.", tags, positive: true };
  }
  if (d.entry == null || d.stopLoss == null || d.leverage == null) {
    return { id: "leverage", label: "Leverage control", points: 0, max, note: "Need entry, stop, and leverage to evaluate.", tags, positive: false };
  }

  const liq = estimateLiquidationPrice(d.direction, d.entry, d.leverage);
  let points = max;
  let note = "";
  let positive = true;

  // SL safety: liquidation must be further from entry than SL.
  const slDist = Math.abs(d.entry - d.stopLoss);
  if (liq != null) {
    const liqDist = Math.abs(d.entry - liq);
    if (liqDist <= slDist) {
      points = 0;
      note = `Estimated liquidation hits before your stop loss — leverage is too high for this stop distance.`;
      tags.push("liquidation_before_stop");
      positive = false;
    }
  }

  if (d.leverage > 20 && !tags.includes("liquidation_before_stop")) {
    points = 4;
    note = `${d.leverage}× leverage shrinks the liquidation buffer — small adverse moves become fatal.`;
    tags.push("leverage_excessive");
    positive = false;
  }

  if (tags.length === 0) {
    note = `${d.leverage}× leverage with a comfortable liquidation buffer.`;
  }

  return { id: "leverage", label: "Leverage control", points, max, note, tags, positive };
}

function scoreEntry(scenario: Scenario, d: Decision): ScoreCategoryResult {
  const max = 10;
  const tags: MistakeTag[] = [];
  if (d.direction === "wait") {
    return { id: "entry", label: "Entry quality", points: max, max, note: "Not applicable for Wait.", tags, positive: true };
  }
  if (d.entry == null) {
    return { id: "entry", label: "Entry quality", points: 0, max, note: "No entry provided.", tags, positive: false };
  }

  const price = scenario.context.currentPrice;
  const drift = (d.entry - price) / price;

  let points = max;
  let note = "";
  let positive = true;

  if (d.direction === "long" && drift > 0.005) {
    points = 3;
    note = `Long entry ${(drift * 100).toFixed(2)}% above current — that's chasing the move.`;
    tags.push("chasing_entry");
    positive = false;
  } else if (d.direction === "short" && drift < -0.005) {
    points = 3;
    note = `Short entry ${(drift * 100).toFixed(2)}% below current — that's chasing the move down.`;
    tags.push("chasing_entry");
    positive = false;
  } else {
    note = "Entry is close to current price (no chasing).";
  }

  return { id: "entry", label: "Entry quality", points, max, note, tags, positive };
}

function scoreTarget(scenario: Scenario, d: Decision): ScoreCategoryResult {
  const max = 10;
  const tags: MistakeTag[] = [];
  if (d.direction === "wait") {
    return { id: "target", label: "Target realism", points: max, max, note: "Not applicable for Wait.", tags, positive: true };
  }
  if (d.entry == null || d.takeProfit == null) {
    return { id: "target", label: "Target realism", points: 0, max, note: "No take profit provided.", tags, positive: false };
  }

  const levels = d.direction === "long" ? scenario.context.resistance : scenario.context.support;
  const directional = (lvl: number) =>
    d.direction === "long" ? lvl > d.entry! : lvl < d.entry!;
  const nextLevel = levels
    .filter(directional)
    .sort((a, b) => Math.abs(a - d.entry!) - Math.abs(b - d.entry!))[0];

  // Default to false; explicitly flip to true ONLY on full-credit branches. Prior
  // version defaulted true and forgot to flip it back on the 8/10 and 5/10 partial-
  // credit branches, so corrective notes showed up in "What went right" — a
  // confusing mix of praise and coaching. (See QoL audit #4.)
  let points = max;
  let note = "";
  let positive = false;

  if (nextLevel == null) {
    note = "No clear opposing level annotated — target acceptable.";
    positive = true;
  } else {
    const toLevel = Math.abs(nextLevel - d.entry);
    const toTP = Math.abs(d.takeProfit - d.entry);
    const beyond = d.direction === "long" ? d.takeProfit > nextLevel : d.takeProfit < nextLevel;
    // Distance from entry as a percentage — used so very close opposing levels
    // don't make every reasonable target look "many multiples past."
    const tpDriftPct = toTP / d.entry;

    if (!beyond) {
      note = `Target sits at or before ${nextLevel.toLocaleString()} — realistic.`;
      positive = true;
    } else if (toTP <= 2 * toLevel || tpDriftPct < 0.05) {
      points = 8;
      note = `Target sits past ${nextLevel.toLocaleString()} — workable, but price often rejects at the level before continuing. Consider a first target near the level and a runner for the rest.`;
      // positive stays false: 8/10 with corrective advice belongs in "What to improve"
    } else if (toTP <= 4 * toLevel || tpDriftPct < 0.10) {
      points = 5;
      note = `Target is well past ${nextLevel.toLocaleString()}. Ambitious but not absurd if your thesis includes structure beyond the level. A partial profit at the level locks something in.`;
      // positive stays false: 5/10 with corrective advice belongs in "What to improve"
    } else {
      points = 0;
      note = `Target is more than ~10% past the next level (${nextLevel.toLocaleString()}) — unlikely to fill in one leg. A closer first target with a partial profit, and a runner for the extended move, gives you something to bank if price rejects at the level.`;
      tags.push("tp_unrealistic");
    }
  }

  return { id: "target", label: "Target realism", points, max, note, tags, positive };
}

// v5.9.7 — stricter thesis grading. The old version was length-gated: 60+
// characters plus any single keyword ("trend") earned full marks, so filler
// padded with one structure word scored 10/10. The new rubric grades on what a
// reviewable thesis actually needs — a structure reference AND a specific
// price, with a direction word for the last point. Full marks now require all
// three; a hunch with neither structure nor a level is flagged with no_thesis.
//
//   structure word         → +4   (e.g. "support", "higher low", "pullback")
//   specific price/level    → +4   (e.g. "$58.5k", "139.50", "60,000")
//   direction word          → +2   (e.g. "long", "fades the rally", "up")
//
// So: structure + level + direction = 10; structure + level = 8; one of the
// two (+direction) tops out at 6; a pure feeling scores 2.
function scoreThesis(d: Decision): ScoreCategoryResult {
  const max = 10;
  const tags: MistakeTag[] = [];
  const text = (d.thesis || "").trim();

  if (text.length === 0) {
    return {
      id: "thesis",
      label: "Thesis quality",
      points: 0,
      max,
      note: "No thesis written. Even one sentence naming a level keeps you honest.",
      tags: ["no_thesis"],
      positive: false,
    };
  }
  if (text.length < 20) {
    return {
      id: "thesis",
      label: "Thesis quality",
      points: 0,
      max,
      note: "Thesis too short to be reviewable later.",
      tags: ["no_thesis"],
      positive: false,
    };
  }

  const structure = hasStructureWord(text);
  const level = hasLevelReference(text);
  const direction = hasDirectionWord(text);

  // Neither structure nor a level — it's a hunch, not a thesis.
  if (!structure && !level) {
    return {
      id: "thesis",
      label: "Thesis quality",
      points: 2,
      max,
      note:
        "Reads like a hunch. Name a structure (support, swing low, the trend) AND a specific price so the idea is checkable later.",
      tags: ["no_thesis"],
      positive: false,
    };
  }

  const points =
    (structure ? 4 : 0) + (level ? 4 : 0) + (direction ? 2 : 0);
  const positive = structure && level; // strong = structure + a real price

  let note: string;
  if (structure && level && direction) {
    note = "Strong: names a structure, a specific price, and a direction. Fully reviewable.";
  } else if (!level) {
    note =
      "Good structure, but no specific price. Cite the level (e.g. \"support at $58.5k\") for full marks.";
  } else if (!structure) {
    note =
      "Names a price but not the structure behind it. Say what the level IS (support, swing high, range edge).";
  } else {
    note = "Solid — add a direction word (long / fades / continues up) to make the bias explicit.";
  }

  return { id: "thesis", label: "Thesis quality", points, max, note, tags, positive };
}

// v4.0.3 — keyword vocab for detecting indicator references inside a thesis.
// Substring-matched (case-insensitive) against the lowercased thesis. Kept
// liberal so beginner phrasings still register; the cost of a false positive
// here is a free 5/5 on a 5-point category, which is small.
const INDICATOR_KEYWORDS: Record<ChartToolId, string[]> = {
  ema: [
    "ema",
    "moving average",
    "golden cross",
    "death cross",
    "ma cross",
    "ma20",
    "ma50",
    "ma200",
    "20ma",
    "50ma",
    "200ma",
  ],
  rsi: ["rsi", "relative strength", "overbought", "oversold"],
  macd: ["macd", "histogram", "signal line"],
  bb: ["bollinger", "upper band", "lower band", "band squeeze"],
  vwap: ["vwap", "volume weighted", "anchored vwap"],
  // v5.1.1 — Super Guppy keywords. "Guppy" alone is enough on its own; the
  // longer phrases catch students who name the ribbon's trend state in
  // the thesis ("blue ribbon" / "ribbon flipped" / etc.) without saying
  // "guppy."
  super_guppy: [
    "guppy",
    "gmma",
    "super guppy",
    "ribbon",
    "ema ribbon",
    "ma ribbon",
  ],
  chris_guppy: [
    "chris",
    "chris's guppy",
    "chris guppy",
    "guppy",
    "gmma",
    "ribbon",
  ],
  // v5.2.0 — Keltner Channels. "Keltner" alone; the longer phrases pick up
  // the descriptive references too.
  keltner: ["keltner", "atr channel", "atr band"],
  // v5.2.0 — Pivot Points. Match "pivot" (covers "pivot points", "pivot
  // level", etc.) and the explicit level labels traders commonly name.
  pivots: [
    "pivot",
    "r1",
    "r2",
    "s1",
    "s2",
    "central pivot",
    "floor pivot",
  ],
  // v5.2.2 — Candle patterns. Six common kinds; the long list mirrors how
  // traders actually write theses ("hammer at support", "engulfing
  // candle", "doji rejection").
  patterns: [
    "doji",
    "hammer",
    "shooting star",
    "engulfing",
    "inside bar",
    "candle pattern",
    "wick rejection",
    "reversal candle",
  ],
};

function thesisReferences(thesis: string, indicator: ChartToolId): boolean {
  const lower = thesis.toLowerCase();
  return INDICATOR_KEYWORDS[indicator].some((kw) => lower.includes(kw));
}

// v4.0.3 — scores how well the student engaged with the chart tools the
// scenario centers on. Opt-in: only fires when scenario.availableIndicators is
// set and non-empty AND the student took a non-wait position. Tiered:
//   5/5 — thesis text references at least one available indicator
//   2/5 — at least one was toggled on at submit but none referenced
//   0/5 — neither toggled nor referenced (tags ignored_indicator)
// Returns null when the category should be absent entirely.
function scoreChartTools(
  scenario: Scenario,
  decision: Decision,
  indicatorState: IndicatorConfig | undefined
): ScoreCategoryResult | null {
  const available = scenario.availableIndicators;
  if (!available || available.length === 0) return null;
  if (decision.direction === "wait") return null;

  const max = 5;
  const thesis = decision.thesis || "";
  const referenced = available.filter((id) => thesisReferences(thesis, id));
  const toggled = indicatorState
    ? available.filter((id) => indicatorState[id])
    : [];

  if (referenced.length > 0) {
    const names = referenced.map((id) => CHART_TOOL_LABELS[id]).join(", ");
    return {
      id: "chart_tools",
      label: "Chart tools",
      points: max,
      max,
      note: `Thesis references ${names} — the indicator${
        referenced.length > 1 ? "s" : ""
      } this scenario centers on.`,
      tags: [],
      positive: true,
    };
  }
  if (toggled.length > 0) {
    const names = toggled.map((id) => CHART_TOOL_LABELS[id]).join(", ");
    return {
      id: "chart_tools",
      label: "Chart tools",
      points: 2,
      max,
      note: `You had ${names} on but didn't mention it in your thesis. Writing what the indicator told you is where the lesson lands.`,
      tags: [],
      positive: false,
    };
  }
  const names = available.map((id) => CHART_TOOL_LABELS[id]).join(", ");
  return {
    id: "chart_tools",
    label: "Chart tools",
    points: 0,
    max,
    note: `This scenario teaches around ${names} — you didn't turn it on or mention it.`,
    tags: ["ignored_indicator"],
    positive: false,
  };
}

// v5.9.7 — was length-only: any 20 characters earned the full 5, so "I think
// it might go down" scored the same as "close below the $58.5k swing low."
// Now full marks require BOTH a structural hook (close below / break of /
// loss of) AND a specific price; one of the two earns partial; a feeling with
// neither still flags no_invalidation.
function scoreInvalidation(d: Decision): ScoreCategoryResult {
  const max = 5;
  const text = (d.invalidation || "").trim();

  if (text.length < 20) {
    return {
      id: "invalidation",
      label: "Invalidation",
      points: 0,
      max,
      note: "Without a written invalidation, losses become 'just hold a bit longer'.",
      tags: ["no_invalidation"],
      positive: false,
    };
  }

  const hook = hasInvalidationHook(text);
  const level = hasLevelReference(text);

  if (hook && level) {
    return {
      id: "invalidation",
      label: "Invalidation",
      points: max,
      max,
      note: "Clean: a structural event at a specific price. Pre-committed, not negotiable.",
      tags: [],
      positive: true,
    };
  }
  if (hook || level) {
    return {
      id: "invalidation",
      label: "Invalidation",
      points: 3,
      max,
      note: hook
        ? "Names the event but no price — add the level (e.g. \"close below $58.5k\")."
        : "Names a price but not the event — say what happens there (\"close below\", \"loses\").",
      tags: [],
      positive: false,
    };
  }
  return {
    id: "invalidation",
    label: "Invalidation",
    points: 1,
    max,
    note: "Reads like a feeling. Real invalidation cites a price or a 'close below X' event.",
    tags: ["no_invalidation"],
    positive: false,
  };
}

export function scoreDecision(
  scenario: Scenario,
  decision: Decision,
  managementDecisions?: ManagementDecision[],
  indicatorState?: IndicatorConfig
): Score {
  const results: ScoreCategoryResult[] = [
    scoreDirection(scenario, decision),
    scoreRisk(decision),
    scoreRR(decision),
    scoreStop(scenario, decision),
    scoreLeverage(decision),
    scoreEntry(scenario, decision),
    scoreTarget(scenario, decision),
    scoreThesis(decision),
    scoreInvalidation(decision),
  ];

  // v2.0 — append trade_management when the scenario has management points
  // AND the user took the preferred direction (otherwise management didn't run).
  if (
    scenario.managementPoints &&
    scenario.managementPoints.length > 0 &&
    decision.direction === scenario.context.bestDirection &&
    decision.direction !== "wait"
  ) {
    const mgmt = scoreManagement(scenario, managementDecisions);
    if (mgmt) results.push(mgmt);
  }

  // v4.0.3 — append chart_tools when the scenario opted in via
  // availableIndicators and the user took a non-wait position.
  const chartTools = scoreChartTools(scenario, decision, indicatorState);
  if (chartTools) results.push(chartTools);

  const total = results.reduce((sum, r) => sum + r.points, 0);
  const max = results.reduce((sum, r) => sum + r.max, 0);
  const tags: MistakeTag[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const r of results) {
    for (const t of r.tags) {
      if (!tags.includes(t)) tags.push(t);
    }
    if (r.positive) strengths.push(r.note);
    else if (r.points < r.max) weaknesses.push(r.note);
  }

  // Flag incomplete plans (non-wait with any core field missing).
  if (decision.direction !== "wait") {
    const coreMissing = decision.entry == null || decision.stopLoss == null || decision.takeProfit == null;
    if (coreMissing && !tags.includes("incomplete_plan")) {
      tags.push("incomplete_plan");
    }
  }

  // Surface positive Wait tag as a strength even though it lives in tags.
  if (tags.includes("wait_was_best")) {
    const msg = MISTAKE_TAGS.wait_was_best.description;
    if (!strengths.includes(msg)) strengths.unshift(msg);
  }

  return { total, max, breakdown: results, tags, strengths, weaknesses };
}
