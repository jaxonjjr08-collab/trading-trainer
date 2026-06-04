import type {
  MistakeTag,
  Scenario,
  ScenarioCategory,
  SetupType,
} from "./types";

// Maps the internal scoring setupType to the user-facing category labels in the v1.5 spec.
const SETUP_TO_CATEGORY: Record<SetupType, ScenarioCategory> = {
  trend_continuation: "uptrend-pullback",
  support_breakdown: "downtrend-pullback",
  range_chop: "range-chop",
  clean_retest: "breakout",
  failed_breakout: "fakeout",
  liquidity_sweep: "liquidity-sweep",
  overextended: "overextended",
  leverage_trap: "leverage-trap",
  news_volatility: "news-volatility",
  no_setup: "no-setup",
};

export const CATEGORY_LABEL: Record<ScenarioCategory, string> = {
  "uptrend-pullback": "Uptrend pullback",
  "downtrend-pullback": "Downtrend pullback",
  "range-chop": "Range chop",
  "breakout": "Breakout",
  "fakeout": "Fakeout",
  "liquidity-sweep": "Liquidity sweep",
  "overextended": "Overextended",
  "leverage-trap": "Leverage trap",
  "news-volatility": "News volatility",
  "no-setup": "No clear setup",
};

const DEFAULT_CONCEPT_TAGS: Record<SetupType, string[]> = {
  trend_continuation: ["trend", "entry", "thesis"],
  support_breakdown: ["invalidation", "stop_loss", "thesis"],
  range_chop: ["wait_decision", "range", "patience"],
  clean_retest: ["retest", "entry", "risk_reward"],
  failed_breakout: ["fakeout", "chasing", "entry"],
  liquidity_sweep: ["liquidity_sweep", "stop_loss"],
  overextended: ["target_realism", "chasing"],
  leverage_trap: ["leverage", "liquidation", "risk_percent"],
  news_volatility: ["volatility", "wait_decision"],
  no_setup: ["wait_decision", "thesis"],
};

const DEFAULT_COMMON_MISTAKES: Record<SetupType, MistakeTag[]> = {
  trend_continuation: ["chasing_entry", "no_thesis"],
  support_breakdown: ["counter_trend", "no_invalidation"],
  range_chop: ["forced_trade", "poor_risk_reward"],
  clean_retest: ["chasing_entry", "poor_risk_reward"],
  failed_breakout: ["chasing_entry", "counter_trend"],
  liquidity_sweep: ["stop_in_noise", "stop_too_tight"],
  overextended: ["tp_unrealistic", "chasing_entry"],
  leverage_trap: ["leverage_excessive", "liquidation_before_stop"],
  news_volatility: ["forced_trade", "stop_too_tight"],
  no_setup: ["forced_trade", "no_thesis"],
};

const DEFAULT_LESSON_LINKS: Record<SetupType, string[]> = {
  trend_continuation: ["trend", "entry", "thesis"],
  support_breakdown: ["invalidation", "stop_loss"],
  range_chop: ["wait_decision", "range"],
  clean_retest: ["retest", "risk_reward"],
  failed_breakout: ["fakeout", "chasing"],
  liquidity_sweep: ["liquidity_sweep", "stop_loss"],
  overextended: ["target_realism", "resistance"],
  leverage_trap: ["leverage", "liquidation"],
  news_volatility: ["volatility", "wait_decision"],
  no_setup: ["wait_decision", "thesis"],
};

const DIFFICULTY_LABEL: Record<Scenario["difficulty"], "beginner" | "intermediate" | "hard"> = {
  easy: "beginner",
  medium: "intermediate",
  hard: "hard",
};

export type ScenarioMeta = {
  category: ScenarioCategory;
  categoryLabel: string;
  difficultyLabel: "beginner" | "intermediate" | "hard";
  conceptTags: string[];
  idealDecision: string;
  commonMistakes: MistakeTag[];
  lessonLinks: string[];
};

function defaultIdealDecision(s: Scenario): string {
  if (s.preferredDecision === "wait") {
    return "Wait — conditions don't justify a position.";
  }
  const dir = s.preferredDecision === "long" ? "Long" : "Short";
  return `${dir} with a stop just past the level your thesis depends on; target before the next opposing level.`;
}

export function scenarioMeta(s: Scenario): ScenarioMeta {
  const category = s.category ?? SETUP_TO_CATEGORY[s.setupType];
  return {
    category,
    categoryLabel: CATEGORY_LABEL[category],
    difficultyLabel: DIFFICULTY_LABEL[s.difficulty],
    conceptTags: s.conceptTags ?? DEFAULT_CONCEPT_TAGS[s.setupType] ?? [],
    idealDecision: s.idealDecision ?? defaultIdealDecision(s),
    commonMistakes: s.commonMistakes ?? DEFAULT_COMMON_MISTAKES[s.setupType] ?? [],
    lessonLinks: s.lessonLinks ?? DEFAULT_LESSON_LINKS[s.setupType] ?? [],
  };
}
