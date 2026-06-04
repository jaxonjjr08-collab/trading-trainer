"use client";

// v4.1 — Form for opening a new position in the portfolio simulator.
// Prefills entry at the active symbol's current close so the most common
// gesture (market entry at currentIdx) is one click. Stop/TP are typed as
// percentages from entry to match how beginners think about distance.
//
// v5.3.0 — Leverage support. New slider/select for 1×–25× (default 1×
// spot). When leverage > 1, the form shows a calculated liquidation price
// in red so the user can see the cost of their sizing decision before
// submitting. Submission throws if the stop sits beyond the liq level —
// portfolio.openPosition does the actual guard.

import { useEffect, useMemo, useState } from "react";
import type { PortfolioSession } from "@/lib/types";
import type { OpenPositionParams } from "@/lib/portfolio";
import { liquidationPrice } from "@/lib/leverage";

type Props = {
  session: PortfolioSession;
  activeSymbol: string;
  // v5.3.0 — reuse the OpenPositionParams shape from lib/portfolio so the
  // form and the engine can't drift on field shape (the previous inline
  // duplicate kept missing fields when openPosition gained new ones).
  onSubmit: (params: OpenPositionParams) => void;
  disabled?: boolean;
};

// Available leverage tiers. Limited set so the user picks a discrete value
// rather than nudging a slider — 5× vs 6× is a meaningless distinction and
// just one more thing to fiddle with. Tiers picked to match the way crypto
// exchanges typically expose leverage (1, 2, 5, 10, 25).
const LEVERAGE_TIERS = [1, 2, 5, 10, 25] as const;

function roundForSymbol(value: number, basePrice: number): number {
  if (basePrice >= 1000) return Number(value.toFixed(2));
  if (basePrice >= 10) return Number(value.toFixed(3));
  return Number(value.toFixed(5));
}

export default function OpenPositionForm({
  session,
  activeSymbol,
  onSubmit,
  disabled = false,
}: Props) {
  const symbol = useMemo(
    () => session.symbols.find((s) => s.symbol === activeSymbol)!,
    [session, activeSymbol]
  );
  const idx = Math.min(session.currentIdx, symbol.candles.length - 1);
  const currentPrice = symbol.candles[idx]?.close ?? symbol.basePrice;

  const [direction, setDirection] = useState<"long" | "short">("long");
  const [stopPct, setStopPct] = useState<number>(3);
  const [tpPct, setTpPct] = useState<number>(6);
  const [riskPct, setRiskPct] = useState<number>(1);
  // v5.3.0 — leverage tier. 1 = spot (no liquidation, no funding).
  const [leverage, setLeverage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Reset error and re-anchor when the active symbol changes.
  useEffect(() => {
    setError(null);
  }, [activeSymbol]);

  const stopPrice =
    direction === "long"
      ? roundForSymbol(currentPrice * (1 - stopPct / 100), symbol.basePrice)
      : roundForSymbol(currentPrice * (1 + stopPct / 100), symbol.basePrice);
  const tpPrice =
    direction === "long"
      ? roundForSymbol(currentPrice * (1 + tpPct / 100), symbol.basePrice)
      : roundForSymbol(currentPrice * (1 - tpPct / 100), symbol.basePrice);
  const rr = stopPct > 0 ? (tpPct / stopPct).toFixed(2) : "—";
  // v5.3.0 — preview the liq price so the user sees the cost of leverage
  // before they submit. Null on spot — no liquidation possible.
  const liqPrice = useMemo(
    () => liquidationPrice(currentPrice, direction, leverage),
    [currentPrice, direction, leverage]
  );
  // Distance from current price to liquidation, as a percent — pedagogically
  // the single most useful number for "how risky is this leverage."
  const liqDistancePct = useMemo(() => {
    if (liqPrice == null) return null;
    return ((Math.abs(currentPrice - liqPrice) / currentPrice) * 100).toFixed(2);
  }, [currentPrice, liqPrice]);
  // Warn when the user's stop sits beyond the liq level — the trade will
  // liquidate before the stop fires. portfolio.openPosition throws on this
  // case; we surface the warning before submit so it's not a surprise.
  const liqTrap = useMemo(() => {
    if (liqPrice == null) return false;
    return direction === "long" ? stopPrice <= liqPrice : stopPrice >= liqPrice;
  }, [direction, stopPrice, liqPrice]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      onSubmit({
        symbol: activeSymbol,
        direction,
        entry: currentPrice,
        stopLoss: stopPrice,
        takeProfit: tpPrice,
        riskPercent: riskPct,
        leverage: leverage > 1 ? leverage : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open position.");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-line bg-panel p-3"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Open position — {activeSymbol}</h3>
        <span className="font-mono text-xs text-muted">
          @ {currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDirection("long")}
          className={`py-1.5 text-xs font-semibold rounded-md border ${
            direction === "long"
              ? "bg-good/20 border-good/60 text-good"
              : "bg-panel2 border-line text-muted hover:text-text"
          }`}
        >
          Long
        </button>
        <button
          type="button"
          onClick={() => setDirection("short")}
          className={`py-1.5 text-xs font-semibold rounded-md border ${
            direction === "short"
              ? "bg-bad/20 border-bad/60 text-bad"
              : "bg-panel2 border-line text-muted hover:text-text"
          }`}
        >
          Short
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted">Stop %</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={stopPct}
            onChange={(e) => setStopPct(parseFloat(e.target.value) || 0)}
            className="bg-panel2 border border-line rounded px-2 py-1 font-mono"
          />
          <span className="font-mono text-muted text-[10px]">
            {stopPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">TP %</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={tpPct}
            onChange={(e) => setTpPct(parseFloat(e.target.value) || 0)}
            className="bg-panel2 border border-line rounded px-2 py-1 font-mono"
          />
          <span className="font-mono text-muted text-[10px]">
            {tpPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Risk %</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="50"
            value={riskPct}
            onChange={(e) => setRiskPct(parseFloat(e.target.value) || 0)}
            className="bg-panel2 border border-line rounded px-2 py-1 font-mono"
          />
          <span className="font-mono text-muted text-[10px]">R:R {rr}</span>
        </label>
      </div>

      {/* v5.6.5 — Quick-size chips. Beginner traders rarely have an exact
          risk % in mind; presets nudge toward the trainer's recommended
          ranges (0.5–2%) while leaving room for an intentional 5%+
          experiment. The chip the user is currently on is highlighted so
          the relationship between typed value and preset is visible. */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted mr-1">
          Risk presets
        </span>
        {[0.5, 1, 2, 5].map((preset) => {
          const active = Math.abs(riskPct - preset) < 0.01;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setRiskPct(preset)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                active
                  ? "bg-accent/20 border-accent/60 text-accent"
                  : "bg-panel2 border-line text-muted hover:text-text"
              }`}
              title={
                preset <= 1
                  ? "Conservative — the trainer's default range"
                  : preset === 2
                  ? "Aggressive — fine when the setup is high-conviction"
                  : "Very aggressive — five losses in a row is a -25% drawdown"
              }
            >
              {preset}%
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted">
            Leverage
          </span>
          {leverage > 1 && liqPrice != null && (
            <span
              className={`font-mono text-[10px] ${liqTrap ? "text-bad" : "text-warn"}`}
              title={
                liqTrap
                  ? "Your stop is past the liquidation level. The position would liquidate first."
                  : "Price at which your position is liquidated — full loss of margin."
              }
            >
              Liq @ {liqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              ({liqDistancePct}%)
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {LEVERAGE_TIERS.map((t) => {
            const active = t === leverage;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setLeverage(t)}
                className={`py-1 text-[11px] font-mono font-semibold rounded border ${
                  active
                    ? t === 1
                      ? "bg-accent/20 border-accent/60 text-accent"
                      : t >= 10
                      ? "bg-bad/20 border-bad/60 text-bad"
                      : "bg-warn/20 border-warn/60 text-warn"
                    : "bg-panel2 border-line text-muted hover:text-text"
                }`}
                title={t === 1 ? "Spot — no liquidation, no funding" : `${t}× perp — funding accrues, liquidation possible`}
              >
                {t}×
              </button>
            );
          })}
        </div>
        {leverage > 1 && (
          <p className="text-[10px] text-muted leading-snug pt-1">
            Perp at {leverage}× — funding accrues every candle; liquidation locks in a full margin loss if price crosses the liq level.
          </p>
        )}
      </div>

      {liqTrap && !error && (
        <div className="text-[11px] text-bad bg-bad/10 border border-bad/30 rounded px-2 py-1">
          Your stop ({stopPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}) sits beyond the liquidation price. Lower leverage or tighten your stop.
        </div>
      )}

      {error && (
        <div className="text-[11px] text-bad bg-bad/10 border border-bad/30 rounded px-2 py-1">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || liqTrap}
        className="w-full bg-accent text-white font-semibold py-2 rounded-md disabled:opacity-50"
      >
        Open {direction} on {activeSymbol}
        {leverage > 1 && (
          <span className="ml-1 font-mono text-[11px] opacity-80">
            · {leverage}×
          </span>
        )}
      </button>
    </form>
  );
}
