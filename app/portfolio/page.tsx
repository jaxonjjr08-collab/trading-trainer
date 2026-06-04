"use client";

// v4.1 — Portfolio simulator. One master 7-day timeline; five symbols; the
// user opens positions, advances time, and gets a portfolio_risk score at
// session end. Hydrates an in-progress session from localStorage and saves
// on every mutation so refreshes don't lose state.

import { useEffect, useMemo, useState } from "react";
import Chart, { type PriceLine } from "@/components/Chart";
import IndicatorSubChart from "@/components/IndicatorSubChart";
import ChartOverlayBar from "@/components/practice/ChartOverlayBar";
import SymbolTabs from "@/components/portfolio/SymbolTabs";
import OpenPositionForm from "@/components/portfolio/OpenPositionForm";
import PositionList from "@/components/portfolio/PositionList";
import TimeControls from "@/components/portfolio/TimeControls";
import ChallengeBanner from "@/components/portfolio/ChallengeBanner";
import CorrelationHint from "@/components/portfolio/CorrelationHint";
import SessionSummary from "@/components/portfolio/SessionSummary";
import {
  evaluateAllChallenges,
  markChallengeCompleted,
} from "@/lib/portfolio-challenge";
import {
  advanceTo,
  closePosition,
  createSession,
  endSession,
  openPosition,
  totalRiskPercent,
  totalSessionPnl,
  type OpenPositionParams,
} from "@/lib/portfolio";
import {
  clearPortfolioSession,
  getDecisionDefaults,
  getDefaultIndicators,
  getPortfolioSession,
  savePortfolioSession,
  setDecisionDefaults,
} from "@/lib/storage";
import {
  DEFAULT_INDICATOR_CONFIG,
  type IndicatorConfig,
  type PortfolioSession,
} from "@/lib/types";

export default function PortfolioPage() {
  const [session, setSession] = useState<PortfolioSession | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  // v4.1.1 — same overlay model as Practice: session-local toggles seeded
  // from the persisted default. Single shared default means a trader's
  // "EMAs always on" preference applies on /portfolio too.
  const [overlays, setOverlays] = useState<IndicatorConfig>(DEFAULT_INDICATOR_CONFIG);
  // v4.1.7 — editable starting account size on the empty-state screen.
  // Persisted via setDecisionDefaults so the same number prefills next time
  // and also acts as the Practice form's default. One global "what's my
  // account worth" preference.
  const [startAccountSize, setStartAccountSize] = useState<number>(10000);

  useEffect(() => {
    const existing = getPortfolioSession();
    if (existing) {
      setSession(existing);
      setActiveSymbol(existing.symbols[0]?.symbol ?? "");
    }
    setOverlays(getDefaultIndicators());
    setStartAccountSize(getDecisionDefaults().accountSize);
    setHydrated(true);
  }, []);

  function persist(next: PortfolioSession) {
    setSession(next);
    savePortfolioSession(next);
  }

  function handleStart() {
    const safeAccountSize =
      Number.isFinite(startAccountSize) && startAccountSize > 0
        ? startAccountSize
        : 10000;
    // Persist as the global default so it's also the Practice form's default
    // the next time it loads.
    setDecisionDefaults({ accountSize: safeAccountSize });
    const next = createSession({ accountSize: safeAccountSize });
    setActiveSymbol(next.symbols[0]?.symbol ?? "");
    persist(next);
  }

  function handleOpen(params: OpenPositionParams) {
    if (!session) return;
    persist(openPosition(session, params));
  }

  function handleClose(positionId: string) {
    if (!session) return;
    persist(closePosition(session, positionId));
  }

  function handleAdvance(targetIdx: number) {
    if (!session) return;
    persist(advanceTo(session, targetIdx));
  }

  function handleEnd() {
    if (!session) return;
    const ended = endSession(session);
    // v4.1.2 — evaluate every challenge and stamp completion for each that
    // cleared. SessionSummary surfaces the cleared list; the banner stays on
    // the primary challenge.
    for (const progress of evaluateAllChallenges(ended)) {
      if (progress.satisfied) {
        markChallengeCompleted(progress.challenge.id);
      }
    }
    persist(ended);
  }

  function handleStartNew() {
    clearPortfolioSession();
    handleStart();
  }

  const activeSymbolData = useMemo(
    () => session?.symbols.find((s) => s.symbol === activeSymbol),
    [session, activeSymbol]
  );

  // Chart split: everything up to and including currentIdx is visible; the
  // rest is hidden (never revealed — time advance is the only way to see it).
  const chartSplit = useMemo(() => {
    if (!session || !activeSymbolData) return { visible: [], hidden: [] };
    const cut = Math.min(session.currentIdx + 1, activeSymbolData.candles.length);
    return {
      visible: activeSymbolData.candles.slice(0, cut),
      hidden: activeSymbolData.candles.slice(cut),
    };
  }, [session, activeSymbolData]);

  // Price lines for the active symbol's OPEN positions only — entry, stop,
  // and TP. Closed positions live in the position list, not on the chart.
  const priceLines: PriceLine[] = useMemo(() => {
    if (!session || !activeSymbolData) return [];
    const lines: PriceLine[] = [];
    for (const p of session.positions) {
      if (p.symbol !== activeSymbol || p.status !== "open") continue;
      lines.push({ price: p.entry, color: "#4f8cff", title: "entry" });
      lines.push({ price: p.stopLoss, color: "#ef4444", title: "stop" });
      lines.push({ price: p.takeProfit, color: "#22c55e", title: "tp" });
      // v5.6.0 — liquidation line for leveraged positions.
      if (p.liquidationPrice != null) {
        lines.push({
          price: p.liquidationPrice,
          color: "#dc2626",
          title: `liq ${p.leverage}×`,
          lineStyle: "dashed",
        });
      }
    }
    return lines;
  }, [session, activeSymbolData, activeSymbol]);

  if (!hydrated) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Portfolio simulator</h1>
          <p className="text-muted text-sm mt-1">
            Run a 7-day window with five symbols sharing one master clock. Open
            up to a 5% total risk budget across positions and learn what
            'concurrent' actually costs you when symbols move together.
          </p>
        </header>
        <div className="rounded-md border border-line bg-panel p-6 space-y-4">
          <p className="text-text text-center">No session yet.</p>
          {/* v4.1.7 — editable starting account size. Persisted as the global
              default so it sticks across sessions and prefills Practice too. */}
          <label className="block max-w-xs mx-auto">
            <span className="text-[10px] uppercase tracking-wider text-muted block mb-1">
              Starting account size (USD)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted font-mono">$</span>
              <input
                type="number"
                min="100"
                step="100"
                value={startAccountSize}
                onChange={(e) => setStartAccountSize(Number(e.target.value) || 0)}
                className="flex-1 bg-panel2 border border-line text-text text-base px-3 py-1.5 rounded font-mono"
              />
            </div>
            <span className="text-[10px] text-muted block mt-1">
              Used to compute realized P&amp;L. Also becomes your default in Practice.
            </span>
          </label>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleStart}
              className="bg-accent text-white font-semibold px-6 py-2 rounded-md"
            >
              Start new session
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = totalSessionPnl(session);
  const openRisk = totalRiskPercent(session, true);
  const isEnded = session.status === "ended";

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio simulator</h1>
          <p className="text-muted text-sm mt-0.5">
            {isEnded
              ? "Session ended. Review the score below and start a new one when you're ready."
              : "Open positions across symbols, advance time, and watch how your basket behaves together."}
          </p>
        </div>
        <div className="flex items-baseline gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Account
            </div>
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
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Open risk
            </div>
            <div className="font-mono text-lg">{openRisk.toFixed(1)}%</div>
          </div>
        </div>
      </header>

      <ChallengeBanner session={session} />

      {!isEnded && <CorrelationHint session={session} />}

      <SymbolTabs
        session={session}
        activeSymbol={activeSymbol}
        onSelect={setActiveSymbol}
      />

      {/* v4.1.1 — same overlay toolbar as Practice. Per-session toggles;
          defaults live in Settings. */}
      <ChartOverlayBar value={overlays} onChange={setOverlays} />

      {activeSymbolData && (
        <div className="rounded-md border border-line bg-panel p-2 space-y-2">
          {/* v4.1.7 — key forces remount on symbol switch (re-fits the chart);
              autoFit=false so advancing time within a symbol stays at your
              manual zoom level. */}
          <Chart
            key={activeSymbol}
            visible={chartSplit.visible}
            hidden={chartSplit.hidden}
            priceLines={priceLines}
            overlays={overlays}
            height={360}
            autoFit={false}
          />
          {overlays.rsi && (
            <IndicatorSubChart
              key={`${activeSymbol}-rsi`}
              kind="rsi"
              candles={chartSplit.visible}
            />
          )}
          {overlays.macd && (
            <IndicatorSubChart
              key={`${activeSymbol}-macd`}
              kind="macd"
              candles={chartSplit.visible}
            />
          )}
        </div>
      )}

      {isEnded ? (
        <SessionSummary session={session} onStartNew={handleStartNew} />
      ) : (
        <>
          <TimeControls
            session={session}
            onAdvance={handleAdvance}
            onEnd={handleEnd}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OpenPositionForm
              session={session}
              activeSymbol={activeSymbol}
              onSubmit={handleOpen}
            />
            <PositionList
              session={session}
              onClose={handleClose}
              onSelectSymbol={setActiveSymbol}
            />
          </div>
        </>
      )}
    </div>
  );
}
