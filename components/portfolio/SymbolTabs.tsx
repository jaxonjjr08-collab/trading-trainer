"use client";

// v4.1 — Symbol tab bar for the portfolio simulator. One tab per symbol with
// the symbol's current price, a sparkline-ish delta, and a small dot when the
// user has an open position on that symbol.

import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
  activeSymbol: string;
  onSelect: (symbol: string) => void;
};

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 10) return `$${p.toFixed(2)}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

function fmtPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

export default function SymbolTabs({ session, activeSymbol, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {session.symbols.map((s) => {
        const idx = Math.min(session.currentIdx, s.candles.length - 1);
        const current = s.candles[idx]?.close ?? s.basePrice;
        const pct = ((current - s.basePrice) / s.basePrice) * 100;
        const hasOpen = session.positions.some(
          (p) => p.symbol === s.symbol && p.status === "open"
        );
        const isActive = s.symbol === activeSymbol;
        return (
          <button
            key={s.symbol}
            type="button"
            onClick={() => onSelect(s.symbol)}
            className={`flex-1 min-w-[120px] rounded-md border px-3 py-2 text-left transition-colors ${
              isActive
                ? "bg-accent/15 border-accent/60"
                : "bg-panel2 border-line hover:border-accent/40"
            }`}
            aria-pressed={isActive}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isActive ? "text-accent" : "text-text"}>
                {s.symbol}
              </span>
              {hasOpen && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-good"
                  aria-label="Open position"
                />
              )}
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[11px]">
              <span className="font-mono text-text">{fmtPrice(current)}</span>
              <span className={pct >= 0 ? "text-good" : "text-bad"}>
                {fmtPct(pct)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
