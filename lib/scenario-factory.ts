import type {
  Candle,
  Difficulty,
  Direction,
  IdealDecisionPlan,
  KeyLevel,
  LessonTag,
  ManagementPoint,
  Scenario,
  ScenarioCategory,
  ScenarioContext,
  ScenarioOutcomeNote,
  SetupType,
} from "./types";

// Compact authoring shape for real-OHLCV scenarios. Hands `candles` in as a flat array
// and slices into visible/hidden at `visibleCount`. All other fields are required so the
// resulting Scenario is fully usable without surprises.
export type BuildRealScenarioArgs = {
  id: string;
  title: string;
  symbol: string;
  timeframe: string;
  difficulty: Difficulty;
  setupType: SetupType;
  candles: Candle[];
  visibleCount: number;
  keyLevels: KeyLevel[];
  preferredDecision: Direction;
  acceptableDecisions?: Direction[];
  marketContext: string;
  neutralScenarioNotes: string;
  learningFocus: string;
  outcome: ScenarioOutcomeNote;
  lessonRecommendation: LessonTag;
  context: ScenarioContext;
  // Optional v1.5 metadata fields. Defaults derive from setupType via scenario-meta.ts.
  category?: ScenarioCategory;
  conceptTags?: string[];
  idealDecision?: string;
  // v2.0 — optional trade-management decision points fired between submit and
  // outcome reveal when the user takes the preferred direction.
  managementPoints?: ManagementPoint[];
  // v2.2 — optional curated worked-example shown above the score breakdown.
  idealDecisionPlan?: IdealDecisionPlan;
  // v2.2 — optional higher-timeframe context rendered beside the main chart.
  higherTimeframe?: string;
  higherTimeframeCandles?: Candle[];
  higherTimeframeDecisionIndex?: number;
};

export function buildRealScenario(args: BuildRealScenarioArgs): Scenario {
  const { candles, visibleCount } = args;
  if (visibleCount <= 0 || visibleCount > candles.length) {
    throw new Error(
      `buildRealScenario(${args.id}): visibleCount ${visibleCount} out of range for ${candles.length} candles`
    );
  }
  const visibleCandles = candles.slice(0, visibleCount);
  const hiddenCandles = candles.slice(visibleCount);
  return {
    id: args.id,
    title: args.title,
    symbol: args.symbol,
    timeframe: args.timeframe,
    difficulty: args.difficulty,
    setupType: args.setupType,
    marketContext: args.marketContext,
    neutralScenarioNotes: args.neutralScenarioNotes,
    learningFocus: args.learningFocus,
    visibleCandles,
    hiddenCandles,
    decisionPointIndex: visibleCandles.length - 1,
    keyLevels: args.keyLevels,
    preferredDecision: args.preferredDecision,
    acceptableDecisions: args.acceptableDecisions,
    outcome: args.outcome,
    lessonRecommendation: args.lessonRecommendation,
    context: args.context,
    category: args.category,
    conceptTags: args.conceptTags,
    idealDecision: args.idealDecision,
    managementPoints: args.managementPoints,
    idealDecisionPlan: args.idealDecisionPlan,
    higherTimeframe: args.higherTimeframe,
    higherTimeframeCandles: args.higherTimeframeCandles,
    higherTimeframeDecisionIndex: args.higherTimeframeDecisionIndex,
    dataSource: "real",
  };
}
