"use client";

// v4.0.2 — small lightweight-charts instance that renders an oscillator
// (RSI or MACD) below the main Practice chart. Each sub-panel is its own
// chart because lightweight-charts v4 doesn't ship native panes; we trade
// pan-sync for simplicity. Data is fit-to-content on every render, so the
// initial view always lines up with the main chart's fit.
//
// v5.1.0 — sub-panels get the same hover treatment the main pane does. The
// crosshair subscription reports the closest line by pixel distance; the
// legend (top-right) names each series with its color swatch and current
// value; the tooltip explains what the reading means. RSI and MACD now
// answer "which line is this and what's it saying?" without leaving the
// chart.

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  HistogramData,
  IChartApi,
  ISeriesApi,
  LineData,
  MouseEventParams,
  UTCTimestamp,
} from "lightweight-charts";
import type { Candle, ChartToolId } from "@/lib/types";
import { macd, rsi } from "@/lib/indicators";
import {
  INDICATOR_COLORS,
  INDICATOR_META,
  type IndicatorLineId,
} from "@/lib/indicator-meta";
import ChartLegend from "@/components/practice/ChartLegend";
import ChartHoverTooltip from "@/components/practice/ChartHoverTooltip";

type Props = {
  kind: "rsi" | "macd";
  candles: Candle[];
  height?: number;
};

// Re-exported from indicator-meta so the line color, the legend swatch, and
// the actual drawn line all come from one source. Aliased to the old local
// names to keep the existing call sites short.
const RSI_COLOR = INDICATOR_COLORS.rsi;
const RSI_OB_OS_COLOR = "rgba(239,68,68,0.4)";
const MACD_LINE_COLOR = INDICATOR_COLORS.macd_line;
const MACD_SIGNAL_COLOR = INDICATOR_COLORS.macd_signal;
const MACD_HIST_UP_COLOR = INDICATOR_COLORS.macd_hist_up;
const MACD_HIST_DOWN_COLOR = INDICATOR_COLORS.macd_hist_down;

type HoverRow = { id: IndicatorLineId; value: number };
type HoverState = {
  x: number;
  y: number;
  rows: HoverRow[];
  closestId: IndicatorLineId | null;
};

export default function IndicatorSubChart({ kind, candles, height = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // Same shape as Chart.tsx's seriesMetaRef — maps each series instance to
  // its IndicatorLineId so the crosshair handler can resolve hover targets.
  const seriesMetaRef = useRef<Map<ISeriesApi<"Line" | "Histogram">, IndicatorLineId>>(
    new Map()
  );
  const [hover, setHover] = useState<HoverState | null>(null);

  // Mount once per (kind, height). Switching kind would mean re-creating series
  // anyway, so just rebuild the chart — keeps the effect simple.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0b0f17" },
        textColor: "#94a3b8",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "#1a2336" },
        horzLines: { color: "#1a2336" },
      },
      timeScale: {
        borderColor: "#2a3654",
        timeVisible: true,
        secondsVisible: false,
        // The main chart already shows time labels right above us; hiding them
        // here removes visual clutter when the two panels stack.
        visible: false,
      },
      rightPriceScale: { borderColor: "#2a3654" },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
    });

    if (kind === "rsi") {
      const line = chart.addLineSeries({
        color: RSI_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.createPriceLine({
        price: 70,
        color: RSI_OB_OS_COLOR,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "70",
      });
      line.createPriceLine({
        price: 30,
        color: RSI_OB_OS_COLOR,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "30",
      });
      // Pin the visible range to 0..100 so the warmup (no data) and post-warmup
      // surfaces have stable axis labels.
      line.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: 0, maxValue: 100 },
        }),
      });
      lineRef.current = line;
      seriesMetaRef.current.set(line, "rsi");
    } else {
      // Order matters: histogram first so the lines render above the bars.
      const hist = chart.addHistogramSeries({
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const line = chart.addLineSeries({
        color: MACD_LINE_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const signal = chart.addLineSeries({
        color: MACD_SIGNAL_COLOR,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // Zero line so the histogram has an anchor for "where am I against the
      // signal" without the user having to mentally interpolate.
      line.createPriceLine({
        price: 0,
        color: "rgba(148,163,184,0.4)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
      histRef.current = hist;
      lineRef.current = line;
      signalRef.current = signal;
      seriesMetaRef.current.set(line, "macd_line");
      seriesMetaRef.current.set(signal, "macd_signal");
      seriesMetaRef.current.set(hist, "macd_hist");
    }

    chartRef.current = chart;

    // v5.1.0 — crosshair handler. RSI: at most one line so closestId is
    // either "rsi" or null. MACD: three series (line, signal, histogram);
    // pick the closest by pixel distance using the line/signal price-axis
    // for proximity (the histogram doesn't have a meaningful "closest by Y"
    // since it's a bar, so we just include its value in the rows list).
    const PROXIMITY_PX = 16;
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.point || param.time == null) {
        setHover(null);
        return;
      }
      const rows: HoverRow[] = [];
      let closest: { id: IndicatorLineId; dist: number } | null = null;
      const cursorY = param.point.y;
      for (const [series, id] of seriesMetaRef.current.entries()) {
        const v = param.seriesData.get(series);
        if (!v || typeof (v as { value?: number }).value !== "number") continue;
        const numeric = (v as { value: number }).value;
        rows.push({ id, value: numeric });
        // Only line series have a meaningful priceToCoordinate for "closest";
        // the histogram is rendered as bars from zero, so we omit it from
        // proximity selection. Users still see its value in the rows list.
        if (id === "macd_hist") continue;
        const lineSeries = series as ISeriesApi<"Line">;
        const y = lineSeries.priceToCoordinate(numeric);
        if (y != null) {
          const dist = Math.abs(y - cursorY);
          if (!closest || dist < closest.dist) closest = { id, dist };
        }
      }
      setHover({
        x: param.point.x,
        y: param.point.y,
        rows,
        closestId: closest && closest.dist <= PROXIMITY_PX ? closest.id : null,
      });
    });

    const onResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      lineRef.current = null;
      signalRef.current = null;
      histRef.current = null;
      seriesMetaRef.current.clear();
      setHover(null);
    };
  }, [kind, height]);

  // Recompute and push series data when candles change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (kind === "rsi") {
      const line = lineRef.current;
      if (!line) return;
      const values = rsi(candles, 14);
      const data: LineData<UTCTimestamp>[] = [];
      for (let i = 0; i < candles.length; i++) {
        const v = values[i];
        if (v != null) data.push({ time: candles[i].time as UTCTimestamp, value: v });
      }
      line.setData(data);
    } else {
      const line = lineRef.current;
      const signal = signalRef.current;
      const hist = histRef.current;
      if (!line || !signal || !hist) return;
      const series = macd(candles, 12, 26, 9);
      const macdData: LineData<UTCTimestamp>[] = [];
      const signalData: LineData<UTCTimestamp>[] = [];
      const histData: HistogramData<UTCTimestamp>[] = [];
      for (let i = 0; i < candles.length; i++) {
        const t = candles[i].time as UTCTimestamp;
        const m = series.macd[i];
        const s = series.signal[i];
        const h = series.histogram[i];
        if (m != null) macdData.push({ time: t, value: m });
        if (s != null) signalData.push({ time: t, value: s });
        if (h != null) {
          histData.push({
            time: t,
            value: h,
            color: h >= 0 ? MACD_HIST_UP_COLOR : MACD_HIST_DOWN_COLOR,
          });
        }
      }
      hist.setData(histData);
      line.setData(macdData);
      signal.setData(signalData);
    }
    chart.timeScale().fitContent();
  }, [kind, candles]);

  // Sub-panel legend always renders for the panel's own tool — there's only
  // ever one toggle here so the legend reflects what's drawn unconditionally.
  // Faked-IndicatorConfig pattern keeps ChartLegend's API stable across the
  // main pane and sub-panels.
  const legendOverlays = {
    ema: false,
    rsi: kind === "rsi",
    macd: kind === "macd",
    bb: false,
    vwap: false,
    // v5.1.1 — Super Guppy lives on the main pane only; this faked config
    // always reports it as off so the sub-panel legend never tries to render
    // a state chip it has no business knowing about.
    super_guppy: false,
    chris_guppy: false,
    // v5.2.0 — same reasoning for Keltner + Pivots: they're main-pane only.
    keltner: false,
    pivots: false,
    // v5.2.2 — patterns render as candle-series markers; sub-panel never
    // hosts those.
    patterns: false,
  };
  const legendTools: ChartToolId[] = [kind];
  const hoverValues: Partial<Record<IndicatorLineId, number>> = {};
  if (hover) {
    for (const row of hover.rows) hoverValues[row.id] = row.value;
  }
  // The hover tooltip belongs in the same container as the chart so its
  // absolute positioning lines up with the cursor coordinates the crosshair
  // handler reports.
  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" style={{ height }} />
      <ChartLegend
        overlays={legendOverlays}
        tools={legendTools}
        values={hoverValues}
        highlightId={hover?.closestId ?? null}
      />
      {hover && (
        <ChartHoverTooltip
          x={hover.x}
          y={hover.y}
          closestId={hover.closestId}
          rows={hover.rows}
          containerWidth={containerRef.current?.clientWidth ?? 800}
        />
      )}
    </div>
  );
}

// Render-helper export: the legend already names each kind (RSI / MACD line /
// signal / histogram) via INDICATOR_META, so the previous top-left "RSI (14)"
// caption is now redundant. Kept the symbol so any older surface that imports
// it doesn't break — the legend supersedes it.
export const SUB_PANEL_LABELS = {
  rsi: INDICATOR_META.rsi.name,
  macd: INDICATOR_META.macd_line.name.replace(" line", ""),
};
