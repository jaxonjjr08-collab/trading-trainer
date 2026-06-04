"use client";

// v5.2.1 — Inline overlay shown after the two-click measure handshake
// completes on a chart. Renders a compact card showing price delta, percent,
// candle count, time delta, and implied R. Color-coded by direction using
// the active palette so colorblind users get accessible signal.
//
// Positioned absolutely inside the chart container by the parent (Chart.tsx
// passes pixel x/y so the box appears next to the second-click position).
// Dismissed via the "✕" close button or by hitting Escape (Chart.tsx owns
// the keyboard handling and just clears the measurement state).

import type { MeasureStats } from "@/lib/measure";
import { paletteFor, type ColorMode } from "@/lib/color-mode";

type Props = {
  x: number;
  y: number;
  stats: MeasureStats;
  containerWidth: number;
  colorMode: ColorMode;
  onClose: () => void;
};

const BOX_WIDTH = 200;
const X_OFFSET = 14;
const Y_OFFSET = 14;

export default function MeasureOverlay({
  x,
  y,
  stats,
  containerWidth,
  colorMode,
  onClose,
}: Props) {
  // Pick the trend palette so the BULL/BEAR chip matches the rest of the
  // trainer's direction coloring.
  const trendState =
    stats.direction === "bull"
      ? "bull"
      : stats.direction === "bear"
      ? "bear"
      : "neutral";
  const palette = paletteFor(colorMode, trendState);

  const flipLeft = x + X_OFFSET + BOX_WIDTH > containerWidth;
  const left = flipLeft ? x - X_OFFSET - BOX_WIDTH : x + X_OFFSET;
  const top = y + Y_OFFSET;

  const pctSign = stats.pricePct >= 0 ? "+" : "";
  const priceSign = stats.priceDelta >= 0 ? "+" : "";
  const rSign =
    stats.impliedR == null ? "" : stats.impliedR >= 0 ? "+" : "";

  return (
    <div
      className="absolute z-20 pointer-events-auto bg-panel border-2 rounded-md shadow-2xl text-xs"
      style={{
        left,
        top,
        width: BOX_WIDTH,
        borderColor: palette.representative,
      }}
      role="dialog"
      aria-label="Measurement"
    >
      <div
        className="flex items-center justify-between px-2 py-1 border-b border-line"
        style={{ background: `${palette.representative}22` }}
      >
        <span
          className="font-mono font-bold text-[11px]"
          style={{ color: palette.representative }}
        >
          📐 {pctSign}
          {stats.pricePct.toFixed(2)}%
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close measurement"
          className="text-muted hover:text-text text-[14px] leading-none px-1"
        >
          ✕
        </button>
      </div>
      <div className="p-2 space-y-0.5">
        <Row
          label="Price"
          value={`${priceSign}${formatPrice(stats.priceDelta)}`}
        />
        <Row label="Bars" value={`${stats.candleCount}`} />
        <Row label="Time" value={stats.timeLabel} />
        {stats.impliedR != null && (
          <Row label="If entry → target" value={`${rSign}${stats.impliedR.toFixed(2)}R`} />
        )}
      </div>
      <div className="px-2 pb-1.5 text-[10px] text-muted leading-snug">
        R assumes 1% risk anchor. Esc to dismiss.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-text">{value}</span>
    </div>
  );
}

// Mirrors lib/indicator-meta's priceFormat so the measure overlay shows
// prices the same way the tooltip + legend do (thousands-separated above
// 1000, two decimals below).
function formatPrice(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return v.toFixed(2);
}
