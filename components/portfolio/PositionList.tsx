"use client";

// v4.1 — Open + closed positions list for the portfolio simulator. Shows
// per-position state, mark-to-market P&L for opens, realized P&L for closes,
// and a Close button for active positions.

import { positionMarkPnl } from "@/lib/portfolio";
import type { PortfolioPosition, PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
  onClose: (positionId: string) => void;
  onSelectSymbol?: (symbol: string) => void;
};

function statusLabel(p: PortfolioPosition): { label: string; tone: "good" | "bad" | "muted" } {
  switch (p.status) {
    case "open":
      return { label: "Open", tone: "muted" };
    case "closed_tp":
      return { label: "TP hit", tone: "good" };
    case "closed_sl":
      return { label: "Stopped", tone: "bad" };
    case "closed_manual":
      return { label: "Closed", tone: "muted" };
    case "closed_liq":
      return { label: "Liquidated", tone: "bad" };
  }
}

function fmtPnl(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export default function PositionList({ session, onClose, onSelectSymbol }: Props) {
  if (session.positions.length === 0) {
    return (
      <div className="rounded-md border border-line bg-panel2 p-3 text-xs text-muted">
        No positions yet. Open one from the form on the left.
      </div>
    );
  }
  const open = session.positions.filter((p) => p.status === "open");
  const closed = session.positions.filter((p) => p.status !== "open");

  return (
    <div className="space-y-3">
      {open.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted">Open ({open.length})</div>
          {open.map((p) => {
            const pnl = positionMarkPnl(session, p);
            return (
              <div
                key={p.id}
                className="rounded-md border border-line bg-panel p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectSymbol?.(p.symbol)}
                    className="font-semibold text-text hover:text-accent flex items-center gap-1"
                  >
                    {p.symbol}
                    {p.leverage != null && p.leverage > 1 && (
                      <span
                        className={`font-mono text-[10px] px-1 rounded ${
                          p.leverage >= 10
                            ? "bg-bad/20 text-bad"
                            : "bg-warn/20 text-warn"
                        }`}
                        title={`${p.leverage}× perpetual — liquidation at ${p.liquidationPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                      >
                        {p.leverage}×
                      </span>
                    )}
                  </button>
                  <span
                    className={`font-mono ${
                      pnl >= 0 ? "text-good" : "text-bad"
                    }`}
                    title="Mark-to-market P&L (funding cost included)"
                  >
                    {fmtPnl(pnl)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] text-muted">
                  <span>{p.direction.toUpperCase()}</span>
                  <span>R {p.riskPercent}%</span>
                  <span>SL {p.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  <span>TP {p.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                {p.leverage != null && p.leverage > 1 && (
                  <div className="mt-0.5 grid grid-cols-2 gap-1 font-mono text-[10px]">
                    <span className="text-bad">
                      Liq {p.liquidationPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted">
                      Funding {(p.fundingCostPct ?? 0).toFixed(3)}%
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onClose(p.id)}
                  className="mt-1.5 text-[10px] text-muted hover:text-text underline"
                >
                  Close at current price
                </button>
              </div>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Closed ({closed.length})
          </div>
          {closed.map((p) => {
            const status = statusLabel(p);
            const pnl = p.pnlPercent ?? 0;
            return (
              <div
                key={p.id}
                className="rounded-md border border-line bg-panel2 p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.symbol}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      status.tone === "good"
                        ? "text-good"
                        : status.tone === "bad"
                        ? "text-bad"
                        : "text-muted"
                    }`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] text-muted">
                    {p.direction.toUpperCase()} · R {p.riskPercent}%
                  </span>
                  <span
                    className={`font-mono ${
                      pnl >= 0 ? "text-good" : "text-bad"
                    }`}
                  >
                    {fmtPnl(pnl)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
