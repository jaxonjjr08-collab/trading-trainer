"use client";

// v5.8.1 — Tiny inline price-over-time sparkline used in the symbol tabs.
// Renders an SVG polyline scaled to the available box. Color picks up
// from a `tone` prop so the parent can drive bull/bear/neutral.
//
// Designed to be cheap to render at small sizes — no axes, no gridlines,
// no labels. The whole point is "what shape has the recent price drawn"
// at a glance. Renders nothing for inputs with fewer than 2 closes.

import { useMemo } from "react";

type Props = {
  closes: number[];
  width?: number;
  height?: number;
  tone?: "bull" | "bear" | "neutral";
  // Optional opacity for the fill area under the line. 0 disables fill.
  fillOpacity?: number;
};

const TONE_COLORS = {
  bull: { line: "rgb(34,197,94)", fill: "rgba(34,197,94,0.18)" },
  bear: { line: "rgb(239,68,68)", fill: "rgba(239,68,68,0.18)" },
  neutral: { line: "rgb(148,163,184)", fill: "rgba(148,163,184,0.12)" },
} as const;

export default function Sparkline({
  closes,
  width = 64,
  height = 22,
  tone,
  fillOpacity = 1,
}: Props) {
  const path = useMemo(() => {
    if (closes.length < 2) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const c of closes) {
      if (c < min) min = c;
      if (c > max) max = c;
    }
    // Avoid divide-by-zero on a perfectly flat series — center the line.
    const range = max - min || 1;
    const stepX = width / (closes.length - 1);
    // Leave 1px of padding top/bottom so the line doesn't graze the edge.
    const yPad = 1;
    const usableH = height - yPad * 2;
    const points: string[] = [];
    for (let i = 0; i < closes.length; i++) {
      const x = i * stepX;
      const y = yPad + usableH - ((closes[i] - min) / range) * usableH;
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return {
      polyline: points.join(" "),
      // Closed polygon for the fill area: same points + drop to baseline +
      // back to start at baseline.
      polygon:
        points.join(" ") +
        ` ${width},${height} 0,${height}`,
    };
  }, [closes, width, height]);

  const effectiveTone: "bull" | "bear" | "neutral" =
    tone ??
    (closes.length >= 2
      ? closes[closes.length - 1] > closes[0]
        ? "bull"
        : closes[closes.length - 1] < closes[0]
        ? "bear"
        : "neutral"
      : "neutral");
  const colors = TONE_COLORS[effectiveTone];

  if (!path) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(148,163,184,0.3)"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} aria-hidden className="block">
      {fillOpacity > 0 && (
        <polygon
          points={path.polygon}
          fill={colors.fill}
          fillOpacity={fillOpacity}
        />
      )}
      <polyline
        points={path.polyline}
        fill="none"
        stroke={colors.line}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
