"use client";

// v5.1.0 — always-visible legend for the chart overlays. Sits in the top-right
// corner of any chart (main pane or sub-panel) that draws indicator lines.
// Solves the "which yellow line is EMA20" problem permanently — even before
// the user hovers, the legend names each line and shows its current value
// when the crosshair is over the chart.
//
// Each row is clickable: it deep-links to the corresponding Learn term so a
// curious user can read the full lesson without leaving the indicator they
// were staring at.
//
// v5.1.1 — Super Guppy is a ribbon, not a single line. When super_guppy is
// among the rows we substitute a state chip ("BULL" / "BEAR" / "MIXED") with
// the live trend color in place of the numeric value, and the swatch dot
// becomes the palette's representative color for the current state. The
// `superGuppy` prop carries the (state, colorMode) pair that drives both.

import Link from "next/link";
import {
  INDICATOR_META,
  LINES_BY_TOOL,
  type IndicatorLineId,
} from "@/lib/indicator-meta";
import {
  paletteFor,
  STATE_LABEL,
  type ColorMode,
} from "@/lib/color-mode";
import type { GuppyTrendState } from "@/lib/indicators-guppy";
import type { ChartToolId, IndicatorConfig } from "@/lib/types";

type Props = {
  // Which toggles are currently on. Lines for any off toggle are omitted.
  // Passing undefined renders nothing (used by surfaces that don't toggle
  // overlays, e.g. the read-only HTF chart).
  overlays: IndicatorConfig | undefined;
  // Subset of tools to render. The main Chart passes ["ema", "bb", "vwap"];
  // sub-panels pass their single tool. Restricting here means a sub-panel
  // doesn't accidentally light up rows for overlays it doesn't own.
  tools: ChartToolId[];
  // Current values for each line, keyed by IndicatorLineId. Comes from the
  // hover state — when no hover, the value column is blank but the rows
  // still render (name + color dot only).
  values?: Partial<Record<IndicatorLineId, number>>;
  // When set, that row is highlighted (matches the hover-tooltip "closest
  // line" so the same line gets emphasis in both places).
  highlightId?: IndicatorLineId | null;
  // Used to position the legend inside its parent container. The chart
  // always has position:relative; this component is absolutely positioned.
  className?: string;
  // v5.1.1 — Super Guppy needs a state-aware color + a chip. Undefined when
  // super_guppy is off, in which case the row is omitted entirely.
  superGuppy?: { state: GuppyTrendState; colorMode: ColorMode };
};

export default function ChartLegend({
  overlays,
  tools,
  values,
  highlightId,
  className,
  superGuppy,
}: Props) {
  if (!overlays) return null;
  const rows: IndicatorLineId[] = [];
  for (const tool of tools) {
    if (!overlays[tool]) continue;
    for (const id of LINES_BY_TOOL[tool]) rows.push(id);
  }
  if (rows.length === 0) return null;

  return (
    <div
      className={`absolute top-2 right-2 z-10 pointer-events-auto bg-panel/85 backdrop-blur-sm border border-line rounded-md px-2 py-1.5 text-[11px] space-y-0.5 ${className ?? ""}`}
      role="list"
      aria-label="Visible indicators"
    >
      {rows.map((id) => {
        const meta = INDICATOR_META[id];
        const value = values?.[id];
        const isHighlight = highlightId === id;

        // v5.1.1 — Super Guppy row has special rendering. Dot color is the
        // current trend palette's representative; "value" column is a chip.
        if (id === "super_guppy" && superGuppy) {
          const palette = paletteFor(superGuppy.colorMode, superGuppy.state);
          const stateLabel = STATE_LABEL[superGuppy.state];
          return (
            <Link
              key={id}
              href={`/learn?term=${meta.learnTermId}`}
              className={`flex items-center gap-1.5 leading-tight rounded px-1 -mx-1 hover:bg-panel2 transition-colors ${
                isHighlight ? "bg-panel2 ring-1 ring-accent/50" : ""
              }`}
              title={meta.oneLine}
              role="listitem"
            >
              <span
                aria-hidden
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: palette.representative }}
              />
              <span className="font-medium text-text">{meta.name}</span>
              <span
                className="font-mono font-bold ml-1 px-1 rounded text-[10px]"
                style={{
                  background: `${palette.representative}33`,
                  color: palette.representative,
                }}
              >
                {stateLabel}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={id}
            href={`/learn?term=${meta.learnTermId}`}
            className={`flex items-center gap-1.5 leading-tight rounded px-1 -mx-1 hover:bg-panel2 transition-colors ${
              isHighlight ? "bg-panel2 ring-1 ring-accent/50" : ""
            }`}
            title={meta.oneLine}
            role="listitem"
          >
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: meta.color }}
            />
            <span className="font-medium text-text">{meta.name}</span>
            {value != null && (
              <span className="font-mono text-muted ml-1">
                {meta.format(value)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
