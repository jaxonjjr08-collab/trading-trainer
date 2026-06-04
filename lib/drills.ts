import type { MistakeTag, SetupType } from "./types";
import type { SkillId } from "./skills";

export type DrillSet = {
  id: string;
  title: string;
  description: string;
  skillFocus: SkillId;
  relatedMistakeTags: MistakeTag[];
  relatedLearnTerms: string[];
  scenarioFilters: { setupTypes: SetupType[] };
  targetAttempts: number;
};

export const DRILL_SETS: DrillSet[] = [
  {
    id: "stop_loss_basics",
    title: "Stop Loss Basics",
    description:
      "Practice placing stops at logical levels outside noise. Avoid no-stop and stop-in-wick mistakes.",
    skillFocus: "stop_placement",
    relatedMistakeTags: ["no_stop_loss", "stop_too_tight", "stop_in_noise"],
    relatedLearnTerms: ["stop_loss", "liquidity_sweep"],
    scenarioFilters: { setupTypes: ["liquidity_sweep", "support_breakdown"] },
    targetAttempts: 3,
  },
  {
    id: "risk_reward_basics",
    title: "Risk-to-Reward Basics",
    description:
      "Train your eye to skip setups where reward is less than 1.5× risk. Pick entries closer to the level.",
    skillFocus: "risk_reward",
    relatedMistakeTags: ["poor_risk_reward"],
    relatedLearnTerms: ["risk_reward", "entry"],
    scenarioFilters: { setupTypes: ["clean_retest", "trend_continuation"] },
    targetAttempts: 3,
  },
  {
    id: "leverage_control",
    title: "Leverage Control",
    description:
      "Keep leverage low enough that liquidation sits outside your stop. Bigger isn't better.",
    skillFocus: "leverage_control",
    relatedMistakeTags: ["leverage_excessive", "liquidation_before_stop"],
    relatedLearnTerms: ["leverage", "liquidation"],
    scenarioFilters: { setupTypes: ["leverage_trap"] },
    targetAttempts: 3,
  },
  {
    id: "patience_training",
    title: "Patience Training",
    description:
      "Sit out when conditions are bad. Wait is a decision — forced trades in chop bleed accounts.",
    skillFocus: "patience",
    relatedMistakeTags: ["forced_trade", "missed_valid_setup", "wait_was_best"],
    relatedLearnTerms: ["wait_decision"],
    scenarioFilters: { setupTypes: ["range_chop", "news_volatility", "no_setup"] },
    targetAttempts: 4,
  },
  {
    id: "breakout_traps",
    title: "Breakout Traps",
    description:
      "Identify failed breakouts and avoid chasing the candle. Trade the reversal, not the trap.",
    skillFocus: "direction_reading",
    relatedMistakeTags: ["chasing_entry", "counter_trend"],
    relatedLearnTerms: ["fakeout", "breakout", "retest"],
    scenarioFilters: { setupTypes: ["failed_breakout"] },
    targetAttempts: 3,
  },
  {
    id: "trade_thesis_builder",
    title: "Trade Thesis Builder",
    description:
      "Write a thesis you could read out loud. Name the setup, the level, and what you expect.",
    skillFocus: "trade_thesis",
    relatedMistakeTags: ["no_thesis", "no_invalidation", "incomplete_plan"],
    relatedLearnTerms: ["thesis", "invalidation"],
    scenarioFilters: { setupTypes: ["trend_continuation", "clean_retest"] },
    targetAttempts: 3,
  },
];

export const DRILLS_BY_ID: Record<string, DrillSet> = Object.fromEntries(
  DRILL_SETS.map((d) => [d.id, d])
);

export function drillById(id: string): DrillSet | null {
  return DRILLS_BY_ID[id] ?? null;
}

export function drillForSkill(skillId: SkillId): DrillSet | null {
  return DRILL_SETS.find((d) => d.skillFocus === skillId) ?? null;
}
