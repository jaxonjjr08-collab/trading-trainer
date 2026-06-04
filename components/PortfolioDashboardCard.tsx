"use client";

// v4.1 — Dashboard entry for the portfolio simulator.
// v6.0 (phase 3) — borderless editorial row (matches PaperTradingDashboardCard):
// display-serif title, hover tint instead of a border box, inline mono stats.

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

  const total = session ? totalSessionPnl(session) : 0;
  const openRisk = session ? totalRiskPercent(session, true) : 0;
  const openCount = session
    ? session.positions.filter((p) => p.status === "open").length
    : 0;
  const isActive = session != null && session.status !== "ended";

  return (
    <Link
      href="/portfolio"
      className="group block py-4 -mx-3 px-3 rounded-lg hover:bg-panel/60 transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-accent transition-colors">
          Portfolio Simulator
          {isActive && (
            <span className="ml-2 align-middle text-[10px] font-sans font-bold uppercase tracking-wider text-accent">
              ● Active
            </span>
          )}
        </h3>
        <span className="shrink-0 text-xs text-muted group-hover:text-accent transition-colors">
          Open →
        </span>
      </div>
      <p className="mt-1 text-sm text-muted max-w-xl leading-relaxed">
        Run a 7-day window across 5 symbols. Open concurrent positions and learn
        what correlation actually costs you.
      </p>
      {hydrated && session != null && (
        <div className="mt-2 font-mono text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          {session.status === "ended" ? (
            <>
              <span>Ended · review the score</span>
              <span className={total >= 0 ? "text-good" : "text-bad"}>
                {total >= 0 ? "+" : ""}
                {total.toFixed(2)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-text">{openCount} open</span>
              <span>· {openRisk.toFixed(1)}% risk</span>
              <span className={total >= 0 ? "text-good" : "text-bad"}>
                · {total >= 0 ? "+" : ""}
                {total.toFixed(2)}%
              </span>
            </>
          )}
        </div>
      )}
    </Link>
  );
}
