"use client";

// v4.1.7 — Quick reference modal for the indicator toggle bar. Opens from a
// "?" button beside the Indicators row; closes on Escape, outside-click, or
// the explicit Close button. Each tool gets a short definition + a tiny
// MiniChart example reused from lib/learn-charts (CHART_SPECS).
//
// Deliberately a modal, not inline help, because the bar is already dense
// and stuffing five expandable popovers next to small buttons would crowd
// the chart. Click the link in each card to jump to the full Learn term.

import { useEffect } from "react";
import Link from "next/link";
import MiniChart from "../MiniChart";
import { CHART_SPECS } from "@/lib/learn-charts";
import { CHART_TOOL_LABELS, type ChartToolId } from "@/lib/types";
import { useFocusRestore } from "@/lib/use-focus-restore";

type ToolEntry = {
  id: ChartToolId;
  chartKey: string;   // key into CHART_SPECS
  learnTermId: string; // /learn?term=<id>
  oneLine: string;
  whatItTells: string;
};

const ENTRIES: ToolEntry[] = [
  {
    id: "ema",
    chartKey: "ema",
    learnTermId: "ema",
    oneLine: "Exponential Moving Averages (20/50/200) — recent-weighted smoothed price.",
    whatItTells:
      "Price above the EMA = stronger than its recent average. The 20 is short-term, 50 is medium, 200 is the long-term trend reference.",
  },
  {
    id: "bb",
    chartKey: "bollinger_bands",
    learnTermId: "bollinger_bands",
    oneLine: "Bollinger Bands — SMA(20) with bands ±2 standard deviations.",
    whatItTells:
      "Wide bands mean high volatility; squeezed bands mean a move is loading. Closes outside the band are 'extended,' not automatic signals.",
  },
  {
    id: "vwap",
    chartKey: "vwap",
    learnTermId: "vwap",
    oneLine: "VWAP — volume-weighted average price, anchored to the start of the chart.",
    whatItTells:
      "Where the average buyer is. Above VWAP, buyers are in profit; below, sellers are. Often acts as dynamic support/resistance.",
  },
  {
    id: "rsi",
    chartKey: "rsi",
    learnTermId: "rsi",
    oneLine: "RSI (14) — momentum oscillator from 0–100, shown in a sub-panel.",
    whatItTells:
      "Over 70 = overbought, under 30 = oversold (but in a strong trend both can stay there for a while). Divergence with price is the higher-quality signal.",
  },
  {
    id: "macd",
    chartKey: "macd",
    learnTermId: "macd",
    oneLine: "MACD (12/26/9) — fast EMA minus slow EMA, plus a signal line and histogram.",
    whatItTells:
      "Histogram crossing zero = the two EMAs just crossed. Direction + size of bars show momentum building or fading.",
  },
  {
    id: "super_guppy",
    chartKey: "super_guppy",
    learnTermId: "super_guppy",
    oneLine:
      "Super Guppy — 24 EMAs in two color-coded ribbons (short 3–25, long 28–61).",
    whatItTells:
      "Ribbon color flips with the trend: every short EMA above every long = uptrend (blue or green), below = downtrend (orange or red), interleaving = mixed (gray/amber). Trend visualizer, not a signal — bull color doesn't mean buy. Switch palettes in Settings → Chart colors if green/red is hard to read.",
  },
  {
    id: "keltner",
    chartKey: "keltner",
    learnTermId: "keltner",
    oneLine:
      "Keltner Channels — EMA(20) midline ± 2 × ATR(10).",
    whatItTells:
      "ATR-based envelope. Width tracks volatility differently than Bollinger: Keltner widens during strong trends; Bollinger narrows during low-volatility squeezes and expands on the breakout. Both teach 'extended' moves, but reading them together is more informative than either alone.",
  },
  {
    id: "pivots",
    chartKey: "pivot_points",
    learnTermId: "pivot_points",
    oneLine:
      "Pivot Points — five horizontal levels (P + R1/R2 + S1/S2) derived from a reference window.",
    whatItTells:
      "Classic floor-trader pivots. The trainer anchors them to the first ~25% of the visible candles (treating that range as the 'reference period'). Markets often respect these levels because every other trader sees them too — self-fulfilling support/resistance.",
  },
  {
    id: "patterns",
    chartKey: "patterns",
    learnTermId: "candle_patterns",
    oneLine:
      "Candle patterns — auto-detected markers for Doji, Hammer, Shooting Star, Engulfing, Inside Bar.",
    whatItTells:
      "Pattern recognition is foundational. Hammer + long lower wick after a downtrend = sellers rejected the lows. Engulfing = aggressive control shift in the engulfing direction. Inside bar = compression; trend often resumes on breakout. Markers are conservative — only the cleanest examples flag, so the lesson is recognising them in real charts.",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChartToolsHelp({ open, onClose }: Props) {
  useFocusRestore(open);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // Prevent the body from scrolling while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-tools-help-title"
    >
      <div
        className="relative w-full max-w-3xl bg-panel border border-line rounded-md shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 p-4 border-b border-line">
          <div>
            <h2 id="chart-tools-help-title" className="text-lg font-bold">
              Chart tools — quick reference
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Toggle these on the chart. Each one is described below with a worked example.
              Open the full Learn term for the deeper read.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted hover:text-text text-xs uppercase tracking-wider border border-line rounded px-2 py-1"
          >
            Close
          </button>
        </header>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {ENTRIES.map((e) => {
            const spec = CHART_SPECS[e.chartKey];
            return (
              <div
                key={e.id}
                className="rounded-md border border-line bg-panel2 p-3 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-accent font-semibold">
                      {CHART_TOOL_LABELS[e.id]}
                    </div>
                    <div className="text-sm font-semibold mt-0.5">{e.oneLine}</div>
                  </div>
                </div>
                {spec && (
                  <div className="rounded border border-line bg-panel p-1.5">
                    <MiniChart spec={spec} />
                  </div>
                )}
                <p className="text-xs text-muted leading-snug">{e.whatItTells}</p>
                <Link
                  href={`/learn?term=${e.learnTermId}`}
                  onClick={onClose}
                  className="inline-block text-[11px] font-semibold text-accent hover:underline"
                >
                  Read the full lesson →
                </Link>
              </div>
            );
          })}
        </div>

        <footer className="p-3 border-t border-line text-[11px] text-muted">
          Indicators describe what already happened; they don't predict. Use them to make a thesis reviewable later, not to find magic entries.
        </footer>
      </div>
    </div>
  );
}
