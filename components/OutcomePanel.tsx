import type { Decision, Outcome } from "@/lib/types";

type Props = { decision: Decision; outcome: Outcome };

const HIT_LABEL: Record<Outcome["hit"], string> = {
  tp: "Take profit hit",
  sl: "Stop loss hit",
  liq: "Liquidated",
  neither: "No trade taken",
};

export default function OutcomePanel({ decision, outcome }: Props) {
  if (decision.direction === "wait") {
    return (
      <div className="rounded-md border border-line bg-panel2 p-4">
        <div className="text-sm font-semibold mb-1">No position taken</div>
        <div className="text-xs text-muted">
          You chose to wait. Future candles are revealed on the chart so you can see what would have happened — but
          your decision is scored on what was reasonable given the information available at submit time.
        </div>
      </div>
    );
  }

  // Non-wait with missing required fields → can't simulate.
  if (decision.entry == null || decision.stopLoss == null || decision.takeProfit == null) {
    return (
      <div className="rounded-md border border-warn/40 bg-warn/5 p-4 space-y-2">
        <div className="text-sm font-semibold text-warn">Trade couldn't be simulated</div>
        <div className="text-xs text-muted">
          Entry, stop, and target are all required to play the trade forward against future candles. The decision
          review above still scores what you did submit — and missing pieces are flagged there.
        </div>
        <ul className="text-xs text-muted list-disc pl-4">
          {decision.entry == null && <li>No entry price</li>}
          {decision.stopLoss == null && <li>No stop loss</li>}
          {decision.takeProfit == null && <li>No take profit</li>}
        </ul>
      </div>
    );
  }

  const pnl = outcome.pnlPercent;
  const pnlColor =
    outcome.liquidated || pnl < 0 ? "text-bad" : pnl > 0 ? "text-good" : "text-muted";

  return (
    <div className="rounded-md border border-line bg-panel2 p-4 space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Outcome</div>
          <div className="text-lg font-semibold">{HIT_LABEL[outcome.hit]}</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${pnlColor}`}>
            {pnl > 0 ? "+" : ""}
            {pnl.toFixed(2)}%
          </div>
          <div className="text-xs text-muted">on account</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Entry" value={decision.entry?.toLocaleString()} />
        <Row label="Exit" value={outcome.exitPrice.toLocaleString()} />
        <Row label="Stop loss" value={decision.stopLoss?.toLocaleString()} />
        <Row label="Take profit" value={decision.takeProfit?.toLocaleString()} />
        <Row label="Leverage" value={`${decision.leverage}×`} />
        <Row
          label="Est. liq. price"
          value={outcome.estimatedLiquidationPrice != null ? `~${outcome.estimatedLiquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
        />
      </div>

      {outcome.liquidated && (
        <div className="text-xs text-bad border border-bad/40 bg-bad/10 rounded-md p-2">
          Position was liquidated before the stop loss could be filled. This is what excessive leverage does to a trade
          that would otherwise have just hit your stop.
        </div>
      )}

      <div className="text-[11px] text-muted border-t border-line pt-2">
        PnL is shown to teach the relationship between sizing, leverage, and outcome. It does not affect your decision
        score — winning trades can be bad decisions and losing trades can be good decisions.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-1">
      <span className="text-muted">{label}</span>
      <span className="font-mono">{value ?? "—"}</span>
    </div>
  );
}
