"use client";

// v4.1 — Dashboard entry card for the portfolio simulator. Shows session
// status (none / active / ended) and links to /portfolio. Keeps the
// Dashboard surface from sprawling — the actual simulator UI lives on its
// own route, this card is just the door.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPortfolioSession } from "@/lib/storage";
import { totalRiskPercent, totalSessionPnl } from "@/lib/portfolio";
import type { PortfolioSession } from "@/lib/types";

export default function PortfolioDashboardCard() {
  const [session, setSession] = useState<PortfolioSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(getPortfolioSession());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="rounded-md border border-line bg-panel p-4 text-xs text-muted">
        Loading portfolio…
      </div>
    );
  }

  const total = session ? totalSessionPnl(session) : 0;
  const openRisk = session ? totalRiskPercent(session, true) : 0;
  const openCount = session
    ? session.positions.filter((p) => p.status === "open").length
    : 0;

  return (
    <Link
      href="/portfolio"
      className="block rounded-md border border-line bg-panel p-4 hover:border-accent/60 transition-colors"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Portfolio simulator</h2>
        <span className="text-xs text-accent">Open →</span>
      </header>
      <p className="text-xs text-muted mt-0.5">
        Run a 7-day window with 5 symbols. Open concurrent positions, learn
        what correlation costs you.
      </p>
      {session == null ? (
        <p className="mt-3 text-xs text-muted italic">No active session.</p>
      ) : session.status === "ended" ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Last session
            </div>
            <div className="font-mono">Ended — review the score</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Final P&amp;L
            </div>
            <div
              className={`font-mono ${total >= 0 ? "text-good" : "text-bad"}`}
            >
              {total >= 0 ? "+" : ""}
              {total.toFixed(2)}%
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Open
            </div>
            <div className="font-mono">{openCount}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Risk
            </div>
            <div className="font-mono">{openRisk.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              PnL
            </div>
            <div
              className={`font-mono ${total >= 0 ? "text-good" : "text-bad"}`}
            >
              {total >= 0 ? "+" : ""}
              {total.toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
