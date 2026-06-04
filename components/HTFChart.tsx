"use client";

// v2.2 — Higher-timeframe thumbnail rendered beside the main practice chart.
// Compact version of Chart.tsx: no scroll/zoom controls, no price lines, just
// candles + a vertical marker at the decision-point candle. Caption underneath
// names the timeframe and what the marker represents.

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

type Props = {
  candles: Candle[];
  decisionIndex: number;
  timeframe: string;
  height?: number;
};

function toSeriesData(candles: Candle[]): CandlestickData<UTCTimestamp>[] {
  return candles.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export default function HTFChart({ candles, decisionIndex, timeframe, height = 180 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const updateMarkerRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0b0f17" },
        textColor: "#8b97b1",
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
      },
      rightPriceScale: { borderColor: "#2a3654" },
      crosshair: { mode: CrosshairMode.Hidden },
      // HTF is a context view, not interactive. Lock everything.
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      updateMarkerRef.current();
    });

    const onResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        updateMarkerRef.current();
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    series.setData(toSeriesData(candles));
    chart.timeScale().fitContent();

    const updateMarker = () => {
      const el = markerRef.current;
      if (!el || candles.length === 0) {
        if (el) el.style.display = "none";
        return;
      }
      const idx = Math.max(0, Math.min(decisionIndex, candles.length - 1));
      const t = candles[idx].time as UTCTimestamp;
      const x = chart.timeScale().timeToCoordinate(t);
      if (x != null) {
        el.style.left = `${x}px`;
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    };
    updateMarkerRef.current = updateMarker;
    updateMarker();
  }, [candles, decisionIndex]);

  return (
    <div className="space-y-1">
      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height }} />
        <div
          ref={markerRef}
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ display: "none", borderLeft: "1px dashed rgba(79,140,255,0.7)" }}
        />
        <div className="absolute top-1.5 left-1.5 z-10 text-[10px] uppercase tracking-wide pointer-events-none">
          <span className="bg-panel2/80 border border-line text-muted px-1.5 py-0.5 rounded">
            {timeframe} — higher timeframe
          </span>
        </div>
      </div>
      <p className="text-[10px] text-muted leading-snug px-0.5">
        The dashed line is where you are on the main chart. Look here first to check the broader
        trend before zooming in.
      </p>
    </div>
  );
}
