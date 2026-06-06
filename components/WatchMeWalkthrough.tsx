"use client";

// v2.3 — "Watch me" first-attempt walkthrough.
//
// Renders in place of the decision form on the user's very first visit to
// Practice (totalAttempts === 0 and !isWatchMeDone()). Walks through six
// narration steps, displaying the running form values as they fill in, and
// hands off to the parent's onSubmit on the final step with a pre-built
// Decision so the scoring + review flow is the same as a normal attempt.
//
// The Practice page forces the scenario to tc-sol-2024-10 while this is
// active because the walkthrough copy is hand-tuned to that chart's levels.

import { useEffect, useState } from "react";
import type { Decision, Scenario } from "@/lib/types";
import { markWatchMeDone } from "@/lib/storage";

type WalkthroughStep = {
  // Human-readable label shown at the top of the panel.
  title: string;
  // The narrated body — what an experienced trader is thinking at this step.
  body: string;
  // Subset of the decision the user has "filled in" by this point. Cumulative.
  fields?: Partial<Decision>;
  // Label for the primary action button at this step.
  cta: string;
};

const STEPS: WalkthroughStep[] = [
  {
    title: "Step 1 of 6 — Read the chart first",
    body:
      "Before I touch the form, I look at the chart. SOL ran from about $130 to a recent high near $156, then pulled back to $139. Each subsequent low has been higher than the last — $140, $141, $142. That's the textbook 'pullback inside an uptrend' setup, and the kind of structure I want to be long.",
    cta: "Next — pick direction",
  },
  {
    title: "Step 2 of 6 — Direction: long",
    body:
      "Trend is up, pullback held a higher low, recent candles bouncing. I'm going Long. Not because I want price to go up — because the structure says price is more likely to continue up than to break down from here.",
    fields: { direction: "long" },
    cta: "Next — choose entry",
  },
  {
    title: "Step 3 of 6 — Entry just above current",
    body:
      "Price is at $141. I'll enter at $141.50 — slightly above current, which means I'm waiting for one more confirming tick up before the order fires. Chasing the bottom of the wick is how beginners get stopped on noise; entering on confirmation gives the structure a chance to prove itself.",
    fields: { direction: "long", entry: 141.5 },
    cta: "Next — set the stop",
  },
  {
    title: "Step 4 of 6 — Stop below the swing low",
    body:
      "Stop goes at $138.50. The structural low of the pullback is $139, so I want to be just below it — not at $140 (the round number that everyone watches), and not at $139 exactly (where wicks hunt). $138.50 gives me ~$3 of room from entry and is below the place that proves my idea wrong.",
    fields: { direction: "long", entry: 141.5, stopLoss: 138.5 },
    cta: "Next — set the target",
  },
  {
    title: "Step 5 of 6 — Target before resistance",
    body:
      "Take profit at $155. The prior swing high is $156, and that level capped the last leg up. I want to be out before the obvious resistance, not at it. Risk is $3 ($141.50 to $138.50). Reward is $13.50. That's R:R 4.5 — comfortably above the 1.5–2.0 minimum I'd accept.",
    fields: { direction: "long", entry: 141.5, stopLoss: 138.5, takeProfit: 155 },
    cta: "Next — size the trade",
  },
  {
    title: "Step 6 of 6 — Leverage and risk %",
    body:
      "3× leverage and 1% account risk. The leverage controls how much buffer I have before liquidation; 3× keeps me well clear. The 1% controls how much money I lose if my stop hits. With a $1,000 practice account that's $10. Small enough that a string of losses doesn't blow me up, big enough that wins compound over time.",
    fields: {
      direction: "long",
      entry: 141.5,
      stopLoss: 138.5,
      takeProfit: 155,
      leverage: 3,
      riskPercent: 1,
    },
    cta: "Submit the demo trade →",
  },
];

const FINAL_DECISION: Decision = {
  direction: "long",
  entry: 141.5,
  stopLoss: 138.5,
  takeProfit: 155,
  leverage: 3,
  riskPercent: 1,
  accountSize: 1000,
  thesis:
    "Pullback to $140 inside an established SOL uptrend. Higher lows holding above the $139 swing low; recent candles confirm buyers stepping in. Entry on the confirmation tick keeps the structure behind me.",
  invalidation:
    "Close below $139 on the 6h breaks the higher-low pattern and invalidates the pullback thesis.",
};

export default function WatchMeWalkthrough({
  scenario,
  onSubmit,
  onSkip,
  onPreviewChange,
}: {
  scenario: Scenario;
  onSubmit: (d: Decision) => void;
  onSkip: () => void;
  // v5.9.7 — emits the cumulative decision so the Practice chart can draw the
  // entry/stop/TP lines live as each step is narrated. The whole point of the
  // walkthrough is "showing what to do" — the lines appearing on the chart at
  // the exact prices being described is what makes it land.
  onPreviewChange?: (fields: Partial<Decision>) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  // Push the current step's cumulative fields up to the chart whenever the
  // step changes (and on mount). Clears on unmount so stale lines don't linger.
  useEffect(() => {
    onPreviewChange?.(step.fields ?? {});
    return () => onPreviewChange?.({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  // Keyboard support: arrows + Esc to skip. Matches Tutorial.tsx UX.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") advance();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") handleSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  function advance() {
    if (isLast) {
      // Final step → submit the demo trade. Mark watch-me done so we don't
      // intercept the next visit.
      markWatchMeDone();
      onSubmit(FINAL_DECISION);
    } else {
      setStepIdx(stepIdx + 1);
    }
  }

  function back() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  function handleSkip() {
    markWatchMeDone();
    onSkip();
  }

  const progressPct = ((stepIdx + 1) / STEPS.length) * 100;
  const f = step.fields ?? {};

  return (
    <div className="rounded-md border-2 border-accent/40 bg-accent/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-accent">
            Watch-me walkthrough
          </div>
          <h2 className="text-lg font-bold mt-0.5">{step.title}</h2>
          <p className="text-[11px] text-muted mt-1">
            On rails — I fill the form, you read the reasoning. Watch the chart:
            the entry, stop, and target lines appear where I describe them. After
            this, you'll do the next one yourself.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="shrink-0 text-xs text-muted hover:text-text border border-line bg-panel px-3 py-1.5 rounded-md"
          title="Skip the walkthrough and try the form yourself"
        >
          Skip — I'll try myself
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < stepIdx
                ? "bg-accent"
                : i === stepIdx
                ? "bg-accent/70"
                : "bg-panel2 border border-line"
            }`}
          />
        ))}
      </div>

      {/* Narration */}
      <p className="text-sm text-text leading-relaxed">{step.body}</p>

      {/* Running form preview — shows the user what an experienced trader's
          decision looks like as it builds up, field by field. */}
      <div className="rounded-md border border-line bg-panel p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted">
          Decision so far
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
          <FieldRow label="Direction" value={fmtDirection(f.direction)} />
          <FieldRow label="Entry" value={f.entry != null ? `$${f.entry}` : "—"} />
          <FieldRow label="Stop" value={f.stopLoss != null ? `$${f.stopLoss}` : "—"} />
          <FieldRow label="TP" value={f.takeProfit != null ? `$${f.takeProfit}` : "—"} />
          <FieldRow label="Leverage" value={f.leverage != null ? `${f.leverage}×` : "—"} />
          <FieldRow label="Risk %" value={f.riskPercent != null ? `${f.riskPercent}%` : "—"} />
        </div>
        {/* Computed R:R, surfaced once stop + tp are set so the user sees
            the math come together. */}
        {f.entry != null && f.stopLoss != null && f.takeProfit != null && (
          <div className="text-[11px] text-accent pt-1 border-t border-line">
            R:R {computeRR(f.entry, f.stopLoss, f.takeProfit)} — reward per dollar of risk.
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={back}
          disabled={stepIdx === 0}
          className="text-sm border border-line bg-panel text-text px-4 py-2 rounded-md hover:bg-panel2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={advance}
          className="text-sm font-semibold bg-accent text-white px-5 py-2 rounded-md hover:opacity-90"
        >
          {step.cta}
        </button>
      </div>

      <p className="text-[10px] text-muted text-center">
        Scenario: <span className="font-mono text-text">{scenario.id}</span> · Press → to advance, ← to go back, Esc to skip.
      </p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  const filled = value !== "—";
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${filled ? "text-text" : "text-muted"}`}>{value}</span>
    </div>
  );
}

function fmtDirection(d: Decision["direction"] | undefined): string {
  if (!d) return "—";
  return d.toUpperCase();
}

function computeRR(entry: number, stop: number, tp: number): string {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(tp - entry);
  if (risk <= 0) return "—";
  return (reward / risk).toFixed(2);
}
