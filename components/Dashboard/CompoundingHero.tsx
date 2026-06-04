"use client";

// v2.6 — Compounding hero. The equity curve, promoted out of the buried
// Performance tab onto the Dashboard as a visual anchor. Borderless — just
// the curve with a big headline number above it.

import type { Attempt } from "@/lib/types";
import { simulateEquityCurve, DEFAULT_STARTING_EQUITY } from "@/lib/equity";
import EquityCurve from "../EquityCurve";

type Props = {
  attempts: Attempt[];
};

function fmtUsd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function CompoundingHero({ attempts }: Props) {
  if (attempts.length < 3) {
    return (
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Simulated equity</h2>
          <span className="text-xs text-muted">Unlocks at 3 attempts</span>
        </div>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          Once you've saved three attempts, this slot fills with a live equity curve — what your account would look like
          if you'd risked the percentage you said on each trade.
        </p>
      </section>
    );
  }
  const summary = simulateEquityCurve(attempts);
  const delta = ((summary.current - summary.starting) / summary.starting) * 100;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Simulated equity</h2>
        <div className="text-xs text-muted">
          {summary.tradeCount} trade{summary.tradeCount === 1 ? "" : "s"} · started{" "}
          <span className="tab-nums">{fmtUsd(DEFAULT_STARTING_EQUITY)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div className="text-4xl font-bold tab-nums">{fmtUsd(summary.current)}</div>
        <div
          className={`text-base font-mono font-semibold ${
            delta >= 0 ? "text-good" : "text-bad"
          }`}
        >
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
        </div>
        <div className="text-xs text-muted ml-auto">
          peak <span className="tab-nums text-text">{fmtUsd(summary.peak)}</span> · max DD{" "}
          <span className="tab-nums text-bad">−{summary.maxDrawdownPct.toFixed(1)}%</span>
        </div>
      </div>
      <EquityCurve summary={summary} variant="hero" />
      <p className="text-[11px] text-muted leading-snug">
        Compounding your stated risk % on each saved attempt. Decision quality only — fees, funding, and slippage are
        not modeled.
      </p>
    </section>
  );
}
