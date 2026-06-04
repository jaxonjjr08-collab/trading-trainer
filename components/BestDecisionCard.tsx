// v2.2 — "What a strong decision looked like" card shown above the score
// breakdown after submit. Mirrors the visual language of DecisionSummaryCard
// (inline in app/practice/page.tsx) so the user can compare their decision
// to the model side-by-side mentally.
//
// Hidden cleanly when the scenario lacks an idealDecisionPlan — graceful
// degradation during the per-scenario authoring backfill.

import type { IdealDecisionPlan } from "@/lib/types";

function fmt(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function computeRR(plan: IdealDecisionPlan): string {
  if (plan.entry == null || plan.stopLoss == null || plan.takeProfit == null) return "—";
  const risk = Math.abs(plan.entry - plan.stopLoss);
  const reward = Math.abs(plan.takeProfit - plan.entry);
  if (risk <= 0) return "—";
  return (reward / risk).toFixed(2);
}

export default function BestDecisionCard({ plan }: { plan: IdealDecisionPlan }) {
  const isWait = plan.direction === "wait";
  const directionClass =
    plan.direction === "long"
      ? "text-good"
      : plan.direction === "short"
      ? "text-bad"
      : "text-muted";

  return (
    <div className="rounded-md border-2 border-accent/40 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-accent">
            What a strong decision looked like
          </div>
          <p className="text-[11px] text-muted mt-0.5 leading-snug">
            One way to score ~95/100 on this scenario. Compare to your decision on the left.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono font-semibold uppercase bg-accent/20 text-accent border border-accent/40 px-2 py-0.5 rounded-md">
          ~95 / 100
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">Direction</span>
        <span className={`text-sm font-mono font-semibold uppercase ${directionClass}`}>
          {plan.direction}
        </span>
      </div>

      {!isWait && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted">Entry</dt>
            <dd className="font-mono">${fmt(plan.entry)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Stop</dt>
            <dd className="font-mono">${fmt(plan.stopLoss)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">TP</dt>
            <dd className="font-mono">${fmt(plan.takeProfit)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">R:R</dt>
            <dd className="font-mono">{computeRR(plan)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Leverage</dt>
            <dd className="font-mono">{plan.leverage != null ? `${plan.leverage}×` : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Risk %</dt>
            <dd className="font-mono">{plan.riskPercent != null ? `${plan.riskPercent}%` : "—"}</dd>
          </div>
        </dl>
      )}

      <div className="text-xs space-y-2 pt-1 border-t border-accent/20">
        <div>
          <div className="text-muted mb-0.5">Thesis</div>
          <p className="text-text leading-snug">{plan.thesis}</p>
        </div>
        {plan.invalidation && (
          <div>
            <div className="text-muted mb-0.5">Invalidation</div>
            <p className="text-text leading-snug">{plan.invalidation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
