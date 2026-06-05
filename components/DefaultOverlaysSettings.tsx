"use client";

// v4.0.2 — Settings section for "Default chart overlays". Persisted to
// trainer.indicators.v1 via setDefaultIndicators. Practice seeds its
// session-local toggles from this on mount.

import { useEffect, useState } from "react";
import {
  CHART_TOOL_LABELS,
  DEFAULT_INDICATOR_CONFIG,
  type ChartToolId,
  type IndicatorConfig,
} from "@/lib/types";
import { getDefaultIndicators, setDefaultIndicators } from "@/lib/storage";

const ORDER: ChartToolId[] = [
  "ema",
  "bb",
  "keltner",
  "vwap",
  "rsi",
  "macd",
  "super_guppy",
  "chris_guppy",
  "pivots",
  "patterns",
];

const DESCRIPTIONS: Record<ChartToolId, string> = {
  ema: "Three exponential moving averages on the price chart. 20 is short-term, 50 is medium, 200 is the long-term trend reference.",
  bb: "Bollinger Bands — a 20-period SMA with bands at ±2 standard deviations. Width signals volatility.",
  vwap: "Volume-weighted average price, anchored to the first candle of the scenario. A common reference for fair value.",
  rsi: "Relative Strength Index. Renders in a sub-panel under the chart with 30/70 reference lines.",
  macd: "MACD with signal line and histogram. Renders in a sub-panel under the chart.",
  super_guppy:
    "Super Guppy — 24-EMA color-coded ribbon. Color flips green/red (or blue/orange in colorblind mode) based on whether the short ribbon is fully above or below the long ribbon.",
  chris_guppy:
    "Chris's Super Guppy — user-editable GMMA variant modelled on the TradingView indicator. Configure fast/slow periods, source, and the optional EMA 200 filter from the gear icon next to the toggle.",
  keltner:
    "Keltner Channels — EMA(20) midline with ATR-derived bands. Pink envelope. Widens during trends; complements Bollinger which narrows in low-vol squeezes.",
  pivots:
    "Pivot Points — five horizontal price levels (central pivot, R1/R2, S1/S2) derived from the first ~25% of the visible candles. Anchor support and resistance for the session.",
  patterns:
    "Candle patterns — auto-detected markers for Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing, and Inside Bar. Conservative detection; only the cleanest examples flag.",
};

export default function DefaultOverlaysSettings() {
  const [config, setConfig] = useState<IndicatorConfig>(DEFAULT_INDICATOR_CONFIG);

  useEffect(() => {
    setConfig(getDefaultIndicators());
  }, []);

  function toggle(id: ChartToolId) {
    const next = { ...config, [id]: !config[id] };
    setConfig(next);
    setDefaultIndicators(next);
  }

  function resetAll() {
    const next = { ...DEFAULT_INDICATOR_CONFIG };
    setConfig(next);
    setDefaultIndicators(next);
  }

  const anyOn = ORDER.some((id) => config[id]);

  return (
    <section className="rounded-md border border-line bg-panel p-4 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Default chart overlays</h2>
          <p className="text-xs text-muted mt-0.5">
            Indicators that come on by default when you open a Practice scenario.
            You can still flip them per scenario from the chart toolbar.
          </p>
        </div>
        {anyOn && (
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-muted hover:text-text underline"
          >
            Reset
          </button>
        )}
      </header>
      <ul className="space-y-2">
        {ORDER.map((id) => (
          <li key={id} className="flex items-start gap-3">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config[id]}
                onChange={() => toggle(id)}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span>
                <span className="text-sm font-semibold text-text">
                  {CHART_TOOL_LABELS[id]}
                </span>
                <span className="block text-xs text-muted leading-snug">
                  {DESCRIPTIONS[id]}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
