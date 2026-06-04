import type { LessonTag, MistakeTag, Score } from "./types";

export type Lesson = {
  tag: LessonTag;
  title: string;
  why: string;
  nextStep: string;
};

export const LESSONS: Record<LessonTag, Lesson> = {
  stop_loss_invalidation: {
    tag: "stop_loss_invalidation",
    title: "Stop loss and invalidation",
    why: "Without a defined stop and a written invalidation, every loss can be rationalized into 'just hold a bit longer'.",
    nextStep: "On your next attempt, write the invalidation sentence before you place the stop — the stop should sit where that sentence is true.",
  },
  risk_reward_basics: {
    tag: "risk_reward_basics",
    title: "Risk-to-reward basics",
    why: "A reward smaller than ~1.5× your risk forces a high win rate just to break even. The math gets harder as fees and slippage compound.",
    nextStep: "Practice scenarios where you only take the trade if the distance to the next opposing level is at least 2× the distance to your stop.",
  },
  leverage_liquidation: {
    tag: "leverage_liquidation",
    title: "Leverage and liquidation",
    why: "Leverage doesn't add edge — it shrinks the move the exchange needs to take your position before your stop fires.",
    nextStep: "Try the same setup at 2× and at 20× leverage and compare the estimated liquidation buffer to your stop distance.",
  },
  position_sizing: {
    tag: "position_sizing",
    title: "Position sizing",
    why: "Risk per trade compounds in both directions. 5% per trade means a 5-trade losing streak halves the account; 1% means you barely feel it.",
    nextStep: "Re-run a scenario and size the position so that the move from entry to stop equals exactly 1% of the account.",
  },
  trade_thesis: {
    tag: "trade_thesis",
    title: "Building a trade thesis",
    why: "A trade without a written reason is one you cannot review. Months later you'll only remember the win or loss, not why you took it.",
    nextStep: "Before submitting, write two sentences: what you think happens next, and which specific level or structure tells you that.",
  },
  invalidation_discipline: {
    tag: "invalidation_discipline",
    title: "Invalidation",
    why: "Deciding when you're wrong before you're emotional is the only reliable way to exit losers cleanly.",
    nextStep: "Write the invalidation sentence FIRST, then derive the stop from it — not the other way around.",
  },
  entry_timing: {
    tag: "entry_timing",
    title: "Entry timing",
    why: "Chasing entries means worse fill, worse stop distance, and worse R:R — the same setup taken 1% better can flip the trade.",
    nextStep: "On the next setup, set the entry at the level itself and don't move it. If price runs without you, let the trade go.",
  },
  when_to_wait: {
    tag: "when_to_wait",
    title: "When to wait",
    why: "The middle of a range, fresh ATHs with no history, and post-news bars are conditions where the highest-EV decision is no position at all.",
    nextStep: "On your next attempt at a chop or news-vol scenario, force yourself to pick Wait and write WHY waiting beats either side.",
  },
  target_planning: {
    tag: "target_planning",
    title: "Target planning",
    why: "Most moves rest or reverse at the next level. Holding for one ambitious target means watching paper profit evaporate.",
    nextStep: "Plan the next trade with a first target at the next level and, mentally, a runner beyond it — not a single moonshot TP.",
  },
  complete_plan: {
    tag: "complete_plan",
    title: "Complete trade planning",
    why: "Submitting without entry, stop, or target means the trade can't be sized, can't be risk-managed, and can't be reviewed later.",
    nextStep: "Before submitting, check the pre-submit list — every field filled with intent, not auto-defaults.",
  },
};

const MISTAKE_TO_LESSON: Record<MistakeTag, LessonTag | null> = {
  no_stop_loss: "stop_loss_invalidation",
  poor_risk_reward: "risk_reward_basics",
  leverage_excessive: "leverage_liquidation",
  liquidation_before_stop: "leverage_liquidation",
  risk_too_high: "position_sizing",
  risk_too_low_to_learn: "position_sizing",
  no_thesis: "trade_thesis",
  no_invalidation: "invalidation_discipline",
  chasing_entry: "entry_timing",
  forced_trade: "when_to_wait",
  missed_valid_setup: "when_to_wait",
  tp_unrealistic: "target_planning",
  incomplete_plan: "complete_plan",
  stop_too_tight: "stop_loss_invalidation",
  stop_in_noise: "stop_loss_invalidation",
  counter_trend: "trade_thesis",
  wait_was_best: null,
  // v2.0 — trade management
  exited_too_early: "invalidation_discipline",
  let_winner_become_loser: "stop_loss_invalidation",
  held_through_invalidation: "invalidation_discipline",
  failed_to_protect: "stop_loss_invalidation",
  managed_well: null,
  // v4.0.3 — chart-tools awareness lives in the Learn "chart_tools" category,
  // which doesn't map to the legacy LessonTag union. Routing via
  // MISTAKE_TO_LEARN (→ ema term) is the navigation path for now.
  ignored_indicator: null,
  // v4.1 — portfolio thinking. Same situation as ignored_indicator: the
  // legacy LessonTag union doesn't have a portfolio_risk entry; navigation
  // goes via MISTAKE_TO_LEARN → portfolio_risk term.
  portfolio_overconcentrated: null,
  portfolio_correlated_overlap: null,
  portfolio_balanced: null,
};

// Severity order — the recommendation prefers the most impactful mistake.
const LESSON_PRIORITY: LessonTag[] = [
  "leverage_liquidation",
  "stop_loss_invalidation",
  "complete_plan",
  "position_sizing",
  "risk_reward_basics",
  "when_to_wait",
  "entry_timing",
  "target_planning",
  "invalidation_discipline",
  "trade_thesis",
];

export function recommendLessonFromTags(tags: MistakeTag[]): Lesson | null {
  const lessons = new Set<LessonTag>();
  for (const t of tags) {
    const lesson = MISTAKE_TO_LESSON[t];
    if (lesson) lessons.add(lesson);
  }
  if (lessons.size === 0) return null;
  for (const p of LESSON_PRIORITY) {
    if (lessons.has(p)) return LESSONS[p];
  }
  // Fallback to first inserted.
  const first = lessons.values().next().value as LessonTag;
  return LESSONS[first];
}

export function recommendLesson(score: Score): Lesson | null {
  return recommendLessonFromTags(score.tags);
}
