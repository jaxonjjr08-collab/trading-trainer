// v2.4 — Speed-read flashcard drills. Builds the chart-reading reflex that
// the decision form trains slowly. Each drill shows a chart for ~5 seconds,
// then asks a single quick question. Reuses CHART_SPECS so we don't author
// new chart data.

import type { ChartSpec } from "./learn-charts";
import { CHART_SPECS } from "./learn-charts";

export type SpeedDrill = {
  id: string;
  chartKey: keyof typeof CHART_SPECS;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export const SPEED_DRILLS: SpeedDrill[] = [
  {
    id: "trend-1",
    chartKey: "trend",
    question: "Trend?",
    options: ["Uptrend", "Downtrend", "Range"],
    correct: 0,
    explanation: "Each successive high is higher and each pullback bottoms above the previous — definition of an uptrend.",
  },
  {
    id: "range-1",
    chartKey: "range",
    question: "Trend?",
    options: ["Uptrend", "Downtrend", "Range"],
    correct: 2,
    explanation: "Price bounces between defined upper and lower bounds without breaking either side — that's a range.",
  },
  {
    id: "support-1",
    chartKey: "support",
    question: "Where did buyers step in?",
    options: ["At the range top", "At the marked level", "Mid-range"],
    correct: 1,
    explanation: "The marked $59,500 line caught two consecutive bounces — that's support.",
  },
  {
    id: "resistance-1",
    chartKey: "resistance",
    question: "Where did sellers step in?",
    options: ["At $61.5k", "At the marked level", "At the candle wicks"],
    correct: 1,
    explanation: "Price rejected the marked $63,000 level multiple times — that's resistance.",
  },
  {
    id: "rr-1",
    chartKey: "risk_reward",
    question: "Approximate R:R of the marked trade?",
    options: ["~0.5 (bad)", "~1 (break-even)", "~3 (asymmetric)"],
    correct: 2,
    explanation: "Risk $1,000 to make $3,000 — that's R:R 3.",
  },
  {
    id: "stop-1",
    chartKey: "stop_loss",
    question: "Where should the stop go?",
    options: ["At entry", "Below the support level", "At the recent high"],
    correct: 1,
    explanation: "Stop sits just past the level your idea depends on — below support, not at entry, not above.",
  },
  {
    id: "fakeout-1",
    chartKey: "fakeout",
    question: "What just happened?",
    options: ["Clean breakout", "Failed breakout (fakeout)", "Reversal confirmed"],
    correct: 1,
    explanation: "Price wicked above resistance and closed back inside — textbook failed breakout.",
  },
  {
    id: "retest-1",
    chartKey: "retest",
    question: "What's the setup?",
    options: ["Pullback inside an uptrend", "Range fade", "Reversal short"],
    correct: 0,
    explanation: "Resistance broke, price pulled back to it, and is now holding it as support. Continuation entry.",
  },
  {
    id: "sweep-1",
    chartKey: "liquidity_sweep",
    question: "What's the read?",
    options: ["Trend continuation lower", "Liquidity sweep + reclaim", "Breakdown confirmed"],
    correct: 1,
    explanation: "Spike below support that immediately reclaimed — stops got hunted, then bid showed up.",
  },
  {
    id: "chop-1",
    chartKey: "wait_decision",
    question: "Best action?",
    options: ["Long the middle", "Short the middle", "Wait — no level nearby"],
    correct: 2,
    explanation: "Mid-range price action with no clean level is exactly the kind of chart to sit out.",
  },
];
