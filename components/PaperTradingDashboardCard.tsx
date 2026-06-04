"use client";

// v5.0 — Dashboard entry card for live paper trading. Mirrors the
// PortfolioDashboardCard pattern: status header, click-through to /paper-trading.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLiveSession } from "@/lib/storage";
import { totalRiskPercent, totalSessionPnl } from "@/lib/portfolio";
import type { PortfolioSession } from "@/lib/types";

export default function PaperTradingDashboardCard() {
  const [session, setSession] = useState<PortfolioSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = getLiveSession();
    setSession(s && s.mode === "live" ? s : null);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="rounded-md border border-line bg-panel p-4 text-xs text-muted">
        Loading paper trading…
      </div>
    );
  }

  const total = session ? totalSessionPnl(session) : 0;
  const openRisk = session ? totalRiskPercent(session, true) : 0;
  const openCount = session
    ? session.positions.filter((p) => p.status === "open").length
    : 0;
  const symbol = session?.symbols[0]?.symbol ?? "";

  return (
    <Link
      href="/paper-trading"
      className="block rounded-md border border-line bg-panel p-4 hover:border-accent/60 transition-colors"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Live Paper Trading</h2>
        <span className="text-xs text-accent">Open →</span>
      </header>
      <p className="text-xs text-muted mt-0.5">
        Real Coinbase prices, paper money. Open positions and watch them tick on
        the live chart.
      </p>
      {session == null ? (
        <p className="mt-3 text-xs text-muted italic">No active session.</p>
      ) : session.status === "ended" ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Last session
            </div>
            <div className="font-mono">Ended — {symbol}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Final P&amp;L
            </div>
            <div className={`font-mono ${total >= 0 ? "text-good" : "text-bad"}`}>
              {total >= 0 ? "+" : ""}
              {total.toFixed(2)}%
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Symbol</div>
            <div className="font-mono">{symbol}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Open</div>
            <div className="font-mono">{openCount}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Risk</div>
            <div className="font-mono">{openRisk.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">PnL</div>
            <div className={`font-mono ${total >= 0 ? "text-good" : "text-bad"}`}>
              {total >= 0 ? "+" : ""}
              {total.toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
