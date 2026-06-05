"use client";

// v4.0.2 — compact toggle row for the chart-overlay indicators. Sits between
// PracticeFilters and the chart. Session-local state — the persisted "default
// overlays" live in Settings; toggling here doesn't write back. Lets users
// experiment per scenario without changing their default.
//
// v4.1.7 — a "?" button opens ChartToolsHelp with worked examples for each
// indicator. Previously the toggles had only a title attribute, which most
// beginners never discover.
//
// v5.9.4 — collapsed into a single "Indicators" dropdown menu. The previous
// inline row of toggles was getting wide enough to wrap on the live chart
// after Chris's Guppy joined the lineup; a dropdown reads cleaner and gives
// each entry room for a settings affordance (Chris's Guppy needs one).

import { useEffect, useRef, useState } from "react";
import ChartToolsHelp from "./ChartToolsHelp";
import ChrisGuppySettings from "./ChrisGuppySettings";
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
  "chris_guppy",
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
  chris_guppy: "Chris's Guppy",
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
  const [chrisOpen, setChrisOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const activeCount = ORDER.filter((id) => value[id]).length;

  return (
    <>
      <div ref={rootRef} className="relative flex items-center gap-1.5 text-xs">
        <span className="text-muted uppercase tracking-wide text-[10px] mr-1">
          Indicators
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
            menuOpen || activeCount > 0
              ? "bg-accent/15 border-accent/50 text-accent"
              : "bg-panel2 border-line text-muted hover:text-text"
          }`}
        >
          <span>Tools</span>
          {activeCount > 0 && (
            <span className="font-mono text-[10px] bg-accent/25 text-accent rounded px-1 leading-none py-0.5">
              {activeCount}
            </span>
          )}
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`w-3 h-3 transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          title="What do these mean?"
          aria-label="Open chart-tools reference"
          className="w-6 h-6 rounded-full border border-line bg-panel2 text-muted hover:border-accent/60 hover:text-accent text-[11px] font-bold leading-none flex items-center justify-center"
        >
          ?
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-2 z-40 w-72 rounded-lg border border-line bg-panel shadow-2xl p-1.5"
          >
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted">
              Chart tools
            </div>
            {ORDER.map((id) => {
              const on = value[id];
              const showGear = id === "chris_guppy";
              return (
                <div
                  key={id}
                  className="flex items-center gap-1 rounded-md hover:bg-panel2"
                >
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => onChange({ ...value, [id]: !on })}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={`inline-flex items-center justify-center w-4 h-4 rounded border text-[10px] font-bold ${
                        on
                          ? "bg-accent border-accent text-white"
                          : "bg-panel2 border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-[12px] font-semibold leading-tight ${
                          on ? "text-accent" : "text-text"
                        }`}
                      >
                        {SHORT_LABEL[id]}
                      </span>
                      <span className="block text-[10px] text-muted leading-tight truncate">
                        {CHART_TOOL_LABELS[id]}
                      </span>
                    </span>
                  </button>
                  {showGear && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChrisOpen(true);
                        setMenuOpen(false);
                      }}
                      title="Configure Chris's Super Guppy"
                      aria-label="Configure Chris's Super Guppy"
                      className="mr-1.5 w-6 h-6 inline-flex items-center justify-center rounded border border-line bg-panel2 text-muted hover:text-accent hover:border-accent/40"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-3.5 h-3.5"
                        aria-hidden
                      >
                        <circle cx="8" cy="8" r="2.2" />
                        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ChartToolsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ChrisGuppySettings
        open={chrisOpen}
        onClose={() => setChrisOpen(false)}
      />
    </>
  );
}
