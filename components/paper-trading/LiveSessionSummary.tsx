"use client";

// v5.0 — End-of-session summary for a live paper-trading run. Lighter than
// the portfolio SessionSummary (no challenges, no portfolio_risk scoring).
// Just realized P&L + outcome breakdown + start-new-session.

import { realizedSessionPnl } from "@/lib/portfolio";
import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
  onStartNew: () => void;
};

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

export default function LiveSessionSummary({ session, onStartNew }: Props) {
  const realized = realizedSessionPnl(session);
  const tpHits = session.positions.filter((p) => p.status === "closed_tp").length;
  const slHits = session.positions.filter((p) => p.status === "closed_sl").length;
  const manual = session.positions.filter((p) => p.status === "closed_manual").length;
  // v5.3.0 — count liquidations as their own outcome bucket so a perp user
  // who blew up doesn't see their losses silently vanish from the trade
  // count. Win-rate denominator includes liquidations (every closed trade
  // counts); win-rate numerator stays "TP hits only" — a liquidation is
  // never a win.
  const liqHits = session.positions.filter((p) => p.status === "closed_liq").length;
  const totalTrades = tpHits + slHits + manual + liqHits;
  const winRate =
    totalTrades > 0
      ? Math.round((tpHits / totalTrades) * 100)
      : 0;

  const sessionDurationMs =
    (session.endedAt ?? Date.now()) - session.startedAt;
  const sessionHours = Math.max(1, Math.round(sessionDurationMs / 3_600_000));

  return (
    <div className="rounded-md border border-line bg-panel p-4 space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Session ended</h2>
        <p className="text-xs text-muted">
          Live Paper Trading isn't scored on decision quality (no
          "right answer" for a live market) — just realized P&amp;L and your
          outcome mix.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Realized P&amp;L
          </div>
          <div
            className={`font-mono text-base ${
              realized >= 0 ? "text-good" : "text-bad"
            }`}
          >
            {realized >= 0 ? "+" : ""}
            {realized.toFixed(2)}%
          </div>
        </div>
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Trades
          </div>
          <div className="font-mono text-base">{totalTrades}</div>
          <div className="text-[10px] font-mono text-muted">
            {tpHits} TP · {slHits} SL · {manual} manual
            {liqHits > 0 && <span className="text-bad"> · {liqHits} liq</span>}
          </div>
        </div>
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Win rate
          </div>
          <div className="font-mono text-base">{winRate}%</div>
          <div className="text-[10px] font-mono text-muted">TPs / closed</div>
        </div>
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Duration
          </div>
          <div className="font-mono text-base">~{sessionHours}h</div>
          <div className="text-[10px] font-mono text-muted">
            ended {fmtTime(session.endedAt ?? Date.now())}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted leading-snug">
        The lesson here isn't the P&amp;L number — it's whether your TP/SL
        ratio and your win rate are mathematically positive. A 40% win rate
        with 2R reward and 1R risk still grows the account; a 70% win rate
        with the inverse loses money. Stack the math first; the P&amp;L
        follows.
      </p>

      <button
        type="button"
        onClick={onStartNew}
        className="w-full bg-accent text-white font-semibold py-2 rounded-md"
      >
        Start new session
      </button>
    </div>
  );
}
