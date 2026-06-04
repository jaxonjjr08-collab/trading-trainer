"use client";

// v5.1.0 — floating tooltip that follows the cursor and identifies whichever
// indicator line it's nearest to. When the cursor is close enough to a
// specific line (within ~14px vertically; configured in Chart.tsx), this
// surfaces the line's name, current value, one-sentence meaning, and a deep
// link to the full Learn term. When no line is in proximity, it falls back to
// a compact list of every visible overlay's current value so the user still
// sees the readings without having to mouse-aim at thin lines.
//
// Positioned absolutely inside the chart container (which is position:relative
// by construction). The horizontal flip-to-left logic keeps the tooltip on
// screen when the cursor is near the right edge of the chart.
//
// v5.1.1 — Super Guppy gets a custom headline card: state chip + the meaning
// sentence appropriate to the current trend state, palette-colored dot. The
// numeric "value" never shows for Super Guppy because the reading is the
// ribbon's relationship, not any one EMA's price.

import Link from "next/link";
import { INDICATOR_META, type IndicatorLineId } from "@/lib/indicator-meta";
import {
  paletteFor,
  STATE_LABEL,
  STATE_MEANING,
  type ColorMode,
} from "@/lib/color-mode";
import type { GuppyTrendState } from "@/lib/indicators-guppy";

type Row = {
  id: IndicatorLineId;
  value: number;
};

type Props = {
  x: number;
  y: number;
  // Cursor-nearest line, if any. When set, this line gets the "headline" card
  // treatment (color dot + name + value + one-line meaning + Learn link).
  closestId: IndicatorLineId | null;
  // Every overlay with a value at the hovered bar — used to render the
  // compact "other readings" list under the headline (or as the primary
  // content when closestId is null).
  rows: Row[];
  // Width of the chart container; drives the right-edge flip so the tooltip
  // doesn't get clipped on the right side. Falls back to a sensible default
  // when undefined, but every caller in practice has a measured width.
  containerWidth: number;
  // v5.1.1 — When super_guppy is in play, the headline branches to render a
  // state chip + state-meaning sentence. Undefined when the ribbon is off.
  superGuppy?: { state: GuppyTrendState; colorMode: ColorMode };
};

const TOOLTIP_WIDTH = 240;
const X_OFFSET = 14;
const Y_OFFSET = 14;

export default function ChartHoverTooltip({
  x,
  y,
  closestId,
  rows,
  containerWidth,
  superGuppy,
}: Props) {
  // Nothing to say if every visible overlay was in warmup at the hovered bar.
  if (rows.length === 0 && !closestId) return null;

  // Flip to the left of the cursor when we'd overflow the container's right
  // edge. The Y position stays below the cursor by Y_OFFSET unless that would
  // run off the bottom — left to CSS clamp via max-height in practice.
  const flipLeft = x + X_OFFSET + TOOLTIP_WIDTH > containerWidth;
  const left = flipLeft ? x - X_OFFSET - TOOLTIP_WIDTH : x + X_OFFSET;
  const top = y + Y_OFFSET;
  const headline = closestId ? INDICATOR_META[closestId] : null;
  const headlineRow = closestId ? rows.find((r) => r.id === closestId) : null;
  // Other rows shown beneath the headline (or as the primary list when no
  // headline). Limited to 5 to keep the tooltip compact on EMA+BB+VWAP days
  // where 7 lines are on screen at once.
  const otherRows = (closestId
    ? rows.filter((r) => r.id !== closestId)
    : rows
  ).slice(0, 6);

  const isSuperGuppyHeadline =
    closestId === "super_guppy" && superGuppy !== undefined;
  const palette = superGuppy
    ? paletteFor(superGuppy.colorMode, superGuppy.state)
    : null;

  return (
    <div
      className="absolute z-20 pointer-events-auto bg-panel border border-line rounded-md shadow-xl text-xs"
      style={{ left, top, width: TOOLTIP_WIDTH }}
      role="tooltip"
    >
      {headline && (
        <div className="p-2 border-b border-line">
          {isSuperGuppyHeadline && palette && superGuppy ? (
            <>
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: palette.representative }}
                />
                <span className="font-semibold text-text">{headline.name}</span>
                <span
                  className="font-mono font-bold ml-auto px-1.5 rounded text-[10px]"
                  style={{
                    background: `${palette.representative}33`,
                    color: palette.representative,
                  }}
                >
                  {STATE_LABEL[superGuppy.state]}
                </span>
              </div>
              <p className="text-[11px] text-muted mt-1 leading-snug">
                {STATE_MEANING[superGuppy.state]}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: headline.color }}
                />
                <span className="font-semibold text-text">{headline.name}</span>
                {headlineRow && (
                  <span className="font-mono text-muted ml-auto">
                    {headline.format(headlineRow.value)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1 leading-snug">
                {headline.oneLine}
              </p>
            </>
          )}
          <Link
            href={`/learn?term=${headline.learnTermId}`}
            className="inline-block mt-1.5 text-[11px] font-semibold text-accent hover:underline"
          >
            Learn more →
          </Link>
        </div>
      )}
      {otherRows.length > 0 && (
        <div className="p-2 space-y-0.5">
          {!headline && (
            <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
              Visible indicators
            </div>
          )}
          {otherRows.map((row) => {
            const meta = INDICATOR_META[row.id];
            // Super Guppy in the secondary list: show the state chip, not
            // the numeric price. The cursor isn't near the ribbon but the
            // user still wants to know the trend reading at a glance.
            if (row.id === "super_guppy" && superGuppy) {
              const pal = paletteFor(superGuppy.colorMode, superGuppy.state);
              return (
                <div key={row.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: pal.representative }}
                  />
                  <span className="text-text">{meta.name}</span>
                  <span
                    className="font-mono font-bold ml-auto px-1 rounded text-[10px]"
                    style={{
                      background: `${pal.representative}33`,
                      color: pal.representative,
                    }}
                  >
                    {STATE_LABEL[superGuppy.state]}
                  </span>
                </div>
              );
            }
            return (
              <div key={row.id} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: meta.color }}
                />
                <span className="text-text">{meta.name}</span>
                <span className="font-mono text-muted ml-auto">
                  {meta.format(row.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
