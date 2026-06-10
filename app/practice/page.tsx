"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Chart, { PriceLine } from "@/components/Chart";
import IndicatorSubChart from "@/components/IndicatorSubChart";
import DecisionForm, { DecisionDraft } from "@/components/DecisionForm";
import GuidedDecisionForm from "@/components/GuidedDecisionForm";
import PreSubmitChecklist from "@/components/PreSubmitChecklist";
import ReviewPanel from "@/components/ReviewPanel";
import WhatIfSandbox from "@/components/WhatIfSandbox";
import OutcomePanel from "@/components/OutcomePanel";
import ReviewHeadline from "@/components/ReviewHeadline";
import Confetti from "@/components/animation/Confetti";
import BestDecisionCard from "@/components/BestDecisionCard";
import AIReviewCard from "@/components/AIReviewCard";
import AICoachChat from "@/components/AICoachChat";
import HTFChart from "@/components/HTFChart";
import WatchMeWalkthrough from "@/components/WatchMeWalkthrough";
import CooldownGuard, { hasLosingStreak } from "@/components/CooldownGuard";
import { critique as critiqueThesis } from "@/lib/thesis-critique";
import { mirrorScenario } from "@/lib/mirror";
import { macroContextForTime } from "@/lib/macro-context";
import PracticeFilters, { FilterState } from "@/components/PracticeFilters";
import StudyHints from "@/components/StudyHints";
import DrawingBar, { type DrawingMode } from "@/components/practice/DrawingBar";
import {
  ALL_SETUP_TYPES,
  SCENARIOS,
  SETUP_TYPE_LABELS,
  filterScenarios,
  getScenarioById,
  pickNextScenario,
  pickRandomScenario,
} from "@/lib/scenarios";
import { generateProceduralScenario } from "@/lib/procedural-scenarios";
import { CURRICULUM, DEFAULT_PASSING_SCORE } from "@/lib/curriculum";
import { findHTFDecisionIndex, htfBucketSize, htfFor, synthesizeHTF } from "@/lib/htf";
import { setupTypesForFocus } from "@/lib/learn";
import { scoreDecision } from "@/lib/scoring";
import { simulateOutcome, simulateOutcomeWithManagement } from "@/lib/outcome";
import ManagementPanel from "@/components/ManagementPanel";
import { refreshStreakBadges } from "@/components/StreakBadge";
import ForceMicroLesson from "@/components/ForceMicroLesson";
import { pickForcedLesson, WINDOW_SIZE } from "@/lib/teaching";
import type { LearnTerm } from "@/lib/learn";
import {
  attemptsForScenario,
  buildScenarioSnapshot,
  clearActiveDrill,
  generateId,
  getActiveDrill,
  getDefaultIndicators,
  getScenariosSeenAt,
  incrementDrillProgress,
  isBookmarked,
  isForceLessonsEnabled,
  isWatchMeDone,
  listAttempts,
  listBookmarks,
  markLessonReviewed,
  markLessonShown,
  markScenarioSeen,
  SCORING_VERSION,
  saveAttempt,
  setActiveDrill,
  toggleBookmark,
} from "@/lib/storage";
import { SKILL_BY_ID, type SkillId } from "@/lib/skills";
import { drillById, drillForSkill } from "@/lib/drills";
import SessionSummary from "@/components/SessionSummary";
// v3.3 — small one-purpose components extracted into components/practice/.
// Behaviour unchanged; this file is just less daunting to navigate now.
import ChartOverlayBar from "@/components/practice/ChartOverlayBar";
import RestraintNudge from "@/components/practice/RestraintNudge";
import MacroBriefCard from "@/components/practice/MacroBriefCard";
import CollapsibleNotes from "@/components/practice/CollapsibleNotes";
import MirrorToggle from "@/components/practice/MirrorToggle";
import ModeToggle from "@/components/practice/ModeToggle";
import ScenarioMeta from "@/components/practice/ScenarioMeta";
import DrillStatusBanner from "@/components/practice/DrillStatusBanner";
import CourseBanner from "@/components/practice/CourseBanner";
import ScenarioPath from "@/components/practice/ScenarioPath";
import { PracticeSkeleton } from "@/components/animation/Skeleton";
import Link from "next/link";
import {
  DEFAULT_INDICATOR_CONFIG,
  type Attempt,
  type Decision,
  type IndicatorConfig,
  type ManagementAction,
  type ManagementDecision,
  type PracticeMode,
  type Scenario,
  type SetupType,
} from "@/lib/types";

const SESSION_SUMMARY_THRESHOLD = 3;

type Result = { decision: Decision; attempt: Attempt };

// v2.0 — interim state while the user walks through trade-management points
// between submit and outcome reveal. Cleared once we have a Result.
type MgmtState = {
  decision: Decision;
  decisions: ManagementDecision[];
  pointIdx: number;
  remainingPct: number;
  workingStop: number;
};

const INITIAL_FILTERS: FilterState = {
  difficulty: "all",
  setupType: "all",
  symbol: "all",
  timeframe: "all",
  bookmarkedOnly: false,
};

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticeSkeleton />}>
      <PracticePageInner />
    </Suspense>
  );
}

function PracticePageInner() {
  const searchParams = useSearchParams();
  const [scenario, setScenario] = useState<Scenario>(() => SCENARIOS[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [mgmtState, setMgmtState] = useState<MgmtState | null>(null);
  // v2.1 Phase 4 — when a finalized attempt triggers a forced micro-lesson,
  // we stash the pending attempt here and show ForceMicroLesson instead of
  // the review. Got-it transitions to setResult({pending}).
  const [microLesson, setMicroLesson] = useState<{
    attempt: Attempt;
    decision: Decision;
    tag: import("@/lib/types").MistakeTag;
    term: LearnTerm;
    count: number;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [mode, setMode] = useState<PracticeMode>("challenge");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [paramsApplied, setParamsApplied] = useState(false);
  const [activeDrillId, setActiveDrillIdState] = useState<string | null>(null);
  const [sessionAttempts, setSessionAttempts] = useState<Attempt[]>([]);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  // Guided mode applies for the first 5 saved attempts. Users can opt out per-page-load.
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [guidedSkipped, setGuidedSkipped] = useState(false);
  // v2.3 — "Watch me" walkthrough state. Shown once, on the user's very first
  // Practice visit (zero saved attempts AND walkthrough not yet completed/skipped).
  // When active, the decision form is replaced with a narrated demo on a
  // forced scenario (tc-sol-2024-10).
  const [showWatchMe, setShowWatchMe] = useState(false);
  // v5.9.7 — cumulative decision the walkthrough is currently narrating. Drives
  // the live entry/stop/TP lines on the chart so the demo SHOWS each price, not
  // just describes it. Null when the walkthrough isn't active.
  const [walkthroughPreview, setWalkthroughPreview] =
    useState<Partial<Decision> | null>(null);
  // v2.4 — Cooldown after 3 consecutive sub-60 attempts in a session. Replaces
  // the decision form with a reflection prompt + 2-minute timer. Resets when
  // a non-losing attempt breaks the streak.
  const [cooldownActive, setCooldownActive] = useState(false);
  // Tracks the attempt count at which the current cooldown was acknowledged so
  // a fresh losing streak after dismissal can fire it again.
  const [cooldownAckAt, setCooldownAckAt] = useState<number>(-1);
  // v2.4 — Mirror-mode toggle. Display-only; flips chart vertically and inverts
  // support/resistance. Decision form is disabled while on so the chart's
  // structure can be read free of directional bias.
  const [mirrorOn, setMirrorOn] = useState(false);
  // v4.0.2 — chart-overlay toggles. Session-local: seeded from the persisted
  // default in Settings on mount; toggling here doesn't write back. The
  // distinction lets a user flip RSI on for one scenario without losing their
  // "EMA always on" default.
  const [overlays, setOverlays] = useState<IndicatorConfig>(DEFAULT_INDICATOR_CONFIG);
  // v5.2.0 — drawing tool state. Mode null = chart works normally; mode
  // "trendline" = next two clicks define a trendline. Refresh key signals
  // Chart to re-sync drawings after a clear-all from the bar.
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [drawingsRefreshKey, setDrawingsRefreshKey] = useState(0);
  // Derived scenario used for chart + key-level display only. Scoring,
  // form, and submission always use the original `scenario`.
  const chartScenario = useMemo(
    () => (mirrorOn ? mirrorScenario(scenario) : scenario),
    [mirrorOn, scenario]
  );

  // v4.0 — HTF panel is always shown. If the scenario was authored with HTF
  // data, use it. Otherwise synthesize HTF candles by downsampling LTF.
  // Mirror mode skips this entirely — flipping HTF on a synthesised series
  // would be doubly confusing.
  const htfView = useMemo(() => {
    if (mirrorOn) return null;
    // Authored path
    if (
      chartScenario.higherTimeframeCandles &&
      chartScenario.higherTimeframeCandles.length > 0
    ) {
      return {
        candles: chartScenario.higherTimeframeCandles,
        decisionIndex:
          chartScenario.higherTimeframeDecisionIndex ??
          chartScenario.higherTimeframeCandles.length - 1,
        timeframe: chartScenario.higherTimeframe ?? "HTF",
        synthesized: false,
      };
    }
    // Synthesised path. Combine visible + hidden so the HTF panel shows the
    // entire window; the user only ever sees the part up to decision time.
    const bucket = htfBucketSize(chartScenario.timeframe);
    if (bucket <= 1) return null;
    const ltfAll = [...chartScenario.visibleCandles, ...chartScenario.hiddenCandles];
    const synth = synthesizeHTF(ltfAll, bucket);
    if (synth.length === 0) return null;
    const decisionCandle =
      chartScenario.visibleCandles[chartScenario.visibleCandles.length - 1];
    const decisionIndex = decisionCandle
      ? findHTFDecisionIndex(synth, decisionCandle.time)
      : synth.length - 1;
    return {
      candles: synth,
      decisionIndex,
      timeframe: htfFor(chartScenario.timeframe) ?? "HTF",
      synthesized: true,
    };
  }, [mirrorOn, chartScenario]);
  useEffect(() => {
    const attempts = listAttempts();
    setTotalAttempts(attempts.length);
    if (attempts.length === 0 && !isWatchMeDone()) {
      setShowWatchMe(true);
      const target = getScenarioById("tc-sol-2024-10");
      if (target) setScenario(target);
    }
    // v3.0 — stamp the initial scenario so smart rotation sees it on Next.
    // Done after the watchMe branch so we stamp whichever scenario actually
    // ends up displayed.
    markScenarioSeen((getScenarioById("tc-sol-2024-10") && attempts.length === 0 && !isWatchMeDone()) ? "tc-sol-2024-10" : scenario.id);
    // v4.0.2 — seed chart overlays from the user's persisted default. Mirror
    // mode hides overlays anyway, but the state lives independently so a
    // mirror toggle on/off doesn't lose the user's selection.
    setOverlays(getDefaultIndicators());
  }, []);
  const useGuided = !guidedSkipped && totalAttempts + sessionAttempts.length < 5;

  // v2.4 — fire cooldown when 3 consecutive sub-60 attempts land within the
  // current session. Re-fires after acknowledgement only when *new* attempts
  // continue the streak past the ack point.
  useEffect(() => {
    if (cooldownActive) return;
    if (sessionAttempts.length <= cooldownAckAt + 3) return; // wait for new attempts since last ack
    if (hasLosingStreak(sessionAttempts)) {
      setCooldownActive(true);
    }
  }, [sessionAttempts, cooldownActive, cooldownAckAt]);

  // Apply ?focus / ?setupType / ?drill / ?skill once per navigation. Sets the setup-type
  // filter and tracks an active drill so progress and routing both work.
  useEffect(() => {
    if (paramsApplied) return;
    const focus = searchParams.get("focus");
    const setupParam = searchParams.get("setupType");
    const drillParam = searchParams.get("drill");
    const skillParam = searchParams.get("skill");
    const scenarioIdParam = searchParams.get("scenarioId");

    if (scenarioIdParam) {
      const target = getScenarioById(scenarioIdParam);
      if (target) {
        setScenario(target);
        setResult(null);
        setSaved(false);
      }
    }

    let nextSetup: SetupType | null = null;
    let nextDrillId: string | null = null;

    if (drillParam) {
      const drill = drillById(drillParam);
      if (drill) {
        nextDrillId = drill.id;
        const setups = drill.scenarioFilters.setupTypes;
        if (setups.length > 0) nextSetup = setups[0];
      }
    }
    if (!nextDrillId && skillParam) {
      const skill = SKILL_BY_ID[skillParam as SkillId];
      if (skill) {
        const drill = drillForSkill(skill.id);
        if (drill) {
          nextDrillId = drill.id;
          const setups = drill.scenarioFilters.setupTypes;
          if (setups.length > 0) nextSetup = setups[0];
        }
      }
    }
    if (!nextSetup && setupParam) {
      const normalized = setupParam.toLowerCase().replace(/[\s-]+/g, "_");
      const match = (ALL_SETUP_TYPES as readonly string[]).find((s) => s === normalized);
      if (match) nextSetup = match as SetupType;
    }
    if (!nextSetup && focus) {
      const setups = setupTypesForFocus(focus);
      if (setups.length > 0) nextSetup = setups[0];
    }
    if (nextSetup) {
      setFilters((f) => ({ ...f, setupType: nextSetup! }));
    }
    if (nextDrillId) {
      setActiveDrill(nextDrillId);
      setActiveDrillIdState(nextDrillId);
    } else {
      const existing = getActiveDrill();
      setActiveDrillIdState(existing?.drillId ?? null);
    }
    setParamsApplied(true);
  }, [searchParams, paramsApplied]);

  // Apply the standard filters first, then optionally restrict to bookmarks.
  // Bookmarked filter is recomputed on sessionAttempts.length change too, so
  // toggling a bookmark on the practice header re-flows the pool immediately.
  const pool = useMemo(() => {
    const base = filterScenarios(filters);
    if (!filters.bookmarkedOnly) return base;
    const bookmarks = new Set(listBookmarks());
    return base.filter((s) => bookmarks.has(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sessionAttempts.length]);

  // Keep the displayed scenario inside the filter pool. If the user narrows filters such that
  // the current scenario is no longer in the pool, jump to the first match — otherwise the
  // chart silently shows a scenario the filters reject.
  useEffect(() => {
    if (pool.length === 0) return;
    if (!pool.some((s) => s.id === scenario.id)) {
      setScenario(pool[0]);
      setResult(null);
      setMgmtState(null);
      setMicroLesson(null);
      setSaved(false);
    }
  }, [pool, scenario.id]);

  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];
    // v2.4 — read levels from chartScenario so mirror mode shows the flipped
    // support/resistance pair. Entry/stop/TP overlays still use the original
    // decision (form is disabled in mirror, so they only show post-submit or
    // during management — neither of which can run while mirror is on).
    for (const s of chartScenario.context.support) {
      lines.push({ price: s, color: "#22c55e", title: "support", lineStyle: "dotted" });
    }
    for (const r of chartScenario.context.resistance) {
      lines.push({ price: r, color: "#ef4444", title: "resistance", lineStyle: "dotted" });
    }
    // v5.9.7 — while the walkthrough is narrating, draw whatever it has filled
    // in so far. This is what turns "I'd set a stop at $138.50" into a red line
    // the learner can actually see sitting below the swing low.
    if (showWatchMe && walkthroughPreview) {
      const w = walkthroughPreview;
      if (w.entry != null) lines.push({ price: w.entry, color: "#4f8cff", title: "entry" });
      if (w.stopLoss != null) lines.push({ price: w.stopLoss, color: "#ef4444", title: "stop" });
      if (w.takeProfit != null) lines.push({ price: w.takeProfit, color: "#22c55e", title: "tp" });
      return lines;
    }
    // During management, draw entry/working-stop/TP so the user can see them
    // against the live candles.
    if (mgmtState) {
      const d = mgmtState.decision;
      if (d.entry != null) lines.push({ price: d.entry, color: "#4f8cff", title: "entry" });
      lines.push({ price: mgmtState.workingStop, color: "#ef4444", title: "stop" });
      if (d.takeProfit != null) lines.push({ price: d.takeProfit, color: "#22c55e", title: "tp" });
    } else if (result) {
      const d = result.decision;
      if (d.entry != null) lines.push({ price: d.entry, color: "#4f8cff", title: "entry" });
      if (d.stopLoss != null) lines.push({ price: d.stopLoss, color: "#ef4444", title: "stop" });
      if (d.takeProfit != null) lines.push({ price: d.takeProfit, color: "#22c55e", title: "tp" });
      if (result.attempt.outcome.estimatedLiquidationPrice != null) {
        lines.push({
          price: result.attempt.outcome.estimatedLiquidationPrice,
          color: "#f59e0b",
          title: "est. liq.",
          lineStyle: "dashed",
        });
      }
    }
    return lines;
  }, [chartScenario, scenario, result, mgmtState, showWatchMe, walkthroughPreview]);

  // Chart candle split. During management we reveal candles up to (and including)
  // the current managementPoint so the user can see what price did since entry.
  // v2.4 — uses chartScenario for the candle arrays so mirror mode renders the
  // flipped candles. Management points are stripped from the mirrored scenario
  // (mirrorScenario sets them to undefined) so the post-submit reveal still
  // works correctly when mirror is off and the user submits normally.
  const chartSplit = useMemo(() => {
    if (mgmtState) {
      const point = scenario.managementPoints?.[mgmtState.pointIdx];
      if (point) {
        const visLen = scenario.visibleCandles.length;
        const hiddenSliceEnd = point.candleIndex - visLen + 1;
        const visible = [
          ...scenario.visibleCandles,
          ...scenario.hiddenCandles.slice(0, Math.max(0, hiddenSliceEnd)),
        ];
        const hidden = scenario.hiddenCandles.slice(Math.max(0, hiddenSliceEnd));
        return { visible, hidden, revealHidden: false };
      }
    }
    return {
      visible: chartScenario.visibleCandles,
      hidden: chartScenario.hiddenCandles,
      revealHidden: result != null,
    };
  }, [chartScenario, scenario, mgmtState, result]);

  // v4.0.2 — what gets fed into the RSI/MACD sub-panels. Same candle range the
  // main chart is showing, so the warmup region (the first 14/26 candles where
  // the oscillator can't compute) lines up visually with the start of the
  // candlestick series.
  const indicatorCandles = useMemo(() => {
    return chartSplit.revealHidden
      ? [...chartSplit.visible, ...chartSplit.hidden]
      : chartSplit.visible;
  }, [chartSplit]);
  // v4.0.2 — overlays are hidden in mirror mode because the chart is flipped
  // vertically; an EMA plotted on a mirrored series would teach the wrong thing.
  // Same reasoning as the HTF hide in mirror mode.
  const effectiveOverlays: IndicatorConfig | undefined = mirrorOn ? undefined : overlays;

  function finalizeAttempt(decision: Decision, managementDecisions: ManagementDecision[]) {
    const hasMgmt = managementDecisions.length > 0;
    // v4.0.3 — pass overlays as indicatorState so the chart_tools scoring
    // category can read which indicators the student had on at submit.
    const score = scoreDecision(
      scenario,
      decision,
      hasMgmt ? managementDecisions : undefined,
      overlays
    );
    const outcome = hasMgmt
      ? simulateOutcomeWithManagement(scenario, decision, managementDecisions)
      : simulateOutcome(scenario, decision);
    const attempt: Attempt = {
      id: generateId(),
      createdAt: Date.now(),
      scenarioId: scenario.id,
      decision,
      score,
      outcome,
      scoringVersion: SCORING_VERSION,
      // v3.1 — freeze a minimal snapshot of the scenario into the attempt so
      // the review surface can re-render the chart even after the live
      // scenario is gone (procedural ones never live past page-load; authored
      // ones might change between versions).
      scenarioSnapshot: buildScenarioSnapshot(scenario),
      // v4.0.3 — snapshot which overlays were on at submit. Used by the AI
      // prompt's INDICATORS block and surfaces that explain the chart_tools
      // score.
      indicatorState: overlays,
      ...(hasMgmt ? { managementDecisions } : {}),
    };

    // v2.1 Phase 4 — if this attempt's tags trigger a forced micro-lesson, stash
    // it instead of immediately revealing the review. The user reads the
    // refresher, clicks "Got it", then sees the score.
    if (isForceLessonsEnabled()) {
      const forced = pickForcedLesson(attempt.score.tags, listAttempts());
      if (forced) {
        setMicroLesson({ attempt, decision, tag: forced.tag, term: forced.term, count: forced.count });
        setMgmtState(null);
        setSaved(false);
        return;
      }
    }

    setResult({ decision, attempt });
    setMgmtState(null);
    setSaved(false);
  }

  // v2.1 Phase 4 — micro-lesson dismissed; reveal the held-back review.
  function handleMicroLessonContinue() {
    if (!microLesson) return;
    markLessonShown(microLesson.term.id);
    setResult({ decision: microLesson.decision, attempt: microLesson.attempt });
    setMicroLesson(null);
  }

  // Opening the full lesson is treated as a review — counts as freshness so we
  // don't re-trigger the forced lesson on the next attempt.
  function handleMicroLessonOpenFull() {
    if (!microLesson) return;
    markLessonReviewed(microLesson.term.id);
    markLessonShown(microLesson.term.id);
    setResult({ decision: microLesson.decision, attempt: microLesson.attempt });
    setMicroLesson(null);
    // The <Link> navigation to /learn?term=X happens after this handler returns.
  }

  function handleSubmit(decision: Decision) {
    // v2.0 — if the scenario has management points AND the user took the
    // preferred direction, route through the management state machine. Skip
    // management for wait/counter-direction (nothing to manage).
    const hasMgmtPoints = (scenario.managementPoints?.length ?? 0) > 0;
    const tookPreferred =
      decision.direction !== "wait" &&
      decision.direction === scenario.context.bestDirection;
    if (hasMgmtPoints && tookPreferred && decision.entry != null && decision.stopLoss != null) {
      setMgmtState({
        decision,
        decisions: [],
        pointIdx: 0,
        remainingPct: 100,
        workingStop: decision.stopLoss,
      });
      setSaved(false);
      return;
    }
    finalizeAttempt(decision, []);
  }

  function handleManagementAction(action: ManagementAction) {
    if (!mgmtState) return;
    const point = scenario.managementPoints?.[mgmtState.pointIdx];
    if (!point) return;
    const visLen = scenario.visibleCandles.length;
    const candle = scenario.hiddenCandles[point.candleIndex - visLen];
    const fillPrice = candle?.close;

    let newStop = mgmtState.workingStop;
    let remaining = mgmtState.remainingPct;
    let fillPriceOut: number | undefined;
    if (action === "move_stop_be" && mgmtState.decision.entry != null) {
      newStop = mgmtState.decision.entry;
    } else if (action === "partial_50") {
      remaining = remaining * 0.5;
      fillPriceOut = fillPrice;
    } else if (action === "exit") {
      remaining = 0;
      fillPriceOut = fillPrice;
    }

    const newDecisions: ManagementDecision[] = [
      ...mgmtState.decisions,
      {
        candleIndex: point.candleIndex,
        action,
        newStop: action === "move_stop_be" ? newStop : undefined,
        remainingPct: remaining,
        fillPrice: fillPriceOut,
      },
    ];
    const totalPoints = scenario.managementPoints?.length ?? 0;
    const nextIdx = mgmtState.pointIdx + 1;
    const done = action === "exit" || nextIdx >= totalPoints || remaining === 0;
    if (done) {
      finalizeAttempt(mgmtState.decision, newDecisions);
      return;
    }
    setMgmtState({
      ...mgmtState,
      decisions: newDecisions,
      pointIdx: nextIdx,
      remainingPct: remaining,
      workingStop: newStop,
    });
  }

  function handleSaveToJournal() {
    if (!result) return;
    saveAttempt(result.attempt);
    if (activeDrillId) {
      incrementDrillProgress();
    }
    setSessionAttempts((prev) => [...prev, result.attempt]);
    setSaved(true);
    // v2.1 Phase 3 — kick the StreakBadge in the header to re-read state.
    // saveAttempt already wrote to localStorage; we just need to nudge the UI.
    refreshStreakBadges();
  }

  // v5.9.7 — relaunch the narrated walkthrough on demand (not just on the very
  // first visit). Forces the tuned scenario the copy is written against, clears
  // any in-progress result, and shows the walkthrough panel.
  function handleShowMeHow() {
    const target = getScenarioById("tc-sol-2024-10") ?? scenario;
    setScenario(target);
    setResult(null);
    setMgmtState(null);
    setMicroLesson(null);
    setSaved(false);
    setMirrorOn(false);
    setCooldownActive(false);
    setWalkthroughPreview(null);
    setShowWatchMe(true);
    markScenarioSeen(target.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // v5.10.0 — load a scenario by id from the guided path panel. Resolves the
  // id and reuses loadScenario so reset/rotation behave identically to Next.
  function handleSelectPathScenario(id: string) {
    const target = getScenarioById(id);
    if (!target) return;
    setShowWatchMe(false);
    setWalkthroughPreview(null);
    loadScenario(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadScenario(s: Scenario) {
    setScenario(s);
    setResult(null);
    setMgmtState(null);
    setMicroLesson(null);
    setSaved(false);
    // v3.0 — stamp the "seen at" map so smart rotation in pickNextScenario
    // can push this scenario to the back of the queue on the next press of
    // "Next." Stamped on EVERY load, not just on submit, so skipping past a
    // scenario also counts.
    markScenarioSeen(s.id);
  }

  // v3.0 — build a per-scenario "lastTouched" map for smart rotation. Cheap
  // to recompute per call; sessionAttempts trigger keeps it fresh after each
  // save without an extra effect.
  function buildPickerInputs() {
    const attemptedAt: Record<string, number> = {};
    for (const a of listAttempts()) {
      const existing = attemptedAt[a.scenarioId] ?? 0;
      if (a.createdAt > existing) attemptedAt[a.scenarioId] = a.createdAt;
    }
    return { seenAt: getScenariosSeenAt(), attemptedAt };
  }

  function handleRandom() {
    if (pool.length === 0) return;
    loadScenario(pickRandomScenario(scenario.id, pool));
  }

  function handleNext() {
    if (pool.length === 0) return;
    loadScenario(pickNextScenario(scenario.id, pool, buildPickerInputs()));
  }

  function handleRetry() {
    setResult(null);
    setMgmtState(null);
    setMicroLesson(null);
    setSaved(false);
  }

  // v3.0 — generate a fresh procedural scenario. Respects the active setup-type
  // filter when it's set to something the generator knows; otherwise random.
  function handleGenerate() {
    const setupType =
      filters.setupType !== "all" ? filters.setupType : undefined;
    const next = generateProceduralScenario({ setupType });
    loadScenario(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Title and setup-type label are answer clues — hide in Challenge mode before submit. */}
          {mode === "study" || result != null ? (
            <>
              <h1 className="text-2xl font-bold flex items-baseline gap-2 flex-wrap">
                {scenario.title}
                {scenario.dataSource === "procedural" && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-accent border border-accent/40 bg-accent/10 px-1.5 py-0.5 rounded-md">
                    ✦ Procedural
                  </span>
                )}
              </h1>
              <p className="text-muted text-sm">
                {scenario.symbol} · {scenario.timeframe} · {SETUP_TYPE_LABELS[scenario.setupType]} · {scenario.difficulty}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Scenario</h1>
              <p className="text-muted text-sm">
                {scenario.symbol} · {scenario.timeframe} · {scenario.difficulty}
              </p>
            </>
          )}
          <ScenarioMeta scenarioId={scenario.id} attemptsTrigger={sessionAttempts.length} />
        </div>

        <div className="flex items-end gap-3">
          {/* v5.9.7 — relaunch the narrated walkthrough anytime. Hidden while
              it's already running or mid-review so it doesn't fight the panel. */}
          {!showWatchMe && result == null && !mgmtState && (
            <button
              type="button"
              onClick={handleShowMeHow}
              title="Replay the guided walkthrough on a sample chart"
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-line bg-panel2 text-text px-3 py-1.5 rounded-md hover:border-accent/60 hover:text-accent transition-colors"
            >
              ▶ Show me how
            </button>
          )}
          <MirrorToggle on={mirrorOn} onChange={setMirrorOn} />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* v5.10.0 — guided scenario path: an easy→hard ladder with progress and
          a Continue button. Collapsed by default; sits above the filters so a
          beginner reaches for it before the random/next buttons. */}
      <ScenarioPath
        activeScenarioId={scenario.id}
        onSelect={handleSelectPathScenario}
        refreshTrigger={sessionAttempts.length}
      />

      <DrillStatusBanner
        drillId={activeDrillId}
        sessionTrigger={sessionAttempts.length}
        onClearDrill={() => setActiveDrillIdState(null)}
      />

      <CourseBanner
        courseId={searchParams.get("course")}
        phase={searchParams.get("phase")}
        stepId={searchParams.get("step")}
        scenarioId={scenario.id}
        sessionTrigger={sessionAttempts.length}
      />

      {!nudgeDismissed && (
        <RestraintNudge
          attempts={sessionAttempts}
          onDismiss={() => setNudgeDismissed(true)}
        />
      )}

      {sessionAttempts.length >= SESSION_SUMMARY_THRESHOLD && !summaryDismissed && (
        <SessionSummary
          attempts={sessionAttempts}
          onDismiss={() => setSummaryDismissed(true)}
        />
      )}

      <PracticeFilters
        state={filters}
        matchCount={pool.length}
        onChange={setFilters}
        onRandom={handleRandom}
        onNext={handleNext}
        onGenerate={handleGenerate}
        hideSetupType={totalAttempts + sessionAttempts.length < 10}
      />

      {/* v4.0.2 — toggleable indicator overlays. Hidden in mirror mode (the
          chart is flipped vertically; an EMA there would teach the wrong
          thing). Defaults seeded from Settings; toggling here is per-session. */}
      {!mirrorOn && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ChartOverlayBar value={overlays} onChange={setOverlays} />
          {/* v5.2.0 — Drawing tool (trendlines). Scope id = active scenario
              so drawings stick with that chart. Hidden in mirror mode for
              the same reason indicators are. */}
          <DrawingBar
            scopeId={`practice:${chartScenario.id}`}
            mode={drawingMode}
            onModeChange={setDrawingMode}
            refreshKey={drawingsRefreshKey}
            onRefresh={() => setDrawingsRefreshKey((v) => v + 1)}
          />
        </div>
      )}

      {/* v4.0 — HTF is now a first-class panel on every scenario. Authored HTF
          (when scenarios ship with higherTimeframeCandles) takes precedence;
          otherwise we synthesize one by downsampling the LTF candles. The
          synthesized variant shows a small "synthesized" hint so the user
          knows it's derived. Mirror mode hides HTF (it doesn't make sense
          to flip a downsample).
          Layout: at lg+ the HTF sits to the right (~1/3); below lg they
          stack with HTF first so beginners see the broader trend before
          zooming in. The lg:flex-row layout falls back to single-column
          on phones to protect the LTF chart. */}
      {htfView ? (
        <div className="flex flex-col-reverse lg:flex-row gap-3">
          <div className="w-full lg:w-2/3 min-w-0 rounded-md border border-line bg-panel p-2 space-y-2">
            <Chart
              visible={chartSplit.visible}
              hidden={chartSplit.hidden}
              revealHidden={chartSplit.revealHidden}
              priceLines={priceLines}
              overlays={effectiveOverlays}
              drawingScopeId={
                mirrorOn ? undefined : `practice:${chartScenario.id}`
              }
              drawingMode={mirrorOn ? null : drawingMode}
              drawingsRefreshKey={drawingsRefreshKey}
              onDrawingComplete={() => setDrawingMode(null)}
            />
            {effectiveOverlays?.rsi && (
              <IndicatorSubChart kind="rsi" candles={indicatorCandles} />
            )}
            {effectiveOverlays?.macd && (
              <IndicatorSubChart kind="macd" candles={indicatorCandles} />
            )}
          </div>
          <div className="w-full lg:w-1/3 min-w-0 rounded-md border border-line bg-panel p-2 space-y-1">
            <HTFChart
              candles={htfView.candles}
              decisionIndex={htfView.decisionIndex}
              timeframe={htfView.timeframe}
            />
            {htfView.synthesized && (
              <div className="text-[10px] text-muted italic px-1">
                Synthesised from {chartScenario.timeframe} candles — directional only, not fetched.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-line bg-panel p-2 space-y-2">
          <Chart
            visible={chartSplit.visible}
            hidden={chartSplit.hidden}
            revealHidden={chartSplit.revealHidden}
            priceLines={priceLines}
            overlays={effectiveOverlays}
            drawingScopeId={
              mirrorOn ? undefined : `practice:${chartScenario.id}`
            }
            drawingMode={mirrorOn ? null : drawingMode}
            drawingsRefreshKey={drawingsRefreshKey}
            onDrawingComplete={() => setDrawingMode(null)}
          />
          {effectiveOverlays?.rsi && (
            <IndicatorSubChart kind="rsi" candles={indicatorCandles} />
          )}
          {effectiveOverlays?.macd && (
            <IndicatorSubChart kind="macd" candles={indicatorCandles} />
          )}
        </div>
      )}

      {/* v2.4 — mirror mode banner. Sits below the chart so the toggle and
          context are visible without scrolling. The form is disabled while
          mirror is on; users toggle off to actually submit. */}
      {mirrorOn && (
        <div className="rounded-md border border-warn/40 bg-warn/5 p-3 flex items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-semibold text-warn">Mirror mode active.</span>{" "}
            <span className="text-text">The chart is flipped vertically — long looks like short and vice versa.</span>{" "}
            <span className="text-muted">
              Use this to read structure without your usual directional bias. Submission is disabled until you toggle it off.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMirrorOn(false)}
            className="shrink-0 text-xs font-semibold border border-line bg-panel px-3 py-1.5 rounded-md hover:bg-panel2"
          >
            Toggle off
          </button>
        </div>
      )}

      {/* v2.4 — macro context briefing, derived from the first visible candle's
          time. Grounds beginners in what was happening in the world at the time
          of the scenario, so a chart with "BTC ran from $42k to $49k" makes
          sense once you know ETFs got approved that week. Collapsible. */}
      <MacroBriefCard
        timeSec={scenario.visibleCandles[0]?.time ?? 0}
        scenarioId={scenario.id}
      />

      {/* Pre-submit: full notes. Post-submit: collapse to a single toggle so the eye
          goes to Review + Outcome, not back at the setup brief. */}
      {result == null ? (
        <>
          <div className="rounded-md border border-line bg-panel2 p-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Market facts</div>
            <p>{scenario.neutralScenarioNotes}</p>
          </div>
          {mode === "study" && <StudyHints scenario={scenario} />}
        </>
      ) : (
        <CollapsibleNotes
          title="Scenario notes"
          body={scenario.neutralScenarioNotes}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel border border-line rounded-md p-4">
          {mgmtState ? (
            <ManagementPanel
              scenario={scenario}
              decision={mgmtState.decision}
              decisions={mgmtState.decisions}
              pointIdx={mgmtState.pointIdx}
              remainingPct={mgmtState.remainingPct}
              workingStop={mgmtState.workingStop}
              onAction={handleManagementAction}
            />
          ) : result != null ? (
            /* Audit fix #C2 — post-submit the full DecisionForm is dead weight
               (disabled, just re-shows what the user typed). Replace with a
               compact summary card; the review panel on the right is what the
               user is actually reading. */
            <DecisionSummaryCard decision={result.decision} />
          ) : cooldownActive ? (
            /* v2.4 — cooldown after 3 consecutive sub-60 attempts. Forces a
               reflection or 2-minute wait before the next attempt unlocks. */
            <CooldownGuard
              sessionAttempts={sessionAttempts}
              active={cooldownActive}
              onAcknowledge={() => {
                setCooldownActive(false);
                setCooldownAckAt(sessionAttempts.length);
              }}
            />
          ) : showWatchMe ? (
            /* v2.3 — first-attempt walkthrough. Replaces the decision form
               entirely. On submit it pipes a pre-built Decision through the
               normal handleSubmit path so scoring/review/save work normally. */
            <WatchMeWalkthrough
              scenario={scenario}
              onPreviewChange={setWalkthroughPreview}
              onSubmit={(d) => {
                setShowWatchMe(false);
                setWalkthroughPreview(null);
                handleSubmit(d);
              }}
              onSkip={() => {
                setShowWatchMe(false);
                setWalkthroughPreview(null);
              }}
            />
          ) : mirrorOn ? (
            /* v2.4 — mirror mode disables the form. The user reads the flipped
               chart to break directional bias, toggles off, then submits on
               the original chart. */
            <div className="space-y-3 text-sm text-muted">
              <h2 className="text-lg font-semibold text-text">Mirror mode</h2>
              <p className="leading-relaxed">
                The chart on the left is flipped vertically. Read it like you would the original — name the trend, find
                support and resistance, decide where you'd enter. The structure is the same; only your bias is being
                tested.
              </p>
              <p className="leading-relaxed">
                When you're ready to take the trade, toggle mirror off and decide on the original chart.
              </p>
              <button
                type="button"
                onClick={() => setMirrorOn(false)}
                className="text-xs font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
              >
                Toggle mirror off →
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-3">Your decision</h2>
              {useGuided && microLesson == null ? (
                <GuidedDecisionForm
                  key={scenario.id + "-guided"}
                  scenario={scenario}
                  onSubmit={handleSubmit}
                  onDraftChange={setDraft}
                  disabled={microLesson != null}
                  onSkipToFull={() => setGuidedSkipped(true)}
                />
              ) : (
                <DecisionForm
                  key={scenario.id + (microLesson ? "-lesson" : "-draft")}
                  scenario={scenario}
                  onSubmit={handleSubmit}
                  onDraftChange={setDraft}
                  disabled={microLesson != null}
                />
              )}
            </>
          )}
        </div>

        <div className="bg-panel border border-line rounded-md p-4 min-h-[200px]">
          {mgmtState ? (
            <div className="text-sm text-muted space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted">Trade in progress</div>
              <p>
                You've entered the trade. Now you'll be asked to manage it at each key moment as price plays out. The final score covers both your entry decision <em>and</em> how you managed it.
              </p>
              <p className="text-xs">
                Look at the chart: the candles to the right of your entry are now visible up to the current decision point. Working stop is shown as the red line; entry blue, TP green.
              </p>
            </div>
          ) : microLesson ? (
            /* v2.1 Phase 4 — repeated mistake refresher held in front of the
               score until the user clicks Got it. */
            <ForceMicroLesson
              tag={microLesson.tag}
              term={microLesson.term}
              count={microLesson.count}
              windowSize={WINDOW_SIZE}
              onContinue={handleMicroLessonContinue}
              onOpenLesson={handleMicroLessonOpenFull}
            />
          ) : result == null ? (
            <PreSubmitChecklist draft={draft} />
          ) : (
            <div className="space-y-4 stagger animate-fade-in">
              {/* v5.11.0 — confetti when the attempt clears (>=70%). Same
                  threshold the scenario-path uses, so what looks like
                  "celebrate" matches what the path counts as "cleared". The
                  Confetti component is self-contained, viewport-fixed,
                  pointer-events-none, and respects reduced-motion. */}
              <Confetti
                fire={result.attempt.score.max > 0 &&
                  result.attempt.score.total / result.attempt.score.max >= 0.7}
              />

              {/* v2.1 Phase 1 — headline first, breakdown collapsed by default.
                  Headline is the only thing the user has to read; everything
                  else is one click away. */}
              <ReviewHeadline score={result.attempt.score} />

              {/* v5.10.0 — "What actually happened" promoted out of the
                  collapsed breakdown to always-visible. The reveal of how the
                  chart actually played out is the single best teaching moment;
                  burying it behind a disclosure meant most users never saw it.
                  v5.11.0 — animate-rise picks up the .stagger delay from the
                  parent so it slides in slightly after the headline. */}
              <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-1.5 animate-rise">
                <div className="text-xs uppercase tracking-wide text-accent font-semibold">
                  What actually happened
                </div>
                <p className="text-sm text-text">{scenario.outcome.description}</p>
                <p className="text-xs text-muted leading-snug">
                  {scenario.outcome.takeaway}
                </p>
              </div>

              {/* v2.2 — worked example: what a strong decision looked like on
                  this exact scenario. Sits above the breakdown so the user
                  sees the model trade immediately, before any disclosure. */}
              {scenario.idealDecisionPlan && (
                <BestDecisionCard plan={scenario.idealDecisionPlan} />
              )}

              {/* v2.5 — AI-generated personalised review + follow-up chat.
                  Both render only when AI features are enabled + consent
                  granted (otherwise they self-hide). The review streams in
                  on submit; the chat is collapsible below it. */}
              <AIReviewCard attempt={result.attempt} scenario={scenario} />
              <AICoachChat attempt={result.attempt} scenario={scenario} />

              <details className="group rounded-md border border-line bg-panel2">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs uppercase tracking-wide text-muted hover:bg-panel flex items-center justify-between">
                  <span>See full breakdown</span>
                  <span className="group-open:rotate-180 transition-transform" aria-hidden>▾</span>
                </summary>
                <div className="border-t border-line p-3 space-y-4 bg-panel">
                  <ReviewPanel score={result.attempt.score} />
                  <WhatIfSandbox
                    scenario={scenario}
                    decision={result.decision}
                    originalScore={result.attempt.score}
                  />
                  <OutcomePanel decision={result.decision} outcome={result.attempt.outcome} />
                </div>
              </details>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  onClick={handleSaveToJournal}
                  disabled={saved}
                  className="flex-1 bg-accent text-white font-semibold py-2 disabled:opacity-50"
                >
                  {saved ? "Saved ✓" : "Save to journal"}
                </button>
                <button
                  onClick={handleRetry}
                  className="flex-1 bg-panel2 border border-line py-2 hover:bg-panel"
                >
                  Try again
                </button>
                <button
                  onClick={handleNext}
                  disabled={pool.length === 0}
                  className="flex-1 bg-panel2 border border-line py-2 hover:bg-panel disabled:opacity-50"
                >
                  Next scenario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Audit fix #C2 — compact card shown in place of the disabled DecisionForm
// after submit. Surfaces what the user typed in 8 lines instead of 600px of
// disabled inputs.
function DecisionSummaryCard({ decision }: { decision: Decision }) {
  const fmt = (n: number | undefined) =>
    n == null ? "—" : n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(2);
  const rr =
    decision.entry != null && decision.stopLoss != null && decision.takeProfit != null
      ? (() => {
          const risk = Math.abs(decision.entry - decision.stopLoss);
          const reward = Math.abs(decision.takeProfit - decision.entry);
          return risk > 0 ? (reward / risk).toFixed(2) : "—";
        })()
      : "—";
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-wide text-muted">Your decision</h2>
        <span
          className={`text-xs font-mono font-semibold uppercase ${
            decision.direction === "long"
              ? "text-good"
              : decision.direction === "short"
              ? "text-bad"
              : "text-muted"
          }`}
        >
          {decision.direction}
        </span>
      </div>
      {decision.direction !== "wait" ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted">Entry</dt>
            <dd className="font-mono">${fmt(decision.entry)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Stop</dt>
            <dd className="font-mono">${fmt(decision.stopLoss)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">TP</dt>
            <dd className="font-mono">${fmt(decision.takeProfit)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">R:R</dt>
            <dd className="font-mono">{rr}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Leverage</dt>
            <dd className="font-mono">{decision.leverage != null ? `${decision.leverage}×` : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Risk %</dt>
            <dd className="font-mono">{decision.riskPercent != null ? `${decision.riskPercent}%` : "—"}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-xs text-muted">You sat this one out.</p>
      )}
      {decision.thesis && (
        <div className="text-xs">
          <div className="text-muted mb-0.5">Thesis</div>
          <p className="text-text leading-snug">{decision.thesis}</p>
        </div>
      )}
      {decision.invalidation && (
        <div className="text-xs">
          <div className="text-muted mb-0.5">Invalidation</div>
          <p className="text-text leading-snug">{decision.invalidation}</p>
        </div>
      )}
      <ThesisCritiqueCard
        thesis={decision.thesis ?? ""}
        invalidation={decision.invalidation ?? ""}
      />
    </div>
  );
}

// v2.4 — structural critique of the user's free-text thesis + invalidation.
// Lives next to their decision summary so the feedback is right where the
// writing happened. No LLM, just keyword + numeric checks via lib/thesis-critique.
function ThesisCritiqueCard({
  thesis,
  invalidation,
}: {
  thesis: string;
  invalidation: string;
}) {
  if (thesis.trim().length < 20 && invalidation.trim().length < 20) return null;
  const result = critiqueThesis(thesis, invalidation);
  if (result.solid) {
    return (
      <div className="rounded-md border border-good/30 bg-good/5 p-2 text-[11px] text-good">
        ✓ Thesis and invalidation both name a level or structure. That's the standard.
      </div>
    );
  }
  if (result.gaps.length === 0) return null;
  return (
    <div className="rounded-md border border-warn/30 bg-warn/5 p-2 text-[11px] space-y-1">
      <div className="text-warn font-semibold uppercase tracking-wider text-[10px]">
        Thesis check
      </div>
      <ul className="space-y-1 leading-snug">
        {result.gaps.map((g, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="shrink-0 text-warn">
              {g.severity === "warn" ? "!" : "·"}
            </span>
            <span className="text-text">
              <span className="text-muted">{g.field}:</span> {g.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// v3.3 — MirrorToggle and ModeToggle moved to components/practice/.
