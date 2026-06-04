"use client";

// v5.0 — Dashboard entry for live paper trading.
// v6.0 (phase 3) — reworked from a bordered card into a borderless editorial
// row: display-serif title, hover tint instead of a border box, inline mono
// stats. Borders are reserved for inputs/charts/callouts; an entry link is
// none of those, so it reads as type + space. The parent groups it with the
// portfolio row under a hairline-divided "Surfaces" section in app/page.tsx.

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

  const total = session ? totalSessionPnl(session) : 0;
  const openRisk = session ? totalRiskPercent(session, true) : 0;
  const openCount = session
    ? session.positions.filter((p) => p.status === "open").length
    : 0;
  const symbol = session?.symbols[0]?.symbol ?? "";
  const isActive = session != null && session.status !== "ended";

  return (
    <Link
      href="/paper-trading"
      className="group block py-4 -mx-3 px-3 rounded-lg hover:bg-panel/60 transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-accent transition-colors">
          Live Paper Trading
          {isActive && (
            <span className="ml-2 align-middle text-[10px] font-sans font-bold uppercase tracking-wider text-good">
              ● Live
            </span>
          )}
        </h3>
        <span className="shrink-0 text-xs text-muted group-hover:text-accent transition-colors">
          Open →
        </span>
      </div>
      <p className="mt-1 text-sm text-muted max-w-xl leading-relaxed">
        Real Coinbase prices, paper money. Open positions and watch them tick on
        the live chart.
      </p>
      {hydrated && session != null && (
        <div className="mt-2 font-mono text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          {session.status === "ended" ? (
            <>
              <span>Ended · {symbol}</span>
              <span className={total >= 0 ? "text-good" : "text-bad"}>
                {total >= 0 ? "+" : ""}
                {total.toFixed(2)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-text">{symbol}</span>
              <span>· {openCount} open</span>
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
