"use client";

// v5.9.6 — Pattern catalogue. One card per pattern the live chart's "Patterns"
// toggle can flag, each with a worked MiniChart example, a direction chip, and
// the same plain-English meaning the chart tooltip uses. Reuses the existing
// MiniChart renderer and the labels/meanings from lib/candle-patterns.ts so the
// study page and the live chart speak with one voice.

import MiniChart from "@/components/MiniChart";
import type { ChartCandle, ChartSpec, ChartTone } from "@/lib/learn-charts";
import {
  patternLabel,
  patternMeaning,
  type CandlePatternDirection,
  type CandlePatternKind,
} from "@/lib/candle-patterns";

// Local candle builder (mirrors lib/learn-charts' private helper). Each step
// gives a close plus optional wick extensions above/below the body.
function build(
  start: number,
  steps: Array<{ c: number; wH?: number; wL?: number }>
): ChartCandle[] {
  const out: ChartCandle[] = [];
  let o = start;
  for (const s of steps) {
    const c = s.c;
    const h = Math.max(o, c) + (s.wH ?? 0);
    const l = Math.min(o, c) - (s.wL ?? 0);
    out.push({ o, h, l, c });
    o = c;
  }
  return out;
}

const DIRECTION: Record<CandlePatternKind, CandlePatternDirection> = {
  doji: "neutral",
  hammer: "bull",
  shooting_star: "bear",
  bullish_engulfing: "bull",
  bearish_engulfing: "bear",
  inside_bar: "neutral",
};

function toneFor(dir: CandlePatternDirection): ChartTone {
  return dir === "bull" ? "good" : dir === "bear" ? "bad" : "muted";
}

// Worked example per pattern: a few context candles plus the pattern itself,
// marked. Indices match the candle the marker should sit on.
const SPECS: Record<CandlePatternKind, ChartSpec> = {
  doji: {
    candles: build(100, [
      { c: 104, wH: 1, wL: 1 },
      { c: 108, wH: 1, wL: 1 },
      { c: 112, wH: 1, wL: 1 },
      { c: 112, wH: 4, wL: 4 },
    ]),
    markers: [{ candleIndex: 3, price: 116.5, tone: "muted", label: "Doji" }],
  },
  hammer: {
    candles: build(120, [
      { c: 116, wH: 1, wL: 1 },
      { c: 112, wH: 1, wL: 1 },
      { c: 108, wH: 1, wL: 1 },
      { c: 109, wH: 0.5, wL: 9 },
    ]),
    markers: [{ candleIndex: 3, price: 98.5, tone: "good", label: "Hammer" }],
  },
  shooting_star: {
    candles: build(100, [
      { c: 104, wH: 1, wL: 1 },
      { c: 108, wH: 1, wL: 1 },
      { c: 112, wH: 1, wL: 1 },
      { c: 111, wH: 9, wL: 0.5 },
    ]),
    markers: [{ candleIndex: 3, price: 121.5, tone: "bad", label: "Shooting Star" }],
  },
  bullish_engulfing: {
    candles: build(120, [
      { c: 116, wH: 1, wL: 1 },
      { c: 112, wH: 1, wL: 1 },
      { c: 110, wH: 1, wL: 1 },
      { c: 114, wH: 1, wL: 1 },
    ]),
    markers: [{ candleIndex: 3, price: 99, tone: "good", label: "Engulfs the red" }],
  },
  bearish_engulfing: {
    candles: build(100, [
      { c: 104, wH: 1, wL: 1 },
      { c: 108, wH: 1, wL: 1 },
      { c: 110, wH: 1, wL: 1 },
      { c: 106, wH: 1, wL: 1 },
    ]),
    markers: [{ candleIndex: 3, price: 112, tone: "bad", label: "Engulfs the green" }],
  },
  inside_bar: {
    candles: build(100, [
      { c: 104, wH: 1, wL: 1 },
      { c: 110, wH: 3, wL: 3 },
      { c: 107, wH: 1, wL: 1 },
      { c: 108, wH: 1, wL: 1 },
    ]),
    markers: [{ candleIndex: 2, price: 104, tone: "muted", label: "Inside the prior bar" }],
  },
};

// Display order: single-candle shapes first (simplest), then the two-candle
// reversals, then the consolidation pattern.
const ORDER: CandlePatternKind[] = [
  "doji",
  "hammer",
  "shooting_star",
  "bullish_engulfing",
  "bearish_engulfing",
  "inside_bar",
];

const DIR_LABEL: Record<CandlePatternDirection, string> = {
  bull: "Bullish",
  bear: "Bearish",
  neutral: "Indecision",
};

export default function PatternCatalogue() {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-lg font-bold">Pattern catalogue</h3>
        <span className="text-[11px] text-muted">
          The six shapes the chart flags
        </span>
      </div>
      <p className="text-xs text-muted leading-snug mb-4 max-w-2xl">
        These are the patterns the live chart marks when you turn on the
        Patterns tool. A pattern is only a hint — it carries weight at a level
        or after a clear run, and means little in the middle of chop.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ORDER.map((kind) => {
          const dir = DIRECTION[kind];
          const tone =
            dir === "bull"
              ? "border-good/40"
              : dir === "bear"
              ? "border-bad/40"
              : "border-line";
          const chipClass =
            dir === "bull"
              ? "bg-good/15 text-good"
              : dir === "bear"
              ? "bg-bad/15 text-bad"
              : "bg-panel2 text-muted";
          return (
            <div
              key={kind}
              className={`rounded-md border ${tone} bg-panel p-3 flex flex-col`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-bold">{patternLabel(kind)}</span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${chipClass}`}
                >
                  {DIR_LABEL[dir]}
                </span>
              </div>
              <div className="rounded border border-line bg-panel2 overflow-hidden">
                <MiniChart spec={SPECS[kind]} />
              </div>
              <p className="text-xs text-text leading-snug mt-2">
                {patternMeaning(kind)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
