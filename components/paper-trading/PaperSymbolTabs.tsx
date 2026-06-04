"use client";

// v5.8.2 — Compact watchlist-style symbol tabs. Rebuilt from the v5.8.1
// "giant stretched card" design that ballooned to full-width on a single
// symbol and duplicated the hero PriceTicker below it.
//
// New model: these are a horizontal-scrolling WATCHLIST strip — compact
// chips (fixed-ish width, never stretch) that you click to switch the
// active symbol. The big detailed price lives in the hero PriceTicker
// below; the chips are the glanceable list + switcher. This is the
// TradingView / Binance pattern: small watchlist entries, one big active
// price.
//
// Each chip: symbol, last price (small mono), 24h change (colored, with
// arrow), inline sparkline, and a PnL chip when you hold a position on
// that symbol. Active chip gets an accent border + lifted bg. Live tick
// flashes the chip border green/red briefly.

import { useEffect, useRef, useState } from "react";
import { positionMarkPnl } from "@/lib/portfolio";
import { priceWindowStats, lookbackLabel } from "@/lib/price-stats";
import type { PortfolioSession } from "@/lib/types";
import CoinLogo from "./CoinLogo";
import Sparkline from "./Sparkline";
import SymbolPicker from "./SymbolPicker";

type Props = {
  session: PortfolioSession;
  activeSymbol: string;
  onSelect: (symbol: string) => void;
  onAdd: (productId: string) => void;
  addingSymbol: boolean;
};

const SPARK_BARS = 28;

function fmtPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

function symbolOpenR(
  session: PortfolioSession,
  symbol: string
): { hasOpen: boolean; rMultiple: number } {
  let totalPnl = 0;
  let totalRisk = 0;
  for (const p of session.positions) {
    if (p.symbol !== symbol || p.status !== "open") continue;
    totalPnl += positionMarkPnl(session, p);
    totalRisk += p.riskPercent;
  }
  if (totalRisk === 0) return { hasOpen: false, rMultiple: 0 };
  return { hasOpen: true, rMultiple: totalPnl / totalRisk };
}

type ChipProps = {
  symbol: PortfolioSession["symbols"][number];
  isActive: boolean;
  openInfo: { hasOpen: boolean; rMultiple: number };
  onSelect: () => void;
};

function SymbolChip({ symbol: s, isActive, openInfo, onSelect }: ChipProps) {
  const stats = priceWindowStats(s.candles);
  const current = stats?.price ?? s.candles[s.candles.length - 1]?.close ?? 0;
  const pct = stats?.changePct ?? 0;
  const dir = stats?.direction ?? "flat";
  const dirColor =
    dir === "up" ? "text-good" : dir === "down" ? "text-bad" : "text-muted";
  const sparkTone = dir === "up" ? "bull" : dir === "down" ? "bear" : "neutral";

  // Live-tick border flash on price change.
  const prevPriceRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const prev = prevPriceRef.current;
    if (prev != null && prev !== current) {
      setFlash(current > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 450);
      prevPriceRef.current = current;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = current;
  }, [current]);

  const sparkCloses =
    s.candles.length > 0
      ? s.candles.slice(-SPARK_BARS).map((c) => c.close)
      : [];

  const flashRing =
    flash === "up"
      ? "ring-1 ring-good/70"
      : flash === "down"
      ? "ring-1 ring-bad/70"
      : "";
  const activeStyle = isActive
    ? "border-accent bg-accent/10"
    : "border-line bg-panel2 hover:border-accent/40 hover:bg-panel";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={`shrink-0 w-[164px] rounded-lg border px-3 py-2 text-left transition-all duration-150 ${activeStyle} ${flashRing}`}
    >
      {/* Symbol + PnL chip */}
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex items-center gap-1.5 min-w-0">
          {/* v5.8.5 — coin logo, falls back to colored initials. */}
          <CoinLogo ticker={s.symbol.replace("-USD", "")} size={18} />
          <span
            className={`text-[11px] font-bold tracking-wide truncate ${
              isActive ? "text-accent" : "text-text"
            }`}
          >
            {s.symbol.replace("-USD", "")}
            <span className="text-muted font-normal">/USD</span>
          </span>
        </span>
        {openInfo.hasOpen && (
          <span
            className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded leading-none ${
              openInfo.rMultiple >= 0
                ? "bg-good/20 text-good"
                : "bg-bad/20 text-bad"
            }`}
            title={`Open position PnL on ${s.symbol}`}
          >
            {openInfo.rMultiple >= 0 ? "+" : ""}
            {openInfo.rMultiple.toFixed(1)}R
          </span>
        )}
      </div>

      {/* Price + sparkline */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="font-mono text-sm font-bold tabular-nums leading-none">
          ${fmtPrice(current)}
        </span>
        <Sparkline closes={sparkCloses} tone={sparkTone} width={50} height={16} />
      </div>

      {/* 24h change */}
      <div className={`text-[11px] font-mono font-semibold mt-1 ${dirColor}`}>
        {dir === "up" ? "▲" : dir === "down" ? "▼" : "•"} {pct >= 0 ? "+" : ""}
        {pct.toFixed(2)}%
        <span className="text-muted font-normal ml-1">
          {stats ? lookbackLabel(stats.hoursBack) : ""}
        </span>
      </div>
    </button>
  );
}

export default function PaperSymbolTabs({
  session,
  activeSymbol,
  onSelect,
  onAdd,
  addingSymbol,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [pendingPick, setPendingPick] = useState<string>("");

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {session.symbols.map((s) => (
          <SymbolChip
            key={s.symbol}
            symbol={s}
            isActive={s.symbol === activeSymbol}
            openInfo={symbolOpenR(session, s.symbol)}
            onSelect={() => onSelect(s.symbol)}
          />
        ))}
        {/* Add-pair tile — compact, same height as a chip. */}
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          disabled={addingSymbol}
          className="shrink-0 w-[88px] rounded-lg border border-dashed border-line bg-panel2 text-muted hover:text-accent hover:border-accent/60 hover:bg-panel transition-colors flex flex-col items-center justify-center disabled:opacity-50"
          title="Add another Coinbase pair to this session"
        >
          <span className="text-xl leading-none font-bold">
            {addingSymbol ? "…" : "+"}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider mt-0.5">
            {addingSymbol ? "Loading" : "Add"}
          </span>
        </button>
      </div>
      {showPicker && (
        <div className="rounded-lg border border-accent/30 bg-panel p-3 space-y-2">
          <SymbolPicker
            value={pendingPick || activeSymbol}
            onChange={setPendingPick}
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowPicker(false);
                setPendingPick("");
              }}
              className="text-[11px] text-muted hover:text-text px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!pendingPick) return;
                onAdd(pendingPick);
                setShowPicker(false);
                setPendingPick("");
              }}
              disabled={!pendingPick || addingSymbol}
              className="text-[11px] font-semibold bg-accent text-white rounded px-3 py-1.5 disabled:opacity-50"
            >
              {addingSymbol ? "Fetching…" : "Add to session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
