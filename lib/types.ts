export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TrendKind = "up" | "down" | "range";

export type Difficulty = "easy" | "medium" | "hard";

export type SetupType =
  | "trend_continuation"
  | "failed_breakout"
  | "range_chop"
  | "support_breakdown"
  | "overextended"
  | "liquidity_sweep"
  | "clean_retest"
  | "leverage_trap"
  | "news_volatility"
  | "no_setup";

export type LessonTag =
  | "stop_loss_invalidation"
  | "risk_reward_basics"
  | "leverage_liquidation"
  | "position_sizing"
  | "trade_thesis"
  | "invalidation_discipline"
  | "entry_timing"
  | "when_to_wait"
  | "target_planning"
  | "complete_plan";

export type PracticeMode = "study" | "challenge";

export type KeyLevel = { price: number; label: string };

export type ScenarioOutcomeNote = {
  description: string;
  takeaway: string;
};

export type LessonHint = {
  title: string;
  body: string;
  nextStep: string;
};

export type ScenarioContext = {
  trend: TrendKind;
  support: number[];
  resistance: number[];
  currentPrice: number;
  bestDirection: Direction;
  notes: string;
};

export type ScenarioCategory =
  | "uptrend-pullback"
  | "downtrend-pullback"
  | "range-chop"
  | "breakout"
  | "fakeout"
  | "liquidity-sweep"
  | "overextended"
  | "leverage-trap"
  | "news-volatility"
  | "no-setup";

export type ScenarioDifficultyLabel = "beginner" | "intermediate" | "hard";

export type Scenario = {
  id: string;
  title: string;
  symbol: string;
  timeframe: string;
  difficulty: Difficulty;
  setupType: SetupType;
  marketContext: string;
  neutralScenarioNotes: string;
  learningFocus: string;
  visibleCandles: Candle[];
  hiddenCandles: Candle[];
  decisionPointIndex: number;
  keyLevels: KeyLevel[];
  preferredDecision: Direction;
  acceptableDecisions?: Direction[];
  outcome: ScenarioOutcomeNote;
  lessonRecommendation: LessonTag;
  context: ScenarioContext;
  // Optional metadata — when absent, helpers derive sensible defaults from setupType.
  category?: ScenarioCategory;
  conceptTags?: string[];
  idealDecision?: string;
  commonMistakes?: MistakeTag[];
  lessonLinks?: string[];
  // v3.0 — added "procedural" for scenarios generated on demand at runtime
  // (see lib/procedural-scenarios.ts). UI surfaces a small badge so the user
  // knows the chart is randomly produced, not a hand-authored historical one.
  dataSource?: "synthetic" | "real" | "procedural";
  // v2.0 — optional post-entry decision points. When present and the user took
  // the preferred direction, the practice flow steps through these prompts
  // between entry and outcome reveal. Backwards-compat: scenarios without
  // managementPoints behave exactly as v1 (instant outcome on submit).
  managementPoints?: ManagementPoint[];
  // v2.2 — optional worked-example "what a strong decision looked like" card,
  // shown above the score breakdown after submit. Authored per scenario; when
  // absent the card is hidden (graceful degradation during backfill).
  idealDecisionPlan?: IdealDecisionPlan;
  // v2.2 — optional higher-timeframe context. When present, the Practice page
  // renders a thumbnail of the HTF chart beside the main chart so beginners
  // can locate the decision point inside the bigger trend.
  higherTimeframe?: string;             // human label, e.g. "1d" when timeframe is "6h"
  higherTimeframeCandles?: Candle[];    // OHLCV at the HTF, covering a wider window than the main chart
  higherTimeframeDecisionIndex?: number; // index into higherTimeframeCandles closest to the main decision point
  // v4.0.3 — chart tools the scenario's lesson centers on. When set, the
  // scoring engine adds a `chart_tools` category (5 pts) that rewards the
  // student for either toggling these indicators on or referencing them in
  // their thesis. Empty array is treated the same as undefined.
  availableIndicators?: ChartToolId[];
};

export type IdealDecisionPlan = {
  direction: Direction;
  // Omitted when direction is "wait".
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  riskPercent?: number;
  // 1–2 sentence narrated rationale. Required even on "wait" — describes
  // what conditions would create a setup.
  thesis: string;
  // What proves this thesis wrong. Optional but strongly encouraged.
  invalidation?: string;
};

// v2.0 — trade management primitives.

export type ManagementAction =
  | "hold"           // do nothing, continue to next decision point
  | "move_stop_be"   // move stop to entry (break-even); position size unchanged
  | "partial_50"     // close 50% of remaining position at this candle's close
  | "exit";          // close 100% at this candle's close

export type ManagementPoint = {
  // Index into the combined visibleCandles + hiddenCandles array. Must fall
  // inside the hidden window (> visibleCandles.length - 1).
  candleIndex: number;
  // Plain-language prompt shown to the user. Author can reference the level
  // being tested (e.g. "Price tagged $30k resistance — partial?").
  prompt: string;
  // The action that maximises the lesson. Used for scoring.
  idealAction: ManagementAction;
  // Other actions that are defensible (partial credit when scoring).
  acceptableActions?: ManagementAction[];
  // One-line "why" shown in review after outcome reveal.
  rationale: string;
};

export type ManagementDecision = {
  // Which managementPoint this responds to (by candleIndex).
  candleIndex: number;
  action: ManagementAction;
  // Snapshot of position state AFTER this action:
  // - newStop: when action is move_stop_be, equals entry; else unchanged
  // - remainingPct: 100 / 50 / 0 depending on action sequence
  newStop?: number;
  remainingPct: number;
  // Price at which any partial/exit fill happened (the candle's close).
  fillPrice?: number;
};

export type Direction = "long" | "short" | "wait";

// v4.0.2 — toggleable chart overlays on the Practice chart. "ema" is the bundle
// of three EMAs (20/50/200) rendered together; "bb" is Bollinger Bands;
// "rsi"/"macd" render in sub-panels below the main chart. The same ids are
// reused by v4.0.3's scoring + AI surfaces, so keeping the union small and
// stable matters more than enumerating every period.
export type ChartToolId =
  | "ema"
  | "rsi"
  | "macd"
  | "bb"
  | "vwap"
  | "super_guppy"
  | "keltner"
  | "pivots"
  | "patterns";

export const CHART_TOOL_LABELS: Record<ChartToolId, string> = {
  ema: "EMA (20/50/200)",
  rsi: "RSI (14)",
  macd: "MACD (12/26/9)",
  bb: "Bollinger Bands (20, 2σ)",
  vwap: "VWAP",
  super_guppy: "Super Guppy (GMMA)",
  keltner: "Keltner Channels (20, 10, 2 ATR)",
  pivots: "Pivot Points (R1/R2/S1/S2)",
  patterns: "Candle patterns",
};

export type IndicatorConfig = Record<ChartToolId, boolean>;

export const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = {
  ema: false,
  rsi: false,
  macd: false,
  bb: false,
  vwap: false,
  super_guppy: false,
  keltner: false,
  pivots: false,
  patterns: false,
};

export type Decision = {
  direction: Direction;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  riskPercent?: number;
  accountSize: number;
  thesis: string;
  invalidation: string;
};

export type MistakeTag =
  | "risk_too_high"
  | "risk_too_low_to_learn"
  | "stop_too_tight"
  | "stop_in_noise"
  | "poor_risk_reward"
  | "counter_trend"
  | "liquidation_before_stop"
  | "leverage_excessive"
  | "no_thesis"
  | "no_invalidation"
  | "no_stop_loss"
  | "incomplete_plan"
  | "chasing_entry"
  | "tp_unrealistic"
  | "missed_valid_setup"
  | "wait_was_best"
  | "forced_trade"
  // v2.0 — trade management
  | "exited_too_early"           // bailed on a winner before it had a chance
  | "let_winner_become_loser"    // didn't protect a +1R move; trade gave back
  | "held_through_invalidation"  // structure broke, didn't exit
  | "failed_to_protect"          // didn't move stop to BE when warranted
  | "managed_well"               // positive: protected, partialed, or exited cleanly
  // v4.0.3 — chart-tools usage. Fires when a scenario marked specific
  // indicators as available (Scenario.availableIndicators) and the student
  // neither toggled any of them on nor referenced any in their thesis.
  | "ignored_indicator"
  // v4.1 — portfolio thinking. Surface mistakes that only exist when there's
  // more than one open position.
  | "portfolio_overconcentrated"   // total risk across open positions > ~5%
  | "portfolio_correlated_overlap" // two same-direction positions in highly
                                   // correlated symbols (Pearson > 0.7)
  | "portfolio_balanced";          // positive: held diversified, modest total risk

export type ScoreCategoryId =
  | "direction"
  | "risk"
  | "rr"
  | "stop"
  | "leverage"
  | "entry"
  | "target"
  | "thesis"
  | "invalidation"
  // v2.0 — only contributes when scenario has managementPoints and the user took
  // the preferred direction. Absent otherwise.
  | "trade_management"
  // v4.0.3 — only contributes when scenario.availableIndicators is set and the
  // user took a non-wait direction. Absent otherwise.
  | "chart_tools"
  // v4.1 — emitted by lib/portfolio-scoring at portfolio session end. Does not
  // appear inside scoreDecision; lives in a separate PortfolioScore record.
  | "portfolio_risk";

export type ScoreCategoryResult = {
  id: ScoreCategoryId;
  label: string;
  points: number;
  max: number;
  note: string;
  tags: MistakeTag[];
  positive: boolean;
};

export type Score = {
  total: number;
  max: number;
  breakdown: ScoreCategoryResult[];
  tags: MistakeTag[];
  strengths: string[];
  weaknesses: string[];
};

export type Outcome = {
  hit: "tp" | "sl" | "liq" | "neither";
  exitPrice: number;
  exitCandleIndex: number;
  pnlPercent: number;
  liquidated: boolean;
  estimatedLiquidationPrice: number | null;
};

export type Attempt = {
  id: string;
  createdAt: number;
  scenarioId: string;
  decision: Decision;
  score: Score;
  outcome: Outcome;
  // Pin attempts to the scoring rules they were created under so future rule changes
  // don't silently make old reviews look wrong.
  scoringVersion?: string;
  // Free-text reflection the user adds after the outcome reveal.
  reflection?: string;
  // v2.0 — present only when the scenario had managementPoints AND the user took
  // the preferred direction. One entry per managementPoint, in order.
  managementDecisions?: ManagementDecision[];
  // v2.4 — annotated replay. Timestamped notes the user adds when re-reading
  // an old attempt with new knowledge ("I now see the lower high I missed").
  // Distinct from `reflection` which is the original post-submit note;
  // annotations are the meta-learning loop.
  annotations?: AttemptAnnotation[];
  // v4.0.3 — snapshot of which chart overlays were toggled on at submit. Used
  // by the chart_tools scoring category and the AI prompt's INDICATORS block.
  // Absent on attempts saved before v4.0.3.
  indicatorState?: IndicatorConfig;
  // v3.1 — frozen copy of the scenario data the attempt was made against.
  // Populated on save so old attempts survive even if:
  //   - the scenario was procedural (its id has no live lookup), or
  //   - the scenario library changes / removes an entry between versions.
  // Snapshot is intentionally minimal: enough to re-render the chart, key
  // levels, outcome, and ideal plan during review. Optional for backwards
  // compatibility with pre-v3.1 attempts.
  scenarioSnapshot?: ScenarioSnapshot;
};

export type AttemptAnnotation = {
  at: number;
  note: string;
};

// v3.1 — minimal frozen snapshot of a Scenario, embedded in saved Attempts.
// Captures the fields that the review surfaces actually read: chart data,
// level overlays, ideal plan, outcome notes, and human-readable metadata.
// Does NOT capture HTF candles or management points — those stay tied to the
// live scenario lookup; their absence on revisit is acceptable.
export type ScenarioSnapshot = {
  title: string;
  symbol: string;
  timeframe: string;
  setupType: SetupType;
  difficulty: Difficulty;
  visibleCandles: Candle[];
  hiddenCandles: Candle[];
  keyLevels: KeyLevel[];
  preferredDecision: Direction;
  outcome: ScenarioOutcomeNote;
  idealDecisionPlan?: IdealDecisionPlan;
  dataSource?: "synthetic" | "real" | "procedural";
};

// v4.1 — Portfolio thinking. A "portfolio session" is one master timeline
// running over a 7-day window. Multiple symbols tick together. The student
// opens positions on any symbol at any tick and manages them as time
// advances. Designed to teach diversification, total-risk budgeting, and
// correlation — concepts that don't exist in single-scenario Practice.

export type PortfolioSymbol = {
  symbol: string;          // e.g. "BTC/USD"
  basePrice: number;       // starting price for synthetic generation
  // ρ in [0, 1] — desired correlation with the synthetic market factor.
  // Used by lib/portfolio-data to construct each symbol's drift as
  //   ρ * market + sqrt(1-ρ²) * idiosyncratic_noise
  // so realized close-on-close correlation is ≈ ρ.
  marketCorrelation: number;
  candles: Candle[];       // aligned with the session's timeline
  // v5.0 — populated only on live-mode sessions. Tells the polling hook
  // which Coinbase product to fetch and at what granularity (seconds).
  // Synthetic sessions leave this undefined.
  productId?: string;          // e.g. "BTC-USD"
  granularitySec?: number;     // 60 / 300 / 900 / 3600 / 21600 / 86400
};

export type PortfolioPositionStatus =
  | "open"          // active, P&L is mark-to-market at currentIdx
  | "closed_tp"     // hit take profit at exitIdx
  | "closed_sl"     // hit stop loss at exitIdx
  | "closed_manual" // student closed early
  | "closed_liq";   // v5.3.0 — liquidated; price crossed the liquidation level

export type PortfolioPosition = {
  id: string;
  symbol: string;            // matches a PortfolioSymbol.symbol
  direction: "long" | "short"; // no wait — opening a position is the action
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;       // % of account risked on this position
  openedAtIdx: number;       // candle index when the position was opened
  status: PortfolioPositionStatus;
  exitIdx?: number;          // candle index at close, if closed
  exitPrice?: number;        // fill price at close
  pnlPercent?: number;       // realized P&L %; mark-to-market for open positions
                             // is computed on read, not stored
  // v5.3.0 — perp/leverage fields. leverage = 1 is spot (no liquidation, no
  // funding). Anything higher is a perpetual-futures-style leveraged
  // position with a deterministic liquidation level and accrued funding
  // cost. Missing on legacy saves implies spot (1×).
  leverage?: number;
  liquidationPrice?: number;
  // Accumulated funding cost as a percentage of account, accrued during
  // advanceTo. Subtracted from realized P&L at close. Always 0 for spot.
  fundingCostPct?: number;
};

export type PortfolioSessionStatus = "active" | "ended";

export type PortfolioSession = {
  id: string;
  startedAt: number;          // ms epoch
  endedAt?: number;
  // Deterministic regeneration handle. The candle arrays in `symbols` are
  // produced from this seed; saving the session keeps the seed but lets us
  // reconstruct identical candles on load.
  datasetSeed: number;
  intervalSec: number;        // candle width — 14400 (4h) for v4.1
  candleCount: number;        // total candles in the timeline (42 = 4h × 7d)
  symbols: PortfolioSymbol[]; // candles populated from datasetSeed
  currentIdx: number;         // 0..candleCount-1; advances on user action
  positions: PortfolioPosition[];
  status: PortfolioSessionStatus;
  accountSize: number;        // starting equity
  scoringVersion?: string;    // pins to portfolio-scoring version on session end
  // v5.0 — discriminator. "synthetic" sessions are bounded-window /portfolio
  // sims; "live" sessions stream real Coinbase candles into the same shape.
  // Missing field implies "synthetic" so old saved /portfolio sessions still
  // load cleanly.
  mode?: "synthetic" | "live";
};

// v4.1 — emitted by scorePortfolioRisk. Mirrors Score in shape so the same
// review surfaces can render it, but lives independently from the per-attempt
// Score on Practice.
export type PortfolioScore = {
  total: number;
  max: number;
  breakdown: ScoreCategoryResult[];
  tags: MistakeTag[];
  strengths: string[];
  weaknesses: string[];
};
