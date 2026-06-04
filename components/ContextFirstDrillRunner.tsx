"use client";

// v4.1.3 — "Context first" drill. Deferred from v4.0; surfaces the
// HTF-before-LTF reflex as its own short reps loop. Each round:
//   1. Show the scenario's HTF chart for 5 seconds.
//   2. Hide it. Ask the user for the HTF trend (up / down / range).
//   3. Reveal HTF + LTF side-by-side, with the correct answer + a one-line
//      "what the HTF told you" note.
//
// Uses each scenario's authored HTF when present, otherwise synthesises one
// via the same downsample lib/htf already powers /practice with. Scenarios
// without enough data for either path are filtered out at module load.

import { useEffect, useMemo, useState } from "react";
import Chart from "./Chart";
import HTFChart from "./HTFChart";
import {
  findHTFDecisionIndex,
  htfBucketSize,
  htfFor,
  synthesizeHTF,
} from "@/lib/htf";
import { SCENARIOS } from "@/lib/scenarios";
import type { Candle, Scenario, TrendKind } from "@/lib/types";

const REVEAL_SECONDS = 5;
const ROUNDS = 10;

type Phase = "reveal" | "answer" | "result" | "done";

type RoundView = {
  scenario: Scenario;
  htfCandles: Candle[];
  htfDecisionIndex: number;
  htfTimeframe: string;
  synthesized: boolean;
};

function buildRoundView(scenario: Scenario): RoundView | null {
  if (
    scenario.higherTimeframeCandles &&
    scenario.higherTimeframeCandles.length > 4
  ) {
    return {
      scenario,
      htfCandles: scenario.higherTimeframeCandles,
      htfDecisionIndex:
        scenario.higherTimeframeDecisionIndex ??
        scenario.higherTimeframeCandles.length - 1,
      htfTimeframe: scenario.higherTimeframe ?? "HTF",
      synthesized: false,
    };
  }
  const bucket = htfBucketSize(scenario.timeframe);
  if (bucket <= 1) return null;
  const all = [...scenario.visibleCandles, ...scenario.hiddenCandles];
  const synth = synthesizeHTF(all, bucket);
  if (synth.length < 5) return null;
  const decisionCandle =
    scenario.visibleCandles[scenario.visibleCandles.length - 1];
  const decisionIndex = decisionCandle
    ? findHTFDecisionIndex(synth, decisionCandle.time)
    : synth.length - 1;
  return {
    scenario,
    htfCandles: synth,
    htfDecisionIndex: decisionIndex,
    htfTimeframe: htfFor(scenario.timeframe) ?? "HTF",
    synthesized: true,
  };
}

// All scenarios that can be drilled. Built once per module load. Excludes
// scenarios where the HTF is too short to read or the timeframe has no HTF
// step (e.g. daily, with no Coinbase-supported weekly).
const ELIGIBLE_ROUNDS: RoundView[] = SCENARIOS.map(buildRoundView).filter(
  (r): r is RoundView => r !== null
);

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const TREND_OPTIONS: { value: TrendKind; label: string }[] = [
  { value: "up", label: "Up — higher highs, higher lows" },
  { value: "down", label: "Down — lower highs, lower lows" },
  { value: "range", label: "Range — neither up nor down dominates" },
];

function trendLabel(t: TrendKind): string {
  return TREND_OPTIONS.find((o) => o.value === t)?.label.split(" —")[0] ?? t;
}

function explanationFor(scenario: Scenario): string {
  const t = scenario.context.trend;
  const base =
    t === "up"
      ? "On the HTF, higher highs and higher lows mean the dominant trend is up."
      : t === "down"
      ? "On the HTF, lower highs and lower lows mean the dominant trend is down."
      : "On the HTF, neither side is making progress — that's a range.";
  return `${base} The LTF read should align with that — counter-trend trades on the LTF are lower-probability when the HTF disagrees.`;
}

export default function ContextFirstDrillRunner() {
  const queue = useMemo(
    () => shuffled(ELIGIBLE_ROUNDS).slice(0, Math.min(ROUNDS, ELIGIBLE_ROUNDS.length)),
    []
  );
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("reveal");
  const [pick, setPick] = useState<TrendKind | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS);
  const [correct, setCorrect] = useState(0);

  const round = queue[idx];

  useEffect(() => {
    if (phase !== "reveal") return;
    setSecondsLeft(REVEAL_SECONDS);
    const start = Date.now();
    const handle = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, REVEAL_SECONDS - elapsed);
      setSecondsLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(handle);
        setPhase("answer");
      }
    }, 250);
    return () => clearInterval(handle);
  }, [phase, idx]);

  if (queue.length === 0) {
    return (
      <div className="rounded-md border border-line bg-panel p-6 text-sm text-muted">
        No scenarios available for the context-first drill yet — the eligible
        pool requires scenarios with usable HTF data.
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-md border border-accent/40 bg-accent/5 p-6 space-y-3">
        <div className="text-xs uppercase tracking-wide text-accent">
          Context-first complete
        </div>
        <div className="text-3xl font-bold">
          {correct} / {queue.length}
        </div>
        <p className="text-sm text-muted">
          {correct === queue.length
            ? "Perfect. Reading the HTF first is becoming a reflex."
            : correct >= queue.length * 0.7
            ? "Solid. Most reads matched the HTF trend — the habit is forming."
            : "Worth running again. The reflex builds with reps; the HTF read should land before the LTF chart is even open."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          Another set →
        </button>
      </div>
    );
  }

  function handlePick(t: TrendKind) {
    if (phase !== "answer") return;
    setPick(t);
    if (t === round.scenario.context.trend) setCorrect((c) => c + 1);
    setPhase("result");
  }

  function handleNext() {
    if (idx + 1 >= queue.length) {
      setPhase("done");
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("reveal");
  }

  return (
    <div className="rounded-md border border-line bg-panel p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            Context first · {idx + 1} of {queue.length}
          </div>
          <h2 className="text-base font-bold mt-0.5">
            Read the higher timeframe — what's the trend?
          </h2>
        </div>
        <div className="text-xs text-muted shrink-0">
          {correct} correct so far
        </div>
      </div>

      {phase === "reveal" && (
        <div className="space-y-2">
          <div className="rounded-md border border-line bg-panel2 p-2">
            <HTFChart
              candles={round.htfCandles}
              decisionIndex={round.htfDecisionIndex}
              timeframe={round.htfTimeframe}
            />
            {round.synthesized && (
              <div className="text-[10px] text-muted italic px-1 pt-1">
                Synthesised from {round.scenario.timeframe} candles — directional only.
              </div>
            )}
          </div>
          <div className="text-center text-sm">
            <span className="text-accent font-mono font-bold">
              {secondsLeft}s
            </span>{" "}
            <span className="text-muted">— read the HTF before the chart hides.</span>
          </div>
        </div>
      )}

      {phase === "answer" && (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-panel2 p-8 text-center">
            <div className="text-xs uppercase tracking-wider text-muted">
              HTF hidden
            </div>
            <p className="text-sm text-muted mt-1">
              Call the trend from what you just saw.
            </p>
          </div>
          <div className="space-y-2">
            {TREND_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePick(opt.value)}
                className="w-full text-left text-sm rounded-md border border-line bg-panel hover:bg-panel2 px-4 py-3"
              >
                {String.fromCharCode(65 + i)}. {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-md border border-line bg-panel2 p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted px-1 mb-1">
                HTF you read
              </div>
              <HTFChart
                candles={round.htfCandles}
                decisionIndex={round.htfDecisionIndex}
                timeframe={round.htfTimeframe}
              />
            </div>
            <div className="rounded-md border border-line bg-panel2 p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted px-1 mb-1">
                LTF ({round.scenario.timeframe}) — where the decision lives
              </div>
              <Chart
                visible={round.scenario.visibleCandles}
                hidden={round.scenario.hiddenCandles}
                height={180}
              />
            </div>
          </div>
          <div className="space-y-2">
            {TREND_OPTIONS.map((opt, i) => {
              const isCorrect = opt.value === round.scenario.context.trend;
              const isPicked = pick === opt.value;
              let cls = "w-full text-left text-sm rounded-md border px-4 py-3";
              if (isCorrect) cls += " border-good/60 bg-good/10 text-good";
              else if (isPicked) cls += " border-bad/60 bg-bad/10 text-bad";
              else cls += " border-line bg-panel2 text-muted";
              return (
                <div key={opt.value} className={cls}>
                  {String.fromCharCode(65 + i)}. {opt.label}
                </div>
              );
            })}
          </div>
          <div className="text-xs leading-snug p-3 rounded-md border border-line bg-panel">
            <span className="uppercase tracking-wider text-[10px] mr-2 font-semibold text-muted">
              {pick === round.scenario.context.trend
                ? "Right"
                : `The HTF read was ${trendLabel(round.scenario.context.trend)}`}
            </span>
            {explanationFor(round.scenario)}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="text-sm font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              {idx + 1 < queue.length ? "Next →" : "See result →"}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted">
        The reflex is HTF first, LTF second. Five seconds is enough — you don't
        need more to call a trend.
      </p>
    </div>
  );
}
