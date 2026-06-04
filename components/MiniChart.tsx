import type { ChartSpec, ChartSubPanel, ChartTone } from "@/lib/learn-charts";

const TONE_COLOR: Record<ChartTone, string> = {
  good: "#22c55e",
  bad: "#ef4444",
  warn: "#f59e0b",
  accent: "#4f8cff",
  muted: "#8b97b1",
};

const W = 720;
// v4.0.1 — height grows when sub-panels are present so the price pane
// doesn't get squeezed. Base 280; each sub-panel adds 90.
const BASE_H = 280;
const SUBPANEL_H = 90;
const SUBPANEL_GAP = 8;
const PADL = 16;
const PADR = 150;
const PADT = 16;
const PADB = 24;

export default function MiniChart({ spec }: { spec: ChartSpec }) {
  const subPanels = spec.subPanels ?? [];
  const H = BASE_H + subPanels.length * (SUBPANEL_H + SUBPANEL_GAP);

  // Price-pane geometry (only the top BASE_H slot).
  const priceInnerW = W - PADL - PADR;
  const priceInnerH = BASE_H - PADT - PADB;

  // Compute y range from everything that lives in the price pane:
  // candles, level lines, zones, markers, indicator lines, band envelopes.
  const values: number[] = [];
  for (const k of spec.candles) values.push(k.h, k.l);
  for (const l of spec.levels ?? []) values.push(l.price);
  for (const z of spec.zones ?? []) values.push(z.from, z.to);
  for (const m of spec.markers ?? []) values.push(m.price);
  for (const ln of spec.lines ?? []) {
    for (const v of ln.values) if (v != null && Number.isFinite(v)) values.push(v);
  }
  for (const b of spec.bands ?? []) {
    for (const v of b.upper) if (Number.isFinite(v)) values.push(v);
    for (const v of b.lower) if (Number.isFinite(v)) values.push(v);
    if (b.middle) for (const v of b.middle) if (Number.isFinite(v)) values.push(v);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.08 || 1;
  const yMin = min - pad;
  const yMax = max + pad;

  const yFor = (p: number) =>
    PADT + priceInnerH - ((p - yMin) / (yMax - yMin)) * priceInnerH;
  const N = spec.candles.length;
  const slot = priceInnerW / N;
  const xFor = (i: number) => PADL + slot * (i + 0.5);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
      role="img"
      aria-label="Illustrative chart"
    >
      <rect x={0} y={0} width={W} height={H} fill="#0b0f17" />

      {(spec.zones ?? []).map((z, i) => {
        const y1 = yFor(Math.max(z.from, z.to));
        const y2 = yFor(Math.min(z.from, z.to));
        const color = TONE_COLOR[z.tone];
        return (
          <g key={`z${i}`}>
            <rect
              x={PADL}
              y={y1}
              width={priceInnerW}
              height={Math.max(1, y2 - y1)}
              fill={color}
              fillOpacity={0.1}
            />
            {z.label && (
              <text
                x={PADL + 8}
                y={y1 + 14}
                fill={color}
                fontSize={11}
                fontFamily="ui-monospace, monospace"
                opacity={0.95}
              >
                {z.label}
              </text>
            )}
          </g>
        );
      })}

      {/* v4.0.1 — Bollinger-style bands. Filled area between upper and lower
          plus an optional middle line. Drawn behind candles so wicks stay
          legible on top. */}
      {(spec.bands ?? []).map((b, i) => {
        const color = TONE_COLOR[b.tone];
        const upperPath = b.upper
          .map((v, idx) => `${idx === 0 ? "M" : "L"} ${xFor(idx).toFixed(1)} ${yFor(v).toFixed(1)}`)
          .join(" ");
        const lowerReversed = [...b.lower].reverse();
        const offsetIdx = b.lower.length - 1;
        const lowerPath = lowerReversed
          .map((v, idx) => `L ${xFor(offsetIdx - idx).toFixed(1)} ${yFor(v).toFixed(1)}`)
          .join(" ");
        const middlePath = b.middle
          ? b.middle
              .map((v, idx) => `${idx === 0 ? "M" : "L"} ${xFor(idx).toFixed(1)} ${yFor(v).toFixed(1)}`)
              .join(" ")
          : null;
        return (
          <g key={`b${i}`}>
            <path d={`${upperPath} ${lowerPath} Z`} fill={color} fillOpacity={0.1} />
            <path d={upperPath} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
            <path
              d={b.lower
                .map((v, idx) => `${idx === 0 ? "M" : "L"} ${xFor(idx).toFixed(1)} ${yFor(v).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={0.7}
            />
            {middlePath && (
              <path d={middlePath} fill="none" stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.85} />
            )}
            {b.label && (
              <text
                x={PADL + 8}
                y={yFor(b.upper[0]) - 4}
                fill={color}
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}

      {spec.candles.map((k, i) => {
        const cx = xFor(i);
        const yo = yFor(k.o);
        const yc = yFor(k.c);
        const yh = yFor(k.h);
        const yl = yFor(k.l);
        const up = k.c >= k.o;
        const color = up ? TONE_COLOR.good : TONE_COLOR.bad;
        const bodyTop = Math.min(yo, yc);
        const bodyH = Math.max(2, Math.abs(yc - yo));
        const bodyW = Math.max(3, slot * 0.6);
        return (
          <g key={`c${i}`}>
            <line x1={cx} x2={cx} y1={yh} y2={yl} stroke={color} strokeWidth={1.25} />
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
              fillOpacity={0.85}
              stroke={color}
              strokeWidth={1}
            />
          </g>
        );
      })}

      {/* v4.0.1 — Indicator overlay lines on top of candles. Skip null
          values (indicator hasn't warmed up yet) by breaking the path. */}
      {(spec.lines ?? []).map((ln, i) => {
        const color = TONE_COLOR[ln.tone];
        const segments: string[] = [];
        let current: string[] = [];
        ln.values.forEach((v, idx) => {
          if (v == null || !Number.isFinite(v)) {
            if (current.length > 0) {
              segments.push(current.join(" "));
              current = [];
            }
            return;
          }
          current.push(`${current.length === 0 ? "M" : "L"} ${xFor(idx).toFixed(1)} ${yFor(v).toFixed(1)}`);
        });
        if (current.length > 0) segments.push(current.join(" "));
        return (
          <g key={`ln${i}`}>
            {segments.map((d, sidx) => (
              <path
                key={sidx}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={ln.dashed ? "5 3" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {ln.label && (
              <text
                x={W - PADR + 14}
                y={(() => {
                  // Anchor label at the last non-null value's y position.
                  for (let idx = ln.values.length - 1; idx >= 0; idx--) {
                    const v = ln.values[idx];
                    if (v != null && Number.isFinite(v)) return yFor(v) + 4;
                  }
                  return PADT + 10;
                })()}
                fill={color}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {ln.label}
              </text>
            )}
          </g>
        );
      })}

      {(spec.levels ?? []).map((l, i) => {
        const y = yFor(l.price);
        const color = TONE_COLOR[l.tone];
        const dash = l.dashed ? "5 4" : undefined;
        return (
          <g key={`l${i}`}>
            <line
              x1={PADL}
              x2={W - PADR + 4}
              y1={y}
              y2={y}
              stroke={color}
              strokeWidth={1.25}
              strokeDasharray={dash}
              opacity={0.9}
            />
            <rect
              x={W - PADR + 8}
              y={y - 9}
              width={PADR - 16}
              height={18}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeOpacity={0.6}
              strokeWidth={0.75}
              rx={3}
            />
            <text
              x={W - PADR + 14}
              y={y + 4}
              fill={color}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {l.label}
            </text>
          </g>
        );
      })}

      {(spec.markers ?? []).map((m, i) => {
        const x = xFor(m.candleIndex);
        const y = yFor(m.price);
        const color = TONE_COLOR[m.tone];
        return (
          <g key={`m${i}`}>
            <circle cx={x} cy={y} r={5} fill={color} stroke="#0b0f17" strokeWidth={1.5} />
            {m.label && (
              <text
                x={x + 9}
                y={y - 8}
                fill={color}
                fontSize={10.5}
                fontFamily="ui-sans-serif, system-ui"
                fontWeight={600}
              >
                {m.label}
              </text>
            )}
          </g>
        );
      })}

      {/* v4.0.1 — Sub-panels below the price chart for oscillators (RSI) and
          histograms (MACD). Each gets SUBPANEL_H of height with a small gap.
          Renders only if at least one sub-panel is defined. */}
      {subPanels.map((panel, pIdx) => (
        <SubPanel
          key={`sp${pIdx}`}
          panel={panel}
          index={pIdx}
          xFor={xFor}
          priceInnerW={priceInnerW}
        />
      ))}
    </svg>
  );
}

// Sub-panel renderer. Positioned by `index` (0 = first sub-panel just below
// the price pane). Reused for oscillator + histogram via discriminated union.
function SubPanel({
  panel,
  index,
  xFor,
  priceInnerW,
}: {
  panel: ChartSubPanel;
  index: number;
  xFor: (i: number) => number;
  priceInnerW: number;
}) {
  const topY = BASE_H + index * (SUBPANEL_H + SUBPANEL_GAP) + SUBPANEL_GAP;
  const innerH = SUBPANEL_H - PADB - PADT;
  const labelColor = TONE_COLOR.muted;

  if (panel.kind === "oscillator") {
    const yMin = panel.yMin ?? 0;
    const yMax = panel.yMax ?? 100;
    const yFor = (v: number) =>
      topY + PADT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
    const color = TONE_COLOR[panel.tone];
    const segments: string[] = [];
    let current: string[] = [];
    panel.values.forEach((v, idx) => {
      if (v == null || !Number.isFinite(v)) {
        if (current.length > 0) {
          segments.push(current.join(" "));
          current = [];
        }
        return;
      }
      current.push(`${current.length === 0 ? "M" : "L"} ${xFor(idx).toFixed(1)} ${yFor(v).toFixed(1)}`);
    });
    if (current.length > 0) segments.push(current.join(" "));
    return (
      <g>
        <rect x={PADL} y={topY} width={priceInnerW} height={SUBPANEL_H - SUBPANEL_GAP} fill="#0b0f17" stroke="#1a2336" strokeWidth={1} />
        <text x={PADL + 6} y={topY + 12} fill={labelColor} fontSize={10} fontFamily="ui-monospace, monospace">
          {panel.label}
        </text>
        {(panel.thresholds ?? []).map((t, i) => {
          const y = yFor(t);
          return (
            <g key={`th${i}`}>
              <line
                x1={PADL}
                x2={PADL + priceInnerW}
                y1={y}
                y2={y}
                stroke={TONE_COLOR.muted}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text x={PADL + priceInnerW - 22} y={y - 2} fill={TONE_COLOR.muted} fontSize={9} opacity={0.7}>
                {t}
              </text>
            </g>
          );
        })}
        {segments.map((d, sidx) => (
          <path
            key={sidx}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    );
  }

  // Histogram (e.g. MACD)
  const vals = panel.values.filter((v): v is number => v != null && Number.isFinite(v));
  const absMax = vals.length > 0 ? Math.max(...vals.map((v) => Math.abs(v))) : 1;
  const yMid = topY + PADT + innerH / 2;
  const yFor = (v: number) => yMid - (v / absMax) * (innerH / 2);
  const slotW = priceInnerW / panel.values.length;
  const posColor = TONE_COLOR[panel.positiveTone ?? "good"];
  const negColor = TONE_COLOR[panel.negativeTone ?? "bad"];
  return (
    <g>
      <rect x={PADL} y={topY} width={priceInnerW} height={SUBPANEL_H - SUBPANEL_GAP} fill="#0b0f17" stroke="#1a2336" strokeWidth={1} />
      <text x={PADL + 6} y={topY + 12} fill={labelColor} fontSize={10} fontFamily="ui-monospace, monospace">
        {panel.label}
      </text>
      <line
        x1={PADL}
        x2={PADL + priceInnerW}
        y1={yMid}
        y2={yMid}
        stroke={TONE_COLOR.muted}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      {panel.values.map((v, i) => {
        if (v == null || !Number.isFinite(v)) return null;
        const x = xFor(i) - slotW * 0.3;
        const y = v >= 0 ? yFor(v) : yMid;
        const h = Math.max(1, Math.abs(yFor(v) - yMid));
        const color = v >= 0 ? posColor : negColor;
        return (
          <rect
            key={`hb${i}`}
            x={x}
            y={y}
            width={slotW * 0.6}
            height={h}
            fill={color}
            fillOpacity={0.8}
          />
        );
      })}
    </g>
  );
}
