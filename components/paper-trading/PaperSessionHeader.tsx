"use client";

// v5.0 — Top-of-page header for an active paper-trading session. Adapts
// /portfolio's header layout: account size + PnL + open-risk on the right,
// connection status + symbol label on the left, "End session" tucked at the
// far right. No "+1 candle" controls (live mode auto-advances).

import { totalRiskPercent, totalSessionPnl } from "@/lib/portfolio";
import type { PortfolioSession } from "@/lib/types";
import type { LiveStatus } from "@/lib/use-live-polling";
import LiveDataStatus from "./LiveDataStatus";

type Props = {
  session: PortfolioSession;
  status: LiveStatus;
  lastTickAt: number | null;
  lastErrorMessage: string | null;
  retryInMs: number | null;
  // v5.8.2 — active symbol for the subtitle, so a multi-symbol session
  // reflects which pair you're actually looking at rather than always
  // showing symbols[0].
  activeSymbol?: string;
  onEnd: () => void;
};

export default function PaperSessionHeader({
  session,
  status,
  lastTickAt,
  lastErrorMessage,
  retryInMs,
  activeSymbol,
  onEnd,
}: Props) {
  const total = totalSessionPnl(session);
  const openRisk = totalRiskPercent(session, true);
  const symbolCount = session.symbols.length;
  const symbolName =
    activeSymbol ?? session.symbols[0]?.symbol ?? "—";
  const isEnded = session.status === "ended";

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">Live Paper Trading</h1>
          {!isEnded && (
            <LiveDataStatus
              status={status}
              lastTickAt={lastTickAt}
              lastErrorMessage={lastErrorMessage}
              retryInMs={retryInMs}
            />
          )}
        </div>
        <p className="text-muted text-sm mt-0.5">
          {symbolName}
          {symbolCount > 1 && (
            <span className="text-muted/70"> +{symbolCount - 1} more</span>
          )}{" "}
          · real Coinbase prices · paper money, real lessons
        </p>
      </div>
      <div className="flex items-baseline gap-4 text-right">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Account</div>
          <div className="font-mono text-lg">
            ${session.accountSize.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-muted">
            ≈ ${(session.accountSize * (1 + total / 100)).toLocaleString(
              undefined,
              { maximumFractionDigits: 0 }
            )} now
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">PnL</div>
          <div
            className={`font-mono text-lg ${
              total >= 0 ? "text-good" : "text-bad"
            }`}
          >
            {total >= 0 ? "+" : ""}
            {total.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Open risk</div>
          <div className="font-mono text-lg">{openRisk.toFixed(1)}%</div>
        </div>
        {!isEnded && (
          <button
            type="button"
            onClick={onEnd}
            className="self-end bg-panel border border-line px-3 py-1.5 rounded-md text-xs font-semibold text-muted hover:text-text"
          >
            End session
          </button>
        )}
      </div>
    </header>
  );
}
