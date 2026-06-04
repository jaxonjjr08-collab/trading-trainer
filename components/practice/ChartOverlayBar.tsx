"use client";

// v4.0.2 — compact toggle row for the chart-overlay indicators. Sits between
// PracticeFilters and the chart. Session-local state — the persisted "default
// overlays" live in Settings; toggling here doesn't write back. Lets users
// experiment per scenario without changing their default.
//
// v4.1.7 — a "?" button opens ChartToolsHelp with worked examples for each
// indicator. Previously the toggles had only a title attribute, which most
// beginners never discover.

import { useState } from "react";
import ChartToolsHelp from "./ChartToolsHelp";
import { CHART_TOOL_LABELS, type ChartToolId, type IndicatorConfig } from "@/lib/types";

// v5.1.1 — Super Guppy slots in at the end. Trend ribbons are visually
// heavier than the existing five tools, so the toggle deserves its own slot
// rather than being grouped with EMA.
// v5.2.0 — Keltner sits next to Bollinger (channel siblings). Pivots last;
// they're the most distinct visually (horizontal lines, not a moving curve).
const ORDER: ChartToolId[] = [
  "ema",
  "bb",
  "keltner",
  "vwap",
  "rsi",
  "macd",
  "super_guppy",
  "pivots",
  // v5.2.2 — candle patterns at the end. Different category (marker overlay,
  // not a line/band), distinct from the price-derived indicators.
  "patterns",
];

const SHORT_LABEL: Record<ChartToolId, string> = {
  ema: "EMA",
  bb: "BB",
  vwap: "VWAP",
  rsi: "RSI",
  macd: "MACD",
  super_guppy: "Guppy",
  keltner: "Keltner",
  pivots: "Pivots",
  patterns: "Patterns",
};

export default function ChartOverlayBar({
  value,
  onChange,
}: {
  value: IndicatorConfig;
  onChange: (next: IndicatorConfig) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted uppercase tracking-wide text-[10px] mr-1">
          Indicators
        </span>
        {ORDER.map((id) => {
          const on = value[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...value, [id]: !on })}
              title={CHART_TOOL_LABELS[id]}
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                on
                  ? "bg-accent/20 border-accent/60 text-accent"
                  : "bg-panel2 border-line text-muted hover:text-text"
              }`}
              aria-pressed={on}
            >
              {SHORT_LABEL[id]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          title="What do these mean?"
          aria-label="Open chart-tools reference"
          className="ml-1 w-6 h-6 rounded-full border border-line bg-panel2 text-muted hover:border-accent/60 hover:text-accent text-[11px] font-bold leading-none flex items-center justify-center"
        >
          ?
        </button>
      </div>
      <ChartToolsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
