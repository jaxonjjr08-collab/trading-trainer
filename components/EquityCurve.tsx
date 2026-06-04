// v2.6 — Dashboard equity curve. SVG line chart compounding the user's
// outcome.pnlPercent across saved attempts. Theme-adaptive: colors come
// from CSS variables so dark/light flip without rebuild.
//
// Variants:
//   "card" (default) — bordered panel + header strip with current/peak/DD.
//                       Used standalone (older callers, journal, etc.).
//   "hero"           — just the chart. The caller renders the title row.
//                       Used in the new Dashboard CompoundingHero.

import type { EquitySummary } from "@/lib/equity";

const W = 720;
const H = 220;
const PADL = 56;
const PADR = 16;
const PADT = 20;
const PADB = 24;

// Use CSS variables so the chart re-renders on theme flip without a key change.
const COLOR = {
  good: "var(--good)",
  bad: "var(--bad)",
  muted: "var(--muted)",
  bg: "var(--bg)",
};

function fmtUsd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtDelta(current: number, starting: number): string {
  const pct = ((current - starting) / starting) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

type Variant = "card" | "hero";

export default function EquityCurve({
  summary,
  variant = "card",
}: {
  summary: EquitySummary;
  variant?: Variant;
}) {
  const { points, starting, current, peak, maxDrawdownPct } = summary;

  const innerW = W - PADL - PADR;
  const innerH = H - PADT - PADB;

  const yMin = Math.min(starting * 0.4, ...points.map((p) => p.equity));
  const yMaxRaw = Math.max(peak * 1.1, starting * 1.5, ...points.map((p) => p.equity));
  const yMax = yMaxRaw;
  const yRange = Math.max(1, yMax - yMin);

  const yFor = (v: number) => PADT + innerH - ((v - yMin) / yRange) * innerH;
  const N = points.length;
  const xFor = (i: number) => PADL + (N <= 1 ? innerW / 2 : (i / (N - 1)) * innerW);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.equity).toFixed(1)}`)
    .join(" ");

  const aboveBaseline = current >= starting;
  const fillColor = aboveBaseline ? COLOR.good : COLOR.bad;
  const baselineY = yFor(starting);
  const areaPath =
    N > 0
      ? `${linePath} L ${xFor(N - 1).toFixed(1)} ${baselineY.toFixed(1)} L ${xFor(0).toFixed(1)} ${baselineY.toFixed(1)} Z`
      : "";

  const ticks: Array<{ value: number; label: string; color: string }> = [
    { value: starting, label: fmtUsd(starting), color: COLOR.muted },
  ];
  if (peak > starting * 1.02) {
    ticks.push({ value: peak, label: fmtUsd(peak), color: COLOR.good });
  }

  const chart = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full h-auto ${variant === "card" ? "rounded-md border border-line" : ""}`}
      role="img"
      aria-label="Simulated equity curve"
    >
      {/* Background pin'd to the theme bg so it doesn't punch a hole when the
          chart sits inside a card. */}
      <rect x={0} y={0} width={W} height={H} fill={variant === "card" ? COLOR.bg : "transparent"} />

      {ticks.map((tick, i) => {
        const y = yFor(tick.value);
        return (
          <g key={`tick${i}`}>
            <line
              x1={PADL}
              x2={W - PADR}
              y1={y}
              y2={y}
              stroke={tick.color}
              strokeOpacity={0.2}
              strokeDasharray={tick.value === starting ? "4 4" : undefined}
            />
            <text
              x={PADL - 6}
              y={y + 4}
              textAnchor="end"
              fill={tick.color}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {tick.label}
            </text>
          </g>
        );
      })}

      {N > 0 && <path d={areaPath} fill={fillColor} fillOpacity={0.08} />}

      {N > 0 && (
        <path
          d={linePath}
          fill="none"
          stroke={fillColor}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {N > 0 && (
        <circle
          cx={xFor(N - 1)}
          cy={yFor(points[N - 1].equity)}
          r={4}
          fill={fillColor}
          stroke={COLOR.bg}
          strokeWidth={2}
        />
      )}
    </svg>
  );

  if (variant === "hero") {
    return chart;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted">Simulated equity</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold font-mono tab-nums">{fmtUsd(current)}</span>
            <span
              className={`text-sm font-mono font-semibold ${
                aboveBaseline ? "text-good" : "text-bad"
              }`}
            >
              {fmtDelta(current, starting)}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted ml-auto flex gap-4">
          <span>
            Peak <span className="text-text font-mono tab-nums">{fmtUsd(peak)}</span>
          </span>
          <span>
            Max DD <span className="text-bad font-mono tab-nums">−{maxDrawdownPct.toFixed(1)}%</span>
          </span>
          <span>
            {summary.tradeCount} trade{summary.tradeCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {chart}

      <p className="text-[10px] text-muted leading-snug">
        Simulated by compounding each attempt's outcome at your stated risk %. Decision quality only — fees, funding, and slippage are not modeled.
      </p>
    </div>
  );
}
