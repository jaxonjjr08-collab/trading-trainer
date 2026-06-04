"use client";

// v5.8.2 — Hero price strip for the active symbol. Sits below the
// watchlist chips and is the single dominant price element on the page:
// a large mark price, 24h change (sharing lib/price-stats so it agrees
// with the chip above it), and 24h high/low/range derived from the
// loaded window. Pulses on every tick.
//
// Redundancy cleanup from v5.8.1: the bar count moved out of here (it
// already lives in the chip footer, the load-older readout, and the
// status footer — four copies was three too many).

import { useEffect, useRef, useState } from "react";
import { priceWindowStats, lookbackLabel } from "@/lib/price-stats";
import type { Candle } from "@/lib/types";

type Props = {
  symbol: string;
  candles: Candle[];
  intervalSec: number;
};

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

// 24h high/low from the same window the change uses — the highest high
// and lowest low among candles within ~24h of the latest bar.
function rangeStats(candles: Candle[]): { high: number; low: number } | null {
  if (candles.length === 0) return null;
  const last = candles[candles.length - 1];
  const cutoff = last.time - 24 * 3600;
  let high = -Infinity;
  let low = Infinity;
  for (let i = candles.length - 1; i >= 0; i--) {
    const c = candles[i];
    if (c.time < cutoff) break;
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  if (!isFinite(high) || !isFinite(low)) {
    return { high: last.high, low: last.low };
  }
  return { high, low };
}

export default function PriceTicker({ symbol, candles }: Props) {
  const stats = priceWindowStats(candles);
  const range = rangeStats(candles);
  const last = candles[candles.length - 1];

  const prevPriceRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (!last) return;
    const prev = prevPriceRef.current;
    if (prev != null && prev !== last.close) {
      setFlash(last.close > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prevPriceRef.current = last.close;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = last.close;
  }, [last?.close]);

  if (!stats || !last) return null;

  const dirColor =
    stats.direction === "up"
      ? "text-good"
      : stats.direction === "down"
      ? "text-bad"
      : "text-muted";
  const flashStyle =
    flash === "up"
      ? "ring-2 ring-good/50"
      : flash === "down"
      ? "ring-2 ring-bad/50"
      : "";

  // Where price sits in the 24h range, 0..100 — drives the range bar.
  const rangePos =
    range && range.high > range.low
      ? ((stats.price - range.low) / (range.high - range.low)) * 100
      : 50;

  return (
    <div
      className={`rounded-md border border-line bg-panel px-4 py-3 transition-shadow duration-300 ${flashStyle}`}
    >
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {/* Symbol + big price */}
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-0.5">
            {symbol}
          </div>
          <div className="font-mono text-4xl font-bold leading-none tabular-nums">
            ${fmtPrice(stats.price)}
          </div>
        </div>

        {/* Change */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Change · {lookbackLabel(stats.hoursBack)}
          </div>
          <div className={`font-mono text-lg leading-tight tabular-nums ${dirColor}`}>
            {stats.direction === "up" ? "▲" : stats.direction === "down" ? "▼" : "•"}{" "}
            {stats.change >= 0 ? "+" : ""}
            {fmtPrice(Math.abs(stats.change))}
            <span className="ml-2 text-sm">
              ({stats.changePct >= 0 ? "+" : ""}
              {stats.changePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* 24h range with position bar */}
        {range && (
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-muted mb-1">
              <span>L ${fmtPrice(range.low)}</span>
              <span className="text-muted/60">{lookbackLabel(stats.hoursBack)} range</span>
              <span>H ${fmtPrice(range.high)}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-panel2 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-bad/40 via-muted/30 to-good/40"
                style={{ width: "100%" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-1 rounded-full bg-text shadow"
                style={{ left: `${Math.max(2, Math.min(98, rangePos))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
