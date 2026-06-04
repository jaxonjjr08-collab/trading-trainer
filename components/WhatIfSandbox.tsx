"use client";

// v2.9 — "What if?" sandbox on the review surface. Lets the user nudge stop /
// take-profit / leverage / risk % on the decision they just submitted and see
// the score recompute live, with per-category deltas.
//
// Pure read of scoreDecision — no state is persisted; the original Attempt
// stays untouched. Renders nothing if direction is "wait" (no fields to nudge).

import { useMemo, useState } from "react";
import { scoreDecision } from "@/lib/scoring";
import type { Decision, Scenario, Score } from "@/lib/types";

type Props = {
  scenario: Scenario;
  decision: Decision;
  originalScore: Score;
};

type Tweak = {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  riskPercent: number;
};

export default function WhatIfSandbox({ scenario, decision, originalScore }: Props) {
  // Hide on wait — there are no numeric fields to nudge and the score is
  // already a special case.
  if (decision.direction === "wait") return null;
  if (
    decision.entry == null ||
    decision.stopLoss == null ||
    decision.takeProfit == null ||
    decision.leverage == null ||
    decision.riskPercent == null
  ) {
    return null;
  }

  const initial: Tweak = {
    entry: decision.entry,
    stopLoss: decision.stopLoss,
    takeProfit: decision.takeProfit,
    leverage: decision.leverage,
    riskPercent: decision.riskPercent,
  };
  const [tweak, setTweak] = useState<Tweak>(initial);

  const tweakedScore = useMemo<Score>(() => {
    const next: Decision = {
      ...decision,
      entry: tweak.entry,
      stopLoss: tweak.stopLoss,
      takeProfit: tweak.takeProfit,
      leverage: tweak.leverage,
      riskPercent: tweak.riskPercent,
    };
    return scoreDecision(scenario, next);
  }, [scenario, decision, tweak]);

  const totalDelta = tweakedScore.total - originalScore.total;
  const changed =
    tweak.entry !== initial.entry ||
    tweak.stopLoss !== initial.stopLoss ||
    tweak.takeProfit !== initial.takeProfit ||
    tweak.leverage !== initial.leverage ||
    tweak.riskPercent !== initial.riskPercent;

  // Map original category points by id so we can compute deltas cheaply.
  const originalById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of originalScore.breakdown) m[b.id] = b.points;
    return m;
  }, [originalScore]);

  function reset() {
    setTweak(initial);
  }

  // Sensible step sizes — entry/stop/TP scale with the asset price magnitude.
  const priceStep = decision.entry >= 1000 ? 50 : decision.entry >= 100 ? 5 : 1;

  return (
    <div className="rounded-md border border-accent/40 bg-accent/5 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent">What if?</div>
          <p className="text-xs text-muted mt-0.5 leading-snug max-w-2xl">
            Nudge any field. The score recomputes against the same scenario — your saved attempt isn't touched.
          </p>
        </div>
        {changed && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted hover:text-text underline shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <TweakField
            label="Entry"
            value={tweak.entry}
            step={priceStep}
            onChange={(v) => setTweak((t) => ({ ...t, entry: v }))}
            originalValue={initial.entry}
            format={fmtPrice}
          />
          <TweakField
            label="Stop loss"
            value={tweak.stopLoss}
            step={priceStep}
            onChange={(v) => setTweak((t) => ({ ...t, stopLoss: v }))}
            originalValue={initial.stopLoss}
            format={fmtPrice}
          />
          <TweakField
            label="Take profit"
            value={tweak.takeProfit}
            step={priceStep}
            onChange={(v) => setTweak((t) => ({ ...t, takeProfit: v }))}
            originalValue={initial.takeProfit}
            format={fmtPrice}
          />
          <TweakField
            label="Leverage"
            value={tweak.leverage}
            step={1}
            min={1}
            max={125}
            onChange={(v) => setTweak((t) => ({ ...t, leverage: v }))}
            originalValue={initial.leverage}
            format={(v) => `${v}×`}
          />
          <TweakField
            label="Risk %"
            value={tweak.riskPercent}
            step={0.1}
            min={0.1}
            max={10}
            onChange={(v) => setTweak((t) => ({ ...t, riskPercent: v }))}
            originalValue={initial.riskPercent}
            format={(v) => `${v}%`}
          />
        </div>

        <div className="space-y-2">
          <div className="rounded-md border border-line bg-panel p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[10px] uppercase tracking-wider text-muted">
                Tweaked score
              </div>
              <div className="text-[10px] text-muted">
                was{" "}
                <span className="font-mono text-text">{originalScore.total}</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className={`text-3xl font-bold font-mono tab-nums ${scoreColor(tweakedScore.total)}`}
              >
                {tweakedScore.total}
              </span>
              <span className="text-sm text-muted">/{tweakedScore.max}</span>
              {totalDelta !== 0 && (
                <span
                  className={`text-sm font-mono font-semibold ${
                    totalDelta > 0 ? "text-good" : "text-bad"
                  }`}
                >
                  {totalDelta > 0 ? "+" : ""}
                  {totalDelta}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-line bg-panel p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
              Category deltas
            </div>
            {tweakedScore.breakdown.map((b) => {
              const orig = originalById[b.id];
              const delta = orig != null ? b.points - orig : null;
              const pct = b.points / b.max;
              return (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <div className="w-28 shrink-0 text-muted truncate">{b.label}</div>
                  <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct >= 0.8 ? "bg-good" : pct >= 0.5 ? "bg-warn" : "bg-bad"}`}
                      style={{ width: `${Math.max(0, pct) * 100}%` }}
                    />
                  </div>
                  <div className="w-9 text-right font-mono tab-nums">
                    {b.points}/{b.max}
                  </div>
                  {delta != null && delta !== 0 && (
                    <div
                      className={`w-8 text-right text-[10px] font-mono ${
                        delta > 0 ? "text-good" : "text-bad"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TweakField({
  label,
  value,
  step,
  min,
  max,
  onChange,
  originalValue,
  format,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  originalValue: number;
  format: (n: number) => string;
}) {
  const changed = value !== originalValue;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-24 text-xs ${changed ? "text-accent font-semibold" : "text-muted"}`}>
        {label}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            const next = +(value - step).toFixed(4);
            if (min != null && next < min) return;
            onChange(next);
          }}
          className="w-7 h-7 rounded-md border border-line bg-panel hover:bg-panel2 text-muted hover:text-text"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-24 bg-panel border border-line text-text text-xs px-2 py-1 rounded-md font-mono tab-nums"
        />
        <button
          type="button"
          onClick={() => {
            const next = +(value + step).toFixed(4);
            if (max != null && next > max) return;
            onChange(next);
          }}
          className="w-7 h-7 rounded-md border border-line bg-panel hover:bg-panel2 text-muted hover:text-text"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
      <div className="text-[10px] text-muted ml-auto">
        was <span className="font-mono">{format(originalValue)}</span>
      </div>
    </div>
  );
}

function scoreColor(total: number): string {
  if (total >= 80) return "text-good";
  if (total >= 60) return "text-warn";
  return "text-bad";
}

function fmtPrice(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
