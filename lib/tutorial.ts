// First-visit tutorial. Ten cards that introduce the absolute beginner to candles,
// direction, stops, targets, leverage, risk %, and the decision-quality framing.
// Visuals reuse the existing CHART_SPECS keys via chartFor() in lib/learn-charts.ts.

export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  // If set, render the MiniChart for this Learn term ID. Must match a key in CHART_SPECS.
  chartKey?: string;
  // Optional one-line caption under the chart.
  chartCaption?: string;
  // Optional related Learn term ID surfaced as a "Read more" link.
  learnTermId?: string;
  // Optional custom visual key, switched on inside Tutorial.tsx. Use when a
  // step needs a non-chart illustration (e.g. side-by-side comparison cards).
  customVisual?: "decision_quality_compare" | "spot_vs_futures_compare" | "trains_vs_doesnt";
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "spot_vs_futures",
    title: "Spot vs. perpetuals — same chart, very different risk",
    body:
      "Crypto exchanges sell two products on the same chart. Spot is buying the coin itself — you hand over dollars, you get the coin. If you put in $1,000, the most you can lose is $1,000. A perpetual (or 'perp', a kind of futures contract) is a side-bet on price using leverage — you only post a small margin, the exchange controls the rest, and a move against you 'liquidates' that margin to zero before you ever hit your stop. Example: at 10× leverage on $1,000 of margin, a 10% adverse move ends the trade at -$1,000 (your full margin); at 50× it only takes a 2% move. This trainer is built around perp trading because that's where most beginners blow up — but every chart-reading and stop-placement lesson here applies to spot too.",
    customVisual: "spot_vs_futures_compare",
  },
  {
    id: "welcome",
    title: "Welcome",
    body:
      "The trainer teaches crypto trading by giving you real historical charts and asking you to make decisions. Nothing is at risk — no real money, no live exchange. Every decision is scored and explained.",
  },
  {
    id: "chart",
    title: "Reading the chart",
    body:
      "Each candle on the chart covers one period of time (here, six hours). Green = the price closed higher than it opened. Red = it closed lower. The thin lines above and below — the wicks — show the highest and lowest prices during that period.",
    chartKey: "trend",
    chartCaption: "Each bar is a candle. Wicks show the high and low.",
  },
  {
    id: "direction",
    title: "Long, short, or wait",
    body:
      "Every scenario has three choices. Long: you think price will go up. Short: you think price will go down. Wait: conditions don't justify a trade, so you sit out. Choosing wait correctly is rewarded here — it's a real decision, not a missed opportunity.",
    learnTermId: "wait_decision",
  },
  {
    id: "stop_loss",
    title: "Stop loss",
    body:
      "Every trade needs a pre-decided exit price for when you're wrong. That's a stop loss. It caps your loss at a known amount. Trading without a stop is the most common way new traders blow up their account.",
    chartKey: "stop_loss",
    chartCaption: "A stop sits just past the level your idea depends on.",
    learnTermId: "stop_loss",
  },
  {
    id: "take_profit",
    title: "Take profit",
    body:
      "The opposite of a stop. A pre-decided price where you take your win. Without one, traders tend to hold winners until they reverse — turning a +2R winner into a 0R scratch.",
    chartKey: "take_profit",
    chartCaption: "Set a target before you enter, not after.",
    learnTermId: "take_profit",
  },
  {
    id: "risk_reward",
    title: "Risk-to-reward",
    body:
      "How much you stand to win vs. lose. R:R of 2.0 means the reward is twice the risk. With R:R 2.0, you only need ~33% of trades to win to break even. Most professional traders demand at least 1.5–2.0 on every entry.",
    chartKey: "risk_reward",
    chartCaption: "A clean trade has reward at least 1.5× the risk.",
    learnTermId: "risk_reward",
  },
  {
    id: "risk_percent",
    title: "Risk percent",
    body:
      "How much of your account you're willing to lose on a single trade. Professionals stay under 2%. New traders should start at 1%. Risking 10% per trade is how a single bad week wipes out months of progress.",
    learnTermId: "risk_percent",
  },
  {
    id: "leverage",
    title: "Leverage",
    body:
      "A multiplier. 10× leverage means a 10% adverse move liquidates you — the exchange closes your position at the worst possible time. Higher leverage doesn't make you richer, it just shrinks the distance to losing everything. Most beginners shouldn't go above 3–5×.",
    chartKey: "leverage",
    chartCaption: "Higher leverage = liquidation price closer to entry.",
    learnTermId: "leverage",
  },
  {
    id: "decision_quality",
    title: "Decisions are scored, not luck",
    body:
      "Here's the core idea: a bad trade that happens to win is still a bad trade. A good trade that happens to lose is still a good trade. The trainer scores the rules you followed — risk, stops, R:R, thesis — not whether the trade made money. Over time, good decisions win out.",
    customVisual: "decision_quality_compare",
  },
  {
    id: "trains_vs_doesnt",
    title: "What this trains, and what it doesn't",
    body:
      "Before you start, set the right expectations. This trainer sharpens the cognitive side of trading — chart reading, level placement, risk math, and your own pattern recognition. It does not simulate the parts of real trading that hurt most.",
    customVisual: "trains_vs_doesnt",
  },
  {
    id: "ready",
    title: "Ready to start",
    body:
      "Up next: an 8-question diagnostic to see where you're starting from. Then a personalized training path. You can revisit anything here from the Learn section any time.",
  },
];

export const TUTORIAL_DONE_KEY = "trainer.tutorialDone.v1";

export function isTutorialDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TUTORIAL_DONE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTutorialDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_DONE_KEY, "true");
  } catch {
    // ignore quota errors
  }
}

export function clearTutorialDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TUTORIAL_DONE_KEY);
  } catch {
    // ignore
  }
}
