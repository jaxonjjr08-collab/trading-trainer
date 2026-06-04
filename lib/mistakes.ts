import type { MistakeTag } from "./types";

type TagInfo = {
  label: string;
  description: string;
  positive?: boolean;
};

export const MISTAKE_TAGS: Record<MistakeTag, TagInfo> = {
  risk_too_high: {
    label: "Risk too high",
    description: "Risking more than ~2% of your account on a single trade. A few losses in a row can blow up the account.",
  },
  risk_too_low_to_learn: {
    label: "Risk too low to learn",
    description: "Risk under 0.25% — won't blow you up, but the position is so small the outcome won't teach you much.",
  },
  stop_too_tight: {
    label: "Stop too tight",
    description: "Stop loss is so close to entry it's likely to be triggered by normal noise before the thesis can play out.",
  },
  stop_in_noise: {
    label: "Stop inside noise",
    description: "Stop sits inside the most recent candle's wick range — that's exactly where wicks get swept.",
  },
  poor_risk_reward: {
    label: "Poor risk-to-reward",
    description: "Reward is less than ~1.5× the risk. Even with a high win rate this can lose money over time.",
  },
  counter_trend: {
    label: "Counter-trend",
    description: "Trading against the prevailing trend without strong confirmation. Possible, but lower probability.",
  },
  liquidation_before_stop: {
    label: "Liquidation before stop",
    description: "Estimated liquidation would trigger before your stop loss — leverage is too high for this stop distance.",
  },
  leverage_excessive: {
    label: "Leverage excessive",
    description: "Leverage above ~20× narrows the liquidation buffer and amplifies any pricing error.",
  },
  no_thesis: {
    label: "Missing thesis",
    description: "No clear written reason for taking the trade. If you can't articulate the setup, you can't review it later.",
  },
  no_invalidation: {
    label: "Missing invalidation",
    description: "You didn't write down what would prove the trade wrong. That's how losses become 'just hold a bit longer'.",
  },
  no_stop_loss: {
    label: "No stop loss",
    description: "You didn't define a stop. A trade without a stop is a position you can't size, can't risk-manage, and can't review. This is the single most common way new traders blow up an account.",
  },
  incomplete_plan: {
    label: "Incomplete plan",
    description: "One or more core trade fields (entry, stop, or target) were missing. The scoring can only evaluate what was provided — missing fields score zero in their categories.",
  },
  chasing_entry: {
    label: "Chasing entry",
    description: "Entering far from a defined level. This usually means worse risk-to-reward and emotional decisions.",
  },
  tp_unrealistic: {
    label: "Unrealistic target",
    description: "Take profit sits well past the next major level. Price tends to reject there before continuing.",
  },
  missed_valid_setup: {
    label: "Missed valid setup",
    description: "You waited, but the conditions were a strong setup. Waiting is fine — just notice you skipped a real edge.",
  },
  wait_was_best: {
    label: "Wait was correct",
    description: "Conditions were poor and you correctly chose not to trade. Discipline.",
    positive: true,
  },
  forced_trade: {
    label: "Forced trade",
    description: "Conditions favored sitting out, but you took a position anyway. This is one of the most common ways traders bleed.",
  },
  // v2.0 — trade management tags
  exited_too_early: {
    label: "Exited too early",
    description: "Closed a winning trade before it had a chance to play out. The thesis didn't fail — your conviction did.",
  },
  let_winner_become_loser: {
    label: "Winner became a loser",
    description: "Price moved well in your favour but you didn't protect it. The trade gave back the profit and then some.",
  },
  held_through_invalidation: {
    label: "Held through invalidation",
    description: "The structure that justified the trade broke, but you didn't exit. Hope is not a trade plan.",
  },
  failed_to_protect: {
    label: "Failed to protect",
    description: "Price moved 1R or more in your favour but you didn't move the stop to break-even. Free risk reduction left on the table.",
  },
  ignored_indicator: {
    label: "Ignored available indicator",
    description: "This scenario's lesson centers on a specific chart tool, but you neither turned it on nor mentioned it in your thesis. Use the Indicators bar above the chart — the tool the scenario teaches around is the one that would have anchored your read.",
  },
  portfolio_overconcentrated: {
    label: "Portfolio overconcentrated",
    description: "Your open positions add up to more than the 5% session risk budget. One bad day can take more from the account than the position sizing implied. Treat the budget as a cap, not a starting point.",
  },
  portfolio_correlated_overlap: {
    label: "Correlated overlap",
    description: "Two or more same-direction positions on highly correlated symbols. You think you have diversification; the market sees one bet. Pair longs with longs of low-correlation symbols, or hedge with the opposite direction.",
  },
  portfolio_balanced: {
    label: "Balanced portfolio",
    description: "Total session risk stayed within the budget and no two positions doubled the same bet. That's the composition a portfolio is supposed to teach.",
    positive: true,
  },
  managed_well: {
    label: "Managed well",
    description: "Protected the position, banked partials, or exited cleanly at the right moment. Good in-trade discipline.",
    positive: true,
  },
};
