// Linear learning path through the 30 LearnTerms. Modules build on each other; the
// /glossary page is the parallel flat reference for quick term lookups.
//
// v3.2 — modules may optionally declare a steps[] array. When present, the
// module gets a real course player ("Start course") that walks the user
// through Teach (read the concept) → Practice (apply it with hints) → Test
// (a different scenario, no hints, scored). Modules without steps[] keep the
// existing term-card list — backward compatible with v3.1 and earlier.

// v3.2 — one teaching step inside a course. Ties a Learn term (Teach phase)
// to two scenarios (Practice phase + Test phase). Completion is computed from
// the journal: an attempt on testScenarioId scoring >= passingScore counts.
export type CurriculumStep = {
  // Stable id — used in URLs and storage. Format: "<moduleId>-<conceptTermId>".
  id: string;
  // The LEARN_TERMS entry whose content drives the Teach card.
  conceptTermId: string;
  // Hint-rich first attempt — the guided form fires here.
  practiceScenarioId: string;
  // No-hints attempt — scoring this above passingScore marks the step complete.
  testScenarioId: string;
  // Test score threshold. Defaults to 70 if a step omits it.
  passingScore?: number;
};

export const DEFAULT_PASSING_SCORE = 70;

export type CurriculumModule = {
  id: string;
  title: string;
  summary: string;
  termIds: string[];
  // Optional course steps. When absent, module renders as the legacy term list.
  steps?: CurriculumStep[];
};

export const CURRICULUM: CurriculumModule[] = [
  {
    id: "foundations",
    title: "Foundations",
    summary: "What a chart is showing you. Read the structure before you ever press a button.",
    termIds: ["trend", "range", "support", "resistance", "volume", "htf_alignment"],
    // v3.2 — Teach → Practice → Test loop. Three lessons, each a complete
    // micro-arc tied to one Learn term. Practice scenarios are chosen because
    // the term IS the lesson (uptrend on trend, ranged chart on range, etc.).
    // v4.0 — htf_alignment added as the 4th step now that HTF is on every
    // scenario.
    steps: [
      {
        id: "foundations-trend",
        conceptTermId: "trend",
        practiceScenarioId: "tc-btc-2024-08",
        testScenarioId: "tc-eth-2024-05",
      },
      {
        id: "foundations-support",
        conceptTermId: "support",
        practiceScenarioId: "rc-btc-2024-06",
        testScenarioId: "rc-eth-2024-04",
      },
      {
        id: "foundations-range",
        conceptTermId: "range",
        practiceScenarioId: "rc-sol-2024-08",
        testScenarioId: "rc-btc-2025-01",
      },
      {
        id: "foundations-htf",
        conceptTermId: "htf_alignment",
        // Practice on a scenario where HTF makes the read obvious — a clean
        // trend continuation where the HTF was already trending up.
        practiceScenarioId: "tc-btc-aug-2024",
        // Test on a scenario where the LTF read might tempt a counter-trend
        // entry but the HTF tells you to wait or fade.
        testScenarioId: "fb-btc-2024-08",
      },
    ],
  },
  {
    id: "risk_basics",
    title: "Risk and sizing",
    summary: "The math that decides whether you survive long enough to learn anything.",
    termIds: ["risk_percent", "position_sizing", "stop_loss", "take_profit", "risk_reward"],
    steps: [
      {
        id: "risk-percent",
        conceptTermId: "risk_percent",
        practiceScenarioId: "tc-btc-2024-10",
        testScenarioId: "tc-eth-2024-11",
      },
      {
        id: "risk-stop-loss",
        conceptTermId: "stop_loss",
        practiceScenarioId: "ls-btc-2024-09",
        testScenarioId: "ls-eth-2024-02",
      },
      {
        id: "risk-rr",
        conceptTermId: "risk_reward",
        practiceScenarioId: "tc-sol-2024-10",
        testScenarioId: "tc-btc-2024-08",
      },
    ],
  },
  {
    // v5.5.0 — Backfilled with full steps[] now that v5.3.0 ships leverage
    // on /paper-trading. The three steps walk: what leverage actually buys
    // you (a tighter liquidation, not free profit) → what a leverage trap
    // looks like (your stop sits past your liq) → how liquidation clusters
    // compound the move once one breaks. Practice scenarios are all
    // real-data leverage_trap setups; test scenarios escalate.
    id: "leverage",
    title: "Leverage and liquidation",
    summary: "Why leverage is a buffer-shrinker, not a profit multiplier — and what happens when the buffer breaks.",
    termIds: ["leverage", "liquidation", "margin", "liquidation_clusters"],
    steps: [
      {
        id: "leverage-margin-basics",
        conceptTermId: "leverage",
        practiceScenarioId: "lt-btc-2023-08",
        testScenarioId: "lt-btc-2024-01",
      },
      {
        id: "leverage-trap",
        conceptTermId: "liquidation",
        practiceScenarioId: "lt-btc-2024-04",
        testScenarioId: "lt-btc-2024-08",
      },
      {
        id: "liquidation-cascade",
        conceptTermId: "liquidation_clusters",
        practiceScenarioId: "lt-btc-2020-03",
        testScenarioId: "lt-btc-2021-05",
      },
    ],
  },
  {
    // v4.1.1 — Portfolio thinking module. Term-list style for now (no
    // Teach/Practice/Test loop). The actual hands-on practice happens in the
    // /portfolio simulator, which is a different surface from the Practice
    // page that CurriculumStep targets. A future revision could add a
    // CurriculumStep variant that points at a PortfolioChallengeId.
    id: "portfolio_thinking",
    title: "Portfolio thinking",
    summary:
      "Per-trade risk caps how much one mistake costs. Portfolio risk caps how much one correlated event costs — and they're different.",
    termIds: ["portfolio_risk"],
  },
  {
    id: "setups",
    title: "Setups and patterns",
    summary: "Recognize the four most common bar patterns so you can stop guessing.",
    termIds: ["breakout", "fakeout", "retest", "liquidity_sweep"],
  },
  {
    // v5.5.0 — Backfilled. Three steps walk the planning loop: write a
    // thesis BEFORE deciding (clean retest scenarios are the natural
    // pairing — the level is obvious, the question is "do I write down
    // why before I click"), then practise invalidation (failed-breakout
    // scenarios force you to specify the level that says you're wrong),
    // then target realism (trend-continuation scenarios test whether your
    // R:R math is honest or wishful).
    id: "planning",
    title: "Planning a trade",
    summary: "Write the trade before you take it: entry, thesis, invalidation, target.",
    termIds: ["entry", "thesis", "invalidation", "target_realism", "chasing"],
    steps: [
      {
        id: "planning-thesis",
        conceptTermId: "thesis",
        practiceScenarioId: "cr-btc-2023-10",
        testScenarioId: "cr-sol-2023-10",
      },
      {
        id: "planning-invalidation",
        conceptTermId: "invalidation",
        practiceScenarioId: "fb-btc-2024-05",
        testScenarioId: "fb-eth-2024-07",
      },
      {
        id: "planning-target",
        conceptTermId: "target_realism",
        practiceScenarioId: "tc-btc-2024-08",
        testScenarioId: "tc-eth-2024-11",
      },
    ],
  },
  {
    // v5.5.0 — Backfilled. Two steps: the WAIT decision (recognising a chop
    // chart where forcing a trade is itself the mistake), and trade
    // management (when to move a stop or take partial profit). Both use
    // range_chop real-data scenarios where the highest-EV decision is
    // explicitly "no trade" — exactly the lesson the module's summary
    // promises. v5.4.0's losing_streak lesson on /paper-trading deep-links
    // here via the "Learn more" button.
    id: "discipline",
    title: "Discipline and traps",
    summary: "When the right move is no move, and how to recognize it.",
    termIds: ["wait_decision", "trade_management", "volatility", "slippage"],
    steps: [
      {
        id: "discipline-wait",
        conceptTermId: "wait_decision",
        practiceScenarioId: "rc-btc-2024-06",
        testScenarioId: "rc-sol-2024-08",
      },
      {
        id: "discipline-management",
        conceptTermId: "trade_management",
        practiceScenarioId: "rc-eth-2024-04",
        testScenarioId: "rc-btc-2025-01",
      },
    ],
  },
  {
    id: "crypto_signals",
    title: "Crypto market signals",
    summary: "Funding, positioning, and the data only crypto traders see.",
    termIds: ["funding_rate", "open_interest", "long_short_ratio"],
  },
  // v4.0.1 — Chart tools modules. Each step uses an existing real-data
  // scenario where the indicator's signal would have been the lesson.
  {
    id: "chart_tools_momentum",
    title: "Chart tools — momentum & trend",
    summary: "Moving averages, RSI, MACD, divergence, Bollinger Bands, and the Super Guppy ribbon. The most-watched momentum and trend indicators on every crypto chart.",
    termIds: [
      "sma",
      "ema",
      "key_mas",
      "rsi",
      "macd",
      "divergence",
      "bollinger_bands",
      // v5.1.1 — Super Guppy joins the momentum/trend module as a reading-
      // only term (no course step). The ribbon is opt-in on the chart; the
      // Learn term covers when to trust it and when to ignore it.
      "super_guppy",
    ],
    steps: [
      {
        id: "chart-tools-mas",
        conceptTermId: "ema",
        practiceScenarioId: "tc-btc-2024-08",
        testScenarioId: "tc-eth-2024-05",
      },
      {
        id: "chart-tools-rsi",
        conceptTermId: "rsi",
        practiceScenarioId: "tc-sol-2024-10",
        testScenarioId: "tc-btc-2024-10",
      },
      {
        id: "chart-tools-macd",
        conceptTermId: "macd",
        practiceScenarioId: "tc-eth-2024-11",
        testScenarioId: "tc-btc-aug-2024",
      },
      {
        id: "chart-tools-divergence",
        conceptTermId: "divergence",
        practiceScenarioId: "fb-btc-2024-08",
        testScenarioId: "fb-eth-2024-07",
      },
      {
        id: "chart-tools-bollinger",
        conceptTermId: "bollinger_bands",
        practiceScenarioId: "rc-btc-2024-06",
        testScenarioId: "rc-eth-2024-04",
      },
    ],
  },
  {
    id: "chart_tools_volume_drawing",
    title: "Chart tools — volume & drawing",
    summary: "VWAP, Volume Profile, Fibonacci, trend lines, channels. How institutional traders structure a chart.",
    termIds: ["vwap", "volume_profile", "fib_retracement", "fib_extension", "trend_line", "channel"],
    steps: [
      {
        id: "chart-tools-vwap",
        conceptTermId: "vwap",
        practiceScenarioId: "rc-sol-2024-08",
        testScenarioId: "rc-btc-2025-01",
      },
      {
        id: "chart-tools-volume-profile",
        conceptTermId: "volume_profile",
        practiceScenarioId: "ls-btc-2024-09",
        testScenarioId: "ls-eth-2024-02",
      },
      {
        id: "chart-tools-fib",
        conceptTermId: "fib_retracement",
        practiceScenarioId: "tc-btc-2024-10",
        testScenarioId: "tc-eth-2024-11",
      },
      {
        id: "chart-tools-trendlines",
        conceptTermId: "trend_line",
        practiceScenarioId: "tc-btc-2024-08",
        testScenarioId: "tc-eth-2024-05",
      },
      {
        id: "chart-tools-channels",
        conceptTermId: "channel",
        practiceScenarioId: "rc-eth-2024-09",
        testScenarioId: "rc-sol-2024-08",
      },
    ],
  },
];

// Convenience: flatten to an ordered list of termIds.
export const CURRICULUM_TERM_IDS: string[] = CURRICULUM.flatMap((m) => m.termIds);

// Find which module a term belongs to. Returns null if the term isn't in the curriculum.
export function moduleForTerm(termId: string): CurriculumModule | null {
  for (const m of CURRICULUM) {
    if (m.termIds.includes(termId)) return m;
  }
  return null;
}

// Localstorage helpers for tracking which terms have been opened/read.
const CURRICULUM_KEY = "trainer.curriculum.v1";

type CurriculumState = { readTermIds: string[] };

export function getCurriculumState(): CurriculumState {
  if (typeof window === "undefined") return { readTermIds: [] };
  try {
    const raw = window.localStorage.getItem(CURRICULUM_KEY);
    if (!raw) return { readTermIds: [] };
    const parsed = JSON.parse(raw) as CurriculumState;
    if (!Array.isArray(parsed.readTermIds)) return { readTermIds: [] };
    return parsed;
  } catch {
    return { readTermIds: [] };
  }
}

export function markTermRead(termId: string): void {
  if (typeof window === "undefined") return;
  const state = getCurriculumState();
  if (state.readTermIds.includes(termId)) return;
  state.readTermIds.push(termId);
  try {
    window.localStorage.setItem(CURRICULUM_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function isTermRead(termId: string): boolean {
  return getCurriculumState().readTermIds.includes(termId);
}

export const CURRICULUM_STORAGE_KEY = CURRICULUM_KEY;

// v2.8 — The "do this next" module: the first module in CURRICULUM order that
// has any unread term. Returns null when the user has read every term in every
// module — caller can then drop into refresher mode. Pure function — pass the
// readTermIds the caller already loaded so this stays SSR-safe and cheap.
export function currentModule(readTermIds: Iterable<string>): CurriculumModule | null {
  const readSet = new Set(readTermIds);
  for (const mod of CURRICULUM) {
    if (mod.termIds.some((id) => !readSet.has(id))) return mod;
  }
  return null;
}

// Sibling helper: the next unread term inside a module, in module order.
export function nextUnreadInModule(
  mod: CurriculumModule,
  readTermIds: Iterable<string>
): string | null {
  const readSet = new Set(readTermIds);
  for (const id of mod.termIds) {
    if (!readSet.has(id)) return id;
  }
  return null;
}

// v3.2 — course step completion. A step is complete when there is any saved
// attempt on its testScenarioId scoring at or above passingScore. Caller
// passes the attempts list (so this stays SSR-safe and testable).
export type AttemptSummary = { scenarioId: string; score: number };

export function isStepComplete(
  step: CurriculumStep,
  attempts: Iterable<AttemptSummary>
): boolean {
  const threshold = step.passingScore ?? DEFAULT_PASSING_SCORE;
  for (const a of attempts) {
    if (a.scenarioId === step.testScenarioId && a.score >= threshold) return true;
  }
  return false;
}

// Next incomplete step in a module — drives the course player's "current step"
// indicator. Returns null when the module is fully complete (or has no steps).
export function nextStepInModule(
  mod: CurriculumModule,
  attempts: Iterable<AttemptSummary>
): CurriculumStep | null {
  if (!mod.steps || mod.steps.length === 0) return null;
  const attemptsArray = [...attempts];
  for (const step of mod.steps) {
    if (!isStepComplete(step, attemptsArray)) return step;
  }
  return null;
}
