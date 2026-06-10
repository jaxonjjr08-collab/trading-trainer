"use client";

// v5.12.4 — "Pick up where you left off" strip for the dashboard.
//
// Background: v5.11.1 dropped the always-on "Your open sessions" section to
// shorten the dashboard. That was right for the common case (no session in
// flight) but it also hid the *resume* affordance from users who DO have a
// live paper-trading or portfolio session running — they'd have to remember
// to navigate back. This strip splits the difference: it renders nothing
// unless a session is actually active (not null, not ended), and only shows
// the surface(s) that are live. So the dashboard stays short normally and
// resurfaces in-progress work exactly when it's relevant.

import { useEffect, useState } from "react";
import { getLiveSession, getPortfolioSession } from "@/lib/storage";
import PaperTradingDashboardCard from "./PaperTradingDashboardCard";
import PortfolioDashboardCard from "./PortfolioDashboardCard";

export default function ResumeSessions() {
  const [liveActive, setLiveActive] = useState(false);
  const [portfolioActive, setPortfolioActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const live = getLiveSession();
    const portfolio = getPortfolioSession();
    setLiveActive(live != null && live.mode === "live" && live.status !== "ended");
    setPortfolioActive(portfolio != null && portfolio.status !== "ended");
    setHydrated(true);
  }, []);

  // Render nothing until we know, and nothing if neither surface is live —
  // this keeps the dashboard exactly as short as it was for the common case.
  if (!hydrated || (!liveActive && !portfolioActive)) return null;

  return (
    <section className="animate-fade-in">
      <div className="flex items-baseline gap-3 border-b border-line pb-2">
        <h2 className="font-display text-lg font-semibold">
          Pick up where you left off
        </h2>
        <span className="text-xs text-muted">In progress</span>
      </div>
      <div className="divide-y divide-line">
        {liveActive && <PaperTradingDashboardCard />}
        {portfolioActive && <PortfolioDashboardCard />}
      </div>
    </section>
  );
}
