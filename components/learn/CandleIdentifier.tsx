"use client";

// v5.9.6 — Interactive Candle Identifier. The beginner shapes a single candle
// with three sliders (body size, upper wick, lower wick) and a direction
// toggle, and the tool names the shape live and explains it. Quick-jump
// presets load the canonical shapes. Reuses lib/candle-anatomy.ts for the
// classification so the labels match what the live chart's pattern detector
// would call the same shape.

import { useMemo, useState } from "react";
import {
  classifyCandle,
  type CandleDirection,
} from "@/lib/candle-anatomy";

type Preset = {
  label: string;
  body: number;
  upper: number;
  lower: number;
  direction: CandleDirection;
};

// Raw weights (not percentages) — they're normalised to fractions of the
// bar's range, so any combination is valid and every shape is reachable.
const PRESETS: Preset[] = [
  { label: "Doji", body: 4, upper: 48, lower: 48, direction: "bull" },
  { label: "Hammer", body: 20, upper: 5, lower: 75, direction: "bull" },
  { label: "Shooting Star", body: 20, upper: 75, lower: 5, direction: "bear" },
  { label: "Spinning Top", body: 20, upper: 40, lower: 40, direction: "bull" },
  { label: "Marubozu", body: 100, upper: 2, lower: 2, direction: "bull" },
  { label: "Strong bull", body: 70, upper: 12, lower: 18, direction: "bull" },
  { label: "Strong bear", body: 70, upper: 18, lower: 12, direction: "bear" },
];

const COLORS = {
  bull: "#22c55e",
  bear: "#ef4444",
  flat: "#8b97b1",
  guide: "#8b97b1",
};

export default function CandleIdentifier() {
  const [body, setBody] = useState(50);
  const [upper, setUpper] = useState(18);
  const [lower, setLower] = useState(18);
  const [direction, setDirection] = useState<CandleDirection>("bull");

  // Normalise the three raw weights to fractions of a 0..100 price range.
  const { candle, anatomy } = useMemo(() => {
    const total = body + upper + lower || 1;
    const upperWick = (upper / total) * 100;
    const lowerWick = (lower / total) * 100;
    const bodyTop = 100 - upperWick;
    const bodyBottom = lowerWick;
    // Direction decides whether the open or the close sits at the body's top.
    const open = direction === "bull" ? bodyBottom : bodyTop;
    const close = direction === "bull" ? bodyTop : bodyBottom;
    const c = { open, high: 100, low: 0, close };
    return { candle: c, anatomy: classifyCandle(c) };
  }, [body, upper, lower, direction]);

  function applyPreset(p: Preset) {
    setBody(p.body);
    setUpper(p.upper);
    setLower(p.lower);
    setDirection(p.direction);
  }

  const dirColor =
    anatomy.direction === "bull"
      ? COLORS.bull
      : anatomy.direction === "bear"
      ? COLORS.bear
      : COLORS.flat;

  return (
    <div className="rounded-md border border-line bg-panel p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-lg font-bold">Candle identifier</h3>
        <span className="text-[11px] text-muted">
          Shape a candle — see what it's called
        </span>
      </div>
      <p className="text-xs text-muted leading-snug mb-4 max-w-2xl">
        Every candle is a body (open→close) plus two wicks (the high and low it
        touched). Drag the sliders or tap a preset and watch the name change.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
        {/* ── The candle ── */}
        <div className="rounded-md border border-line bg-panel2 p-2">
          <CandleDiagram candle={candle} color={dirColor} />
        </div>

        {/* ── Controls + read-out ── */}
        <div className="space-y-4 min-w-0">
          {/* Presets */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
              Quick shapes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-line bg-panel2 text-muted hover:text-text hover:border-accent/50 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction toggle */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
              Direction
            </div>
            <div className="inline-flex rounded-md border border-line overflow-hidden">
              <button
                type="button"
                onClick={() => setDirection("bull")}
                className={`text-xs font-semibold px-3 py-1.5 ${
                  direction === "bull"
                    ? "bg-good/20 text-good"
                    : "bg-panel2 text-muted hover:text-text"
                }`}
              >
                ▲ Bullish (green)
              </button>
              <button
                type="button"
                onClick={() => setDirection("bear")}
                className={`text-xs font-semibold px-3 py-1.5 border-l border-line ${
                  direction === "bear"
                    ? "bg-bad/20 text-bad"
                    : "bg-panel2 text-muted hover:text-text"
                }`}
              >
                ▼ Bearish (red)
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-2.5">
            <SliderRow label="Body size" value={body} onChange={setBody} />
            <SliderRow label="Upper wick" value={upper} onChange={setUpper} />
            <SliderRow label="Lower wick" value={lower} onChange={setLower} />
          </div>
        </div>
      </div>

      {/* ── Live identification ── */}
      <div
        className="mt-4 rounded-md border p-3"
        style={{ borderColor: `${dirColor}66`, background: `${dirColor}14` }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            This candle is a
          </span>
          <span className="text-base font-bold" style={{ color: dirColor }}>
            {anatomy.label}
          </span>
          <span
            className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: `${dirColor}22`, color: dirColor }}
          >
            {anatomy.direction === "flat" ? "no clear direction" : anatomy.direction}
          </span>
        </div>
        <p className="text-xs text-text leading-snug mt-1.5">{anatomy.meaning}</p>
        <div className="text-[10px] font-mono text-muted mt-2 flex gap-3 flex-wrap">
          <span>body {Math.round(anatomy.bodyFraction * 100)}%</span>
          <span>upper wick {Math.round(anatomy.upperWickFraction * 100)}%</span>
          <span>lower wick {Math.round(anatomy.lowerWickFraction * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-text">{label}</span>
        <span className="text-[10px] font-mono text-muted">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </label>
  );
}

// Big labeled candle. Price runs 0..100 over a fixed pixel box; we draw the
// wick, the body, dashed guides for high/low/open/close, and side brackets
// for the three anatomy parts.
function CandleDiagram({
  candle,
  color,
}: {
  candle: { open: number; high: number; low: number; close: number };
  color: string;
}) {
  const W = 260;
  const H = 320;
  const padT = 18;
  const padB = 18;
  const innerH = H - padT - padB;
  const cx = 96; // candle center x — leaves room for left labels
  const halfBody = 26;

  const yFor = (p: number) => padT + (1 - p / 100) * innerH;

  const yHigh = yFor(candle.high);
  const yLow = yFor(candle.low);
  const yOpen = yFor(candle.open);
  const yClose = yFor(candle.close);
  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyH = Math.max(2, bodyBottom - bodyTop);

  // Right-side bracket x.
  const bx = cx + halfBody + 14;

  const Bracket = ({
    y1,
    y2,
    label,
  }: {
    y1: number;
    y2: number;
    label: string;
  }) => {
    if (Math.abs(y2 - y1) < 2) return null;
    const mid = (y1 + y2) / 2;
    return (
      <g>
        <line x1={bx} x2={bx} y1={y1} y2={y2} stroke={COLORS.guide} strokeWidth={1} opacity={0.6} />
        <line x1={bx} x2={bx - 4} y1={y1} y2={y1} stroke={COLORS.guide} strokeWidth={1} opacity={0.6} />
        <line x1={bx} x2={bx - 4} y1={y2} y2={y2} stroke={COLORS.guide} strokeWidth={1} opacity={0.6} />
        <text x={bx + 6} y={mid + 3} fill={COLORS.guide} fontSize={10} fontFamily="ui-sans-serif, system-ui">
          {label}
        </text>
      </g>
    );
  };

  const PriceLabel = ({ y, text }: { y: number; text: string }) => (
    <g>
      <line x1={cx - halfBody - 6} x2={20} y1={y} y2={y} stroke={COLORS.guide} strokeWidth={0.75} strokeDasharray="3 3" opacity={0.5} />
      <text x={18} y={y + 3} fill={COLORS.guide} fontSize={10} fontFamily="ui-monospace, monospace" textAnchor="end">
        {text}
      </text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Labeled candle diagram">
      {/* Price guides on the left */}
      <PriceLabel y={yHigh} text="High" />
      <PriceLabel y={yLow} text="Low" />
      {/* Open/Close labels (only when the body is tall enough to separate). */}
      {Math.abs(yOpen - yClose) > 10 && (
        <>
          <PriceLabel y={yOpen} text="Open" />
          <PriceLabel y={yClose} text="Close" />
        </>
      )}

      {/* Wick */}
      <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={2} />
      {/* Body */}
      <rect
        x={cx - halfBody}
        y={bodyTop}
        width={halfBody * 2}
        height={bodyH}
        fill={color}
        fillOpacity={0.85}
        stroke={color}
        strokeWidth={1.5}
        rx={2}
      />

      {/* Right-side anatomy brackets */}
      <Bracket y1={yHigh} y2={bodyTop} label="upper wick" />
      <Bracket y1={bodyTop} y2={bodyBottom} label="body" />
      <Bracket y1={bodyBottom} y2={yLow} label="lower wick" />
    </svg>
  );
}
