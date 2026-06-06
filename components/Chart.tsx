"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickData,
  LineData,
  MouseEventParams,
  UTCTimestamp,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import type { Candle, ChartToolId, IndicatorConfig } from "@/lib/types";
import { bollingerBands, emaFull, keltnerChannels, vwap } from "@/lib/indicators";
import { defaultPivotWindow, pivotLevels } from "@/lib/pivot-points";
import {
  addDrawing,
  clearDrawings,
  getDrawings,
  newDrawingId,
  type Drawing,
  type DrawingPoint,
} from "@/lib/drawings";
import {
  detectPatterns,
  patternLabel,
  type CandlePatternKind,
  type DetectedPattern,
} from "@/lib/candle-patterns";
import {
  INDICATOR_COLORS,
  type IndicatorLineId,
} from "@/lib/indicator-meta";
import {
  GUPPY_LONG_PERIODS,
  GUPPY_SHORT_PERIODS,
  computeGuppy,
  guppyTrendStateLatest,
  type GuppyTrendState,
} from "@/lib/indicators-guppy";
import {
  CHRIS_GUPPY_DEFAULTS,
  computeChrisGuppy,
  chrisGuppyStateLatest,
  type ChrisGuppyParams,
} from "@/lib/indicators-chris-guppy";
import { solidColors, paletteFor, type ColorMode } from "@/lib/color-mode";
import { getChrisGuppyParams, getColorMode } from "@/lib/storage";
import ChartLegend from "@/components/practice/ChartLegend";
import ChartHoverTooltip from "@/components/practice/ChartHoverTooltip";
import MeasureOverlay from "@/components/practice/MeasureOverlay";
import { computeMeasure, type MeasureStats } from "@/lib/measure";

export type PriceLine = {
  price: number;
  color: string;
  title: string;
  lineStyle?: "solid" | "dashed" | "dotted";
};

type Props = {
  visible: Candle[];
  hidden?: Candle[];
  revealHidden?: boolean;
  priceLines?: PriceLine[];
  height?: number;
  // v4.0.2 — toggleable indicator overlays. The main-pane overlays (ema, bb,
  // vwap) render directly onto this chart. RSI/MACD live in IndicatorSubChart
  // components below the main chart, so this component only consumes the
  // overlapping subset. Passing undefined or all-false leaves the chart looking
  // exactly as it did in v4.0.1.
  overlays?: IndicatorConfig;
  // v4.1.7 — when false, the chart fits content on mount only. Used by the
  // portfolio simulator where the visible array grows on every "advance time"
  // click — re-fitting each tick was snapping the user's zoom back to default
  // and made manual zoom-in worthless. Practice keeps it true: scenario
  // switches there are full data swaps that should always re-fit.
  autoFit?: boolean;
  // v5.2.0 — When set, user-drawn trendlines on this chart persist under
  // localStorage[trainer.drawings.v1][drawingScopeId]. Pass a stable id
  // per chart instance — Practice uses the active scenario id; the live
  // surfaces pass "live:<symbol>:<granularity>" so the same symbol on
  // different timeframes doesn't bleed annotations across charts.
  // Undefined disables the drawing tool entirely (read-only chart).
  drawingScopeId?: string;
  // v5.2.0 — When set, the next click on the chart starts the tool's
  // gesture. "trendline" + "measure" use a two-click handshake;
  // "horizontal" is single-click (drops a horizontal price line at the
  // clicked price). The parent owns the mode state so a Drawing bar
  // elsewhere can flip it on/off.
  drawingMode?: "trendline" | "measure" | "horizontal" | null;
  // v5.2.0 — Fires after a drawing is added or cleared so the parent
  // (DrawingBar) can update its UI without re-reading localStorage.
  onDrawingsChange?: (drawings: Drawing[]) => void;
  // v5.2.0 — Fires after the trendline-drawing handshake completes so the
  // parent can return drawingMode to null automatically.
  onDrawingComplete?: () => void;
  // v5.2.0 — Increment to signal a parent-side drawing change (e.g. the
  // DrawingBar pressed "Clear all"). Chart compares against its own
  // internal tick and re-runs the drawings sync effect when this changes.
  drawingsRefreshKey?: number;
  // v5.6.5 — When true, hide all rendered drawings without deleting them
  // from storage. Lets users get a clean chart view temporarily and
  // restore everything with one click. Drawings stay persisted under
  // their scope; only the visual render is suppressed.
  drawingsHidden?: boolean;
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

// v5.9.4 — Pick decimal precision based on price magnitude so low-priced
// assets (e.g. 1INCH-USD ~$0.075) don't render as flat slivers when every
// candle rounds to the same 2-decimal value. Returns { precision, minMove }
// shaped for lightweight-charts' priceFormat option. Tracks the smallest
// non-trivial range across the visible window so a coin that ranges from
// $0.0001 to $0.0009 still shows distinct bodies.
function pickPriceFormat(candles: Candle[]): {
  precision: number;
  minMove: number;
} {
  if (candles.length === 0) return { precision: 2, minMove: 0.01 };
  // Use the median-ish "last close" as the magnitude probe — fast and
  // robust against historical outliers.
  const last = candles[candles.length - 1];
  const probe = Math.max(
    Math.abs(last.close),
    Math.abs(last.high),
    Math.abs(last.low)
  );
  let precision: number;
  if (probe >= 1000) precision = 2;
  else if (probe >= 1) precision = 2;
  else if (probe >= 0.1) precision = 4;
  else if (probe >= 0.001) precision = 5;
  else if (probe >= 0.00001) precision = 7;
  else precision = 8;
  const minMove = 1 / Math.pow(10, precision);
  return { precision, minMove };
}

function toLineData(
  candles: Candle[],
  values: (number | null)[]
): LineData<UTCTimestamp>[] {
  const out: LineData<UTCTimestamp>[] = [];
  for (let i = 0; i < candles.length; i++) {
    const v = values[i];
    if (v != null) out.push({ time: candles[i].time as UTCTimestamp, value: v });
  }
  return out;
}

const STYLE_MAP = {
  solid: 0,
  dotted: 1,
  dashed: 2,
} as const;

// v5.2.2 — Map each detected pattern to a chart marker. Subtle colors so a
// chart with many patterns doesn't become a visual mess; the marker is the
// hint, the hover tooltip is the lesson. Position: bullish below the bar
// (so the arrow points up at the candle), bearish above, neutral above.
function patternMarker(
  pattern: DetectedPattern,
  time: number
): SeriesMarker<Time> | null {
  const SHAPES = {
    arrowUp: "arrowUp",
    arrowDown: "arrowDown",
    circle: "circle",
    square: "square",
  } as const;
  const COLORS = {
    bull: "rgba(34,197,94,0.85)",
    bear: "rgba(239,68,68,0.85)",
    neutral: "rgba(148,163,184,0.85)",
  } as const;
  type Cfg = {
    position: "aboveBar" | "belowBar" | "inBar";
    shape: keyof typeof SHAPES;
    color: string;
  };
  const cfg: Record<CandlePatternKind, Cfg> = {
    doji: { position: "aboveBar", shape: "circle", color: COLORS.neutral },
    hammer: { position: "belowBar", shape: "arrowUp", color: COLORS.bull },
    shooting_star: {
      position: "aboveBar",
      shape: "arrowDown",
      color: COLORS.bear,
    },
    bullish_engulfing: {
      position: "belowBar",
      shape: "arrowUp",
      color: COLORS.bull,
    },
    bearish_engulfing: {
      position: "aboveBar",
      shape: "arrowDown",
      color: COLORS.bear,
    },
    inside_bar: {
      position: "aboveBar",
      shape: "square",
      color: COLORS.neutral,
    },
  };
  const c = cfg[pattern.kind];
  if (!c) return null;
  return {
    time: time as UTCTimestamp,
    position: c.position,
    shape: SHAPES[c.shape],
    color: c.color,
    text: patternLabel(pattern.kind),
  };
}

// Overlay colors are owned by lib/indicator-meta.ts so the legend dot, the
// tooltip header, and the line itself can never drift apart. Pulled out into
// locals here just to keep the existing call sites short.
const EMA20_COLOR = INDICATOR_COLORS.ema20;
const EMA50_COLOR = INDICATOR_COLORS.ema50;
const EMA200_COLOR = INDICATOR_COLORS.ema200;
const BB_BAND_COLOR = INDICATOR_COLORS.bb_band;
const BB_MID_COLOR = INDICATOR_COLORS.bb_mid;
const VWAP_COLOR = INDICATOR_COLORS.vwap;

type OverlayMap = {
  ema20?: ISeriesApi<"Line">;
  ema50?: ISeriesApi<"Line">;
  ema200?: ISeriesApi<"Line">;
  bbUpper?: ISeriesApi<"Line">;
  bbMiddle?: ISeriesApi<"Line">;
  bbLower?: ISeriesApi<"Line">;
  vwap?: ISeriesApi<"Line">;
  // v5.1.1 — Super Guppy is 24 line series held as two parallel arrays.
  // Kept off the named-field shape so adding/removing the ribbon doesn't
  // require enumerating 24 keys. When undefined the ribbon is off.
  guppyShort?: ISeriesApi<"Line">[];
  guppyLong?: ISeriesApi<"Line">[];
  // Tracks the (trend state, colorMode) pair the ribbon was last painted
  // for. When either differs from current values we tear the ribbon down
  // and rebuild — lightweight-charts doesn't let us change line colors in
  // place. Skipping the rebuild when neither has changed is the perf win
  // that keeps candle-data updates cheap.
  guppyPaintedState?: GuppyTrendState;
  guppyPaintedColorMode?: ColorMode;
  // v5.9.4 — Chris's Super Guppy: parallel to the stock Guppy state, but
  // sized by user-configurable params.
  chrisFast?: ISeriesApi<"Line">[];
  chrisSlow?: ISeriesApi<"Line">[];
  chrisFastAvg?: ISeriesApi<"Line">;
  chrisSlowAvg?: ISeriesApi<"Line">;
  chrisEma200?: ISeriesApi<"Line">;
  chrisPaintedState?: GuppyTrendState;
  chrisPaintedColorMode?: ColorMode;
  chrisPaintedSignature?: string;
  // v5.2.0 — Keltner Channels mirror Bollinger's three-series shape.
  keltnerUpper?: ISeriesApi<"Line">;
  keltnerMiddle?: ISeriesApi<"Line">;
  keltnerLower?: ISeriesApi<"Line">;
  // v5.2.0 — Pivot Points render as priceLines on the main candle series,
  // not as line series. Tracked as IPriceLine handles so we can remove them
  // when the toggle flips off.
  pivotLines?: IPriceLine[];
  // v5.2.0 — User-drawn trendlines. Each is a tiny 2-point line series; we
  // keep the array alongside the drawing-id so removal can target a single
  // drawing without affecting the rest.
  drawnLines?: Array<{ id: string; series: ISeriesApi<"Line"> }>;
  // v5.2.3 — User-drawn horizontal lines. Render as IPriceLine on the
  // candle series so they span the chart automatically and stay accurate
  // as new candles arrive. Tracked separately from drawnLines so removal
  // can target one or the other.
  drawnHorizontals?: Array<{ id: string; line: IPriceLine }>;
  // v5.6.0 — live preview line for the trendline / measure tools. Shown
  // between point 1 and the current crosshair after the user clicks the
  // first point, so they can see exactly where the line will land before
  // committing point 2. Drawn dashed so it reads as "in progress."
  previewLine?: ISeriesApi<"Line">;
};

// v5.1.0 — hover state surfaced to the tooltip + legend overlays. Lives in
// React state (not a ref) so the overlays re-render as the crosshair moves;
// throttled implicitly by lightweight-charts firing one event per pointer move.
export type HoverRow = {
  id: IndicatorLineId;
  value: number;
};

export type HoverState = {
  // Cursor position in chart-container pixel coordinates. The tooltip uses
  // these to position itself; the legend ignores them.
  x: number;
  y: number;
  // Every overlay that has a value at the hovered bar, in the order the meta
  // registry declares. Drives both the tooltip's secondary rows and the
  // legend's current-value column.
  rows: HoverRow[];
  // The single line closest to the cursor (in pixels). When set, the tooltip
  // foregrounds this line's name + one-liner; otherwise it shows the rows as
  // a compact list. Null when no line is within the proximity threshold.
  closestId: IndicatorLineId | null;
};

export default function Chart({
  visible,
  hidden = [],
  revealHidden = false,
  priceLines = [],
  height = 460,
  overlays,
  autoFit = true,
  drawingScopeId,
  drawingMode = null,
  onDrawingsChange,
  onDrawingComplete,
  drawingsRefreshKey = 0,
  drawingsHidden = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const hiddenSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const overlayRef = useRef<OverlayMap>({});
  // v5.1.0 — parallel map from each overlay series back to its IndicatorLineId.
  // The crosshair handler walks param.seriesData (keyed by ISeriesApi) and uses
  // this to resolve which meta entry to display. Kept as a Map (object identity
  // keys) because ISeriesApi instances are stable across renders within the
  // same chart mount.
  const seriesMetaRef = useRef<Map<ISeriesApi<"Line">, IndicatorLineId>>(
    new Map()
  );
  const decisionLineRef = useRef<HTMLDivElement>(null);
  const updateLineRef = useRef<() => void>(() => {});
  const [hover, setHover] = useState<HoverState | null>(null);
  // v5.2.0 — when a trendline draw is in progress and the first click has
  // landed, this holds (time, price) of point 1; second click on the chart
  // completes the line. Cleared on Escape or after completion.
  // v5.2.1 — also used by the measure tool (same two-click handshake).
  const [pendingFirstPoint, setPendingFirstPoint] =
    useState<DrawingPoint | null>(null);
  // v5.2.1 — completed measurement, shown as an inline overlay until the
  // user closes it (Escape, ✕ button, or starts a new measurement).
  const [measureResult, setMeasureResult] = useState<{
    stats: MeasureStats;
    x: number;
    y: number;
  } | null>(null);
  // v5.6.0 — when the parent toggles drawing off mid-gesture (user clicks
  // the active tool button to deactivate), clear the pending first point
  // and tear down the preview line so a stale dashed line doesn't linger.
  useEffect(() => {
    if (drawingMode === "trendline" || drawingMode === "measure") return;
    setPendingFirstPoint(null);
    const chart = chartRef.current;
    const map = overlayRef.current;
    if (chart && map.previewLine) {
      chart.removeSeries(map.previewLine);
      map.previewLine = undefined;
    }
  }, [drawingMode]);
  // v5.2.0 — increments after addDrawing / clear-from-bar, so the drawings
  // sync effect picks up the change without needing scope or candle inputs
  // to also change.
  const [drawingsVersion, setDrawingsVersion] = useState(0);
  // Latest callbacks/scope captured in refs so the long-lived crosshair +
  // click subscriptions (created once on mount) don't need to be torn down
  // and re-created on every parent re-render.
  const drawingModeRef = useRef(drawingMode);
  drawingModeRef.current = drawingMode;
  const drawingScopeRef = useRef(drawingScopeId);
  drawingScopeRef.current = drawingScopeId;
  const pendingFirstPointRef = useRef<DrawingPoint | null>(null);
  pendingFirstPointRef.current = pendingFirstPoint;
  const onDrawingsChangeRef = useRef(onDrawingsChange);
  onDrawingsChangeRef.current = onDrawingsChange;
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  onDrawingCompleteRef.current = onDrawingComplete;
  // v5.6.4 — re-entry guard for the preview-line setData call. setData on
  // a series whose data sits at the cursor causes lightweight-charts to
  // fire another crosshair-move event; without this flag the handler
  // recurses into itself until the call stack overflows.
  const previewUpdateInFlightRef = useRef(false);
  // v5.2.1 — current candle list (visible + revealed hidden when applicable)
  // so the measure click handler can compute "bars between" without needing
  // to re-subscribe to candle-data prop changes.
  const candleInputsRef = useRef<Candle[]>(visible);
  candleInputsRef.current = revealHidden ? [...visible, ...hidden] : visible;
  // v5.1.1 — color mode + current Super Guppy trend state. The mode is read
  // from localStorage on mount and again whenever the Settings page bumps
  // the value (handled via a "storage" event listener below). Trend state is
  // recomputed in the overlay effect whenever candles or the super_guppy
  // toggle changes — surfaced to the legend chip + tooltip headline.
  const [colorMode, setColorMode] = useState<ColorMode>("colorblind");
  const [guppyState, setGuppyState] = useState<GuppyTrendState>("neutral");
  // v5.9.4 — Chris's Super Guppy params. Read from storage on mount and on
  // the 'trainer:chris-guppy-change' broadcast so the user can tweak
  // settings in the modal and see the ribbon repaint live.
  const [chrisParams, setChrisParams] = useState<ChrisGuppyParams>(
    CHRIS_GUPPY_DEFAULTS
  );
  const [chrisState, setChrisState] = useState<GuppyTrendState>("neutral");
  useEffect(() => {
    setChrisParams(getChrisGuppyParams());
    const reread = () => setChrisParams(getChrisGuppyParams());
    window.addEventListener("storage", reread);
    window.addEventListener("trainer:chris-guppy-change", reread);
    return () => {
      window.removeEventListener("storage", reread);
      window.removeEventListener("trainer:chris-guppy-change", reread);
    };
  }, []);
  useEffect(() => {
    setColorMode(getColorMode());
    // v5.6.6 — three signals can flip the palette:
    //   1. 'storage' event — cross-tab change (another tab edited the key)
    //   2. 'focus' event — window regained focus from another window/app
    //   3. 'trainer:color-mode-change' — SAME-tab change, dispatched by
    //      setColorMode in lib/storage. Without (3) the chart stays on
    //      the old palette when the user navigates Settings → back
    //      without the window ever losing focus — which was the reported
    //      "Super Guppy stays orange even after switching to red/green"
    //      bug.
    const reread = () => setColorMode(getColorMode());
    window.addEventListener("storage", reread);
    window.addEventListener("focus", reread);
    window.addEventListener("trainer:color-mode-change", reread);
    return () => {
      window.removeEventListener("storage", reread);
      window.removeEventListener("focus", reread);
      window.removeEventListener("trainer:color-mode-change", reread);
    };
  }, []);
  // v4.1.7 — tracks whether we've fit the chart at least once. The first fit
  // happens unconditionally so the user always sees data on initial render;
  // subsequent fits are gated on `autoFit`. Resets naturally when the parent
  // forces a remount via the React key prop (e.g. symbol switch on /portfolio).
  const fittedOnceRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0b0f17" },
        textColor: "#e6ecf5",
        fontSize: 12,
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
      crosshair: { mode: CrosshairMode.Normal },
      // Explicit panning + zoom. Defaults are true in lightweight-charts but spelling it
      // out makes the intent clear and protects against future option drift.
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

    const main = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const hiddenSeries = chart.addCandlestickSeries({
      // Slightly desaturated so the revealed future region is visually distinct.
      upColor: "rgba(34,197,94,0.45)",
      downColor: "rgba(239,68,68,0.45)",
      borderUpColor: "rgba(34,197,94,0.45)",
      borderDownColor: "rgba(239,68,68,0.45)",
      wickUpColor: "rgba(34,197,94,0.45)",
      wickDownColor: "rgba(239,68,68,0.45)",
    });

    chartRef.current = chart;
    candleSeriesRef.current = main;
    hiddenSeriesRef.current = hiddenSeries;
    // The chart was just (re)created — any overlay refs from a previous chart
    // instance now point at series that don't exist. Reset them so the overlay
    // effect below treats this as a clean slate.
    overlayRef.current = {};

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      updateLineRef.current();
    });

    // v5.1.0 — crosshair-driven hover state. When the cursor is over the chart,
    // gather each overlay's value at the hovered time, compute pixel distance
    // from the cursor to each line, and surface a HoverState so the tooltip
    // and the legend's "current value" column can render. When the cursor
    // leaves the chart (param.point == null) we clear the state so the tooltip
    // disappears immediately.
    const PROXIMITY_PX = 14;
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.point || param.time == null) {
        setHover(null);
        return;
      }
      const rows: HoverRow[] = [];
      // v5.1.1 — ribbon indicators (Super Guppy = 24 line series, one id)
      // collapse to a single row. We still iterate every series for the
      // proximity check so the cursor can detect "I'm hovering the ribbon"
      // even when it's nearer to a non-median EMA. Dedup happens via this
      // Set on the rows.push path.
      const seenRowIds = new Set<IndicatorLineId>();
      let closest: { id: IndicatorLineId; dist: number } | null = null;
      const cursorY = param.point.y;
      // Iterate the meta registry in declared order so the rows array is
      // always laid out in the same predictable sequence regardless of which
      // series happens to be hit by param.seriesData first.
      for (const [series, id] of seriesMetaRef.current.entries()) {
        const value = param.seriesData.get(series);
        // Lightweight-charts returns LineData ({ time, value }) for line
        // series. Skip series with no datapoint at this time (warmup region).
        if (!value || typeof (value as { value?: number }).value !== "number") {
          continue;
        }
        const numeric = (value as { value: number }).value;
        if (!seenRowIds.has(id)) {
          rows.push({ id, value: numeric });
          seenRowIds.add(id);
        }
        const y = series.priceToCoordinate(numeric);
        if (y != null) {
          const dist = Math.abs(y - cursorY);
          if (!closest || dist < closest.dist) {
            closest = { id, dist };
          }
        }
      }
      setHover({
        x: param.point.x,
        y: param.point.y,
        rows,
        closestId: closest && closest.dist <= PROXIMITY_PX ? closest.id : null,
      });

      // v5.6.0 — preview line for in-progress trendline / measure draws.
      // When point 1 has been clicked and the cursor moves, update the
      // preview line series's data so the user sees where the line will
      // land BEFORE clicking the second point. Created lazily and cleaned
      // up when the gesture completes (cleared in the click handler /
      // Escape handler).
      const mode = drawingModeRef.current;
      const first = pendingFirstPointRef.current;
      // v5.6.4 — re-entry guard. setData on a line series whose data sits
      // under the cursor causes lightweight-charts to fire another
      // crosshair-move event (the data at the cursor changed). Without
      // this flag, the handler recurses into itself until the call stack
      // explodes — exactly the "Maximum call stack size exceeded" error
      // reported on /paper-trading.
      if (
        first &&
        (mode === "trendline" || mode === "measure") &&
        candleSeriesRef.current &&
        !previewUpdateInFlightRef.current
      ) {
        const cursorPrice = candleSeriesRef.current.coordinateToPrice(
          param.point.y
        );
        if (cursorPrice != null) {
          const cursorTime = Number(param.time);
          // v5.6.0 — lightweight-charts requires strictly ascending time on
          // a line series. When the cursor is over the SAME candle as the
          // first-click point, both endpoints would share a timestamp and
          // setData asserts. Skip the update in that case — the previous
          // frame's preview stays on screen until the cursor moves to a
          // different bar, which feels natural to the user.
          if (cursorTime !== first.time) {
            const previewMap = overlayRef.current;
            if (!previewMap.previewLine) {
              previewMap.previewLine = chart.addLineSeries({
                // Mode-specific color: trendline preview matches the final
                // amber line; measure preview uses the accent so it's
                // clearly distinct from a "you're about to commit a line"
                // gesture.
                color: mode === "measure" ? "#06b6d4" : "#f59e0b",
                lineWidth: 1,
                lineStyle: 2, // dashed — "in progress"
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              });
            }
            const a =
              first.time < cursorTime
                ? { t: first.time, p: first.price }
                : { t: cursorTime, p: cursorPrice };
            const b =
              first.time < cursorTime
                ? { t: cursorTime, p: cursorPrice }
                : { t: first.time, p: first.price };
            previewUpdateInFlightRef.current = true;
            try {
              previewMap.previewLine.setData([
                { time: a.t as UTCTimestamp, value: a.p },
                { time: b.t as UTCTimestamp, value: b.p },
              ]);
            } finally {
              previewUpdateInFlightRef.current = false;
            }
          }
        }
      }
    });

    // v5.2.0 — drawing handler. When drawingMode is "trendline" and the user
    // clicks on the chart, we capture (time, price) at the click location.
    // First click stashes point 1; second click completes the line, writes
    // it to localStorage, and notifies the parent. The candle-series's
    // coordinateToPrice converts pixel-y to price; param.time gives us the
    // candle time directly.
    // v5.2.1 — same two-click handshake for the measure tool, but on
    // completion we compute stats and stash them in measureResult instead
    // of persisting a drawing.
    chart.subscribeClick((param: MouseEventParams) => {
      const mode = drawingModeRef.current;
      if (
        mode !== "trendline" &&
        mode !== "measure" &&
        mode !== "horizontal"
      ) {
        return;
      }
      if (!param.point || param.time == null) return;
      const mainSeries = candleSeriesRef.current;
      if (!mainSeries) return;
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price == null) return;
      const time = Number(param.time);
      const point: DrawingPoint = { time, price };
      // v5.2.3 — Horizontal is single-click: persist the line at the
      // clicked price immediately. Skips the pendingFirstPoint state
      // machine entirely.
      if (mode === "horizontal") {
        const scope = drawingScopeRef.current;
        if (!scope) return;
        const drawing: Drawing = {
          id: newDrawingId(),
          type: "horizontal",
          price,
          createdAt: Date.now(),
        };
        const updated = addDrawing(scope, drawing);
        setDrawingsVersion((v) => v + 1);
        onDrawingsChangeRef.current?.(updated);
        onDrawingCompleteRef.current?.();
        return;
      }
      const first = pendingFirstPointRef.current;
      if (!first) {
        // Starting a new measurement clears any previous one — feels more
        // natural than asking the user to dismiss before measuring again.
        if (mode === "measure") setMeasureResult(null);
        setPendingFirstPoint(point);
        return;
      }
      // Second click — guard against zero-length picks (double-click at the
      // same spot would otherwise stamp a useless point or zero-delta box).
      if (first.time === point.time && first.price === point.price) {
        return;
      }
      if (mode === "trendline") {
        const scope = drawingScopeRef.current;
        if (!scope) return;
        const drawing: Drawing = {
          id: newDrawingId(),
          type: "trendline",
          start: first,
          end: point,
          createdAt: Date.now(),
        };
        const updated = addDrawing(scope, drawing);
        setPendingFirstPoint(null);
        removePreviewLine();
        setDrawingsVersion((v) => v + 1);
        onDrawingsChangeRef.current?.(updated);
        onDrawingCompleteRef.current?.();
      } else {
        // mode === "measure"
        const stats = computeMeasure(first, point, candleInputsRef.current);
        setMeasureResult({
          stats,
          x: param.point.x,
          y: param.point.y,
        });
        setPendingFirstPoint(null);
        removePreviewLine();
        // Auto-disarm the tool after a measurement completes — same UX as
        // trendline. The overlay stays visible until the user dismisses it.
        onDrawingCompleteRef.current?.();
      }
    });

    // v5.6.0 — tear down the in-progress preview line. Called on
    // gesture completion, on Escape cancellation, and on unmount.
    const removePreviewLine = () => {
      const previewMap = overlayRef.current;
      if (previewMap.previewLine) {
        chart.removeSeries(previewMap.previewLine);
        previewMap.previewLine = undefined;
      }
    };

    // Escape cancels an in-progress trendline OR dismisses an open
    // measurement overlay — both share the keystroke since both are
    // "active chart interactions" the user might want to back out of.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingFirstPointRef.current) {
        setPendingFirstPoint(null);
        removePreviewLine();
      }
      setMeasureResult(null);
    };
    window.addEventListener("keydown", onKey);

    const onResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        updateLineRef.current();
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      hiddenSeriesRef.current = null;
      linesRef.current = [];
      overlayRef.current = {};
      seriesMetaRef.current.clear();
      setHover(null);
      setPendingFirstPoint(null);
    };
  }, [height]);

  // Update data, price lines, and decision-point marker whenever inputs change.
  useEffect(() => {
    const main = candleSeriesRef.current;
    const hiddenSeries = hiddenSeriesRef.current;
    if (!main || !hiddenSeries) return;

    // v5.9.4 — apply a price-magnitude-aware precision so low-priced
    // coins (e.g. 1INCH at ~$0.075) don't collapse into one rounded level.
    const fmt = pickPriceFormat(
      revealHidden ? [...visible, ...hidden] : visible
    );
    const priceFormat = {
      type: "price" as const,
      precision: fmt.precision,
      minMove: fmt.minMove,
    };
    main.applyOptions({ priceFormat });
    hiddenSeries.applyOptions({ priceFormat });

    main.setData(toSeriesData(visible));
    hiddenSeries.setData(revealHidden ? toSeriesData(hidden) : []);

    // Marker: "future revealed" on first hidden candle only.
    // The decision point is shown via a vertical dotted line instead of an arrow.
    // v5.2.2 — also includes candle-pattern markers when the patterns toggle
    // is on. Markers must be passed in ascending time order; we collect all
    // sources into one array and sort once at the end.
    const markers: SeriesMarker<Time>[] = [];
    if (revealHidden && hidden.length > 0) {
      const first = hidden[0];
      markers.push({
        time: first.time as UTCTimestamp,
        position: "belowBar",
        color: "#f59e0b",
        shape: "arrowUp",
        text: "Future (revealed)",
      });
    }
    if (overlays?.patterns) {
      const combinedForPatterns = revealHidden
        ? [...visible, ...hidden]
        : [...visible];
      const detected = detectPatterns(combinedForPatterns);
      for (const d of detected) {
        const candle = combinedForPatterns[d.candleIndex];
        if (!candle) continue;
        const m = patternMarker(d, candle.time);
        if (m) markers.push(m);
      }
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    main.setMarkers(markers);

    // Vertical decision line: positioned at the last visible candle's x coordinate.
    const updateLine = () => {
      const el = decisionLineRef.current;
      const chart = chartRef.current;
      if (!el || !chart || visible.length === 0) {
        if (el) el.style.display = "none";
        return;
      }
      const lastTime = visible[visible.length - 1].time as UTCTimestamp;
      const x = chart.timeScale().timeToCoordinate(lastTime);
      if (x != null) {
        el.style.left = `${x}px`;
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    };
    updateLineRef.current = updateLine;

    // Remove existing price lines
    for (const line of linesRef.current) main.removePriceLine(line);
    linesRef.current = [];

    for (const pl of priceLines) {
      const created = main.createPriceLine({
        price: pl.price,
        color: pl.color,
        lineWidth: 2,
        lineStyle: STYLE_MAP[pl.lineStyle ?? "solid"],
        axisLabelVisible: true,
        title: pl.title,
      });
      linesRef.current.push(created);
    }

    updateLine();
    // v5.2.2 — overlays added because the patterns toggle drives marker
    // rendering; flipping it on/off needs to re-run setMarkers.
  }, [visible, hidden, revealHidden, priceLines, overlays]);

  // v4.0.2 — overlay lifecycle. Adds/removes line series in response to the
  // overlays config flipping, and recomputes their data when the candle inputs
  // change. Indicators run over visible + (hidden if revealed) so the overlay
  // continues into the post-decision region once the user submits.
  //
  // v5.1.1 — extended for Super Guppy: when the toggle is on, we (re)create 24
  // line series colored by the active palette + current trend state and push
  // their EMA values. The trend state is recomputed at the same time so the
  // legend chip + tooltip headline have the freshest reading.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const map = overlayRef.current;
    const wantEma = overlays?.ema ?? false;
    const wantBb = overlays?.bb ?? false;
    const wantVwap = overlays?.vwap ?? false;
    const wantGuppy = overlays?.super_guppy ?? false;
    const wantChrisGuppy = overlays?.chris_guppy ?? false;
    const wantKeltner = overlays?.keltner ?? false;
    const wantPivots = overlays?.pivots ?? false;
    const combined = revealHidden ? [...visible, ...hidden] : [...visible];

    // Reverse lookup from line key → IndicatorLineId. Centralised here so
    // adding a fourth EMA means changing one row in indicator-meta and one
    // row here, not three. Super Guppy isn't in this map; its 24 series are
    // wired up directly in the ribbon block below.
    type LineKeyInternal =
      | "ema20"
      | "ema50"
      | "ema200"
      | "bbUpper"
      | "bbMiddle"
      | "bbLower"
      | "vwap"
      | "keltnerUpper"
      | "keltnerMiddle"
      | "keltnerLower";
    const META_KEY: Record<LineKeyInternal, IndicatorLineId> = {
      ema20: "ema20",
      ema50: "ema50",
      ema200: "ema200",
      bbUpper: "bb_upper",
      bbMiddle: "bb_middle",
      bbLower: "bb_lower",
      vwap: "vwap",
      keltnerUpper: "keltner_upper",
      keltnerMiddle: "keltner_middle",
      keltnerLower: "keltner_lower",
    };

    const ensureLine = (
      key: LineKeyInternal,
      color: string,
      lineWidth: 1 | 2
    ): ISeriesApi<"Line"> => {
      const existing = map[key];
      if (existing) return existing;
      const series = chart.addLineSeries({
        color,
        lineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      map[key] = series;
      const metaId = META_KEY[key];
      if (metaId) seriesMetaRef.current.set(series, metaId);
      return series;
    };
    const drop = (key: LineKeyInternal) => {
      const existing = map[key];
      if (existing) {
        seriesMetaRef.current.delete(existing);
        chart.removeSeries(existing);
        map[key] = undefined;
      }
    };

    if (wantEma) {
      const ema20 = ensureLine("ema20", EMA20_COLOR, 1);
      const ema50 = ensureLine("ema50", EMA50_COLOR, 1);
      const ema200 = ensureLine("ema200", EMA200_COLOR, 2);
      // v5.9.8 — emaFull so EMA 50/200 still render on short Practice
      // scenarios (15–90 candles) instead of vanishing during warmup.
      ema20.setData(toLineData(combined, emaFull(combined, 20)));
      ema50.setData(toLineData(combined, emaFull(combined, 50)));
      ema200.setData(toLineData(combined, emaFull(combined, 200)));
    } else {
      drop("ema20");
      drop("ema50");
      drop("ema200");
    }

    if (wantBb) {
      const bb = bollingerBands(combined, 20, 2);
      const upper = ensureLine("bbUpper", BB_BAND_COLOR, 1);
      const middle = ensureLine("bbMiddle", BB_MID_COLOR, 1);
      const lower = ensureLine("bbLower", BB_BAND_COLOR, 1);
      upper.setData(toLineData(combined, bb.upper));
      middle.setData(toLineData(combined, bb.middle));
      lower.setData(toLineData(combined, bb.lower));
    } else {
      drop("bbUpper");
      drop("bbMiddle");
      drop("bbLower");
    }

    if (wantVwap) {
      const series = ensureLine("vwap", VWAP_COLOR, 2);
      series.setData(toLineData(combined, vwap(combined)));
    } else {
      drop("vwap");
    }

    // v5.2.0 — Keltner Channels. Same three-line shape as Bollinger but
    // anchored on EMA + ATR; pink palette so the two channel systems read as
    // distinct when both are on.
    if (wantKeltner) {
      const ke = keltnerChannels(combined, 20, 10, 2);
      const upper = ensureLine(
        "keltnerUpper",
        INDICATOR_COLORS.keltner_band,
        1
      );
      const middle = ensureLine(
        "keltnerMiddle",
        INDICATOR_COLORS.keltner_mid,
        1
      );
      const lower = ensureLine(
        "keltnerLower",
        INDICATOR_COLORS.keltner_band,
        1
      );
      upper.setData(toLineData(combined, ke.upper));
      middle.setData(toLineData(combined, ke.middle));
      lower.setData(toLineData(combined, ke.lower));
    } else {
      drop("keltnerUpper");
      drop("keltnerMiddle");
      drop("keltnerLower");
    }

    // v5.2.0 — Pivot Points render as IPriceLine on the main candle series,
    // not as time series. Five horizontal lines: pivot, R1/R2, S1/S2.
    // Tracked separately from `linesRef` (which holds caller-supplied
    // entry/stop/TP lines) so flipping the pivots toggle doesn't disturb
    // user-supplied price lines from the parent.
    const dropPivots = () => {
      const lines = map.pivotLines;
      if (lines && lines.length > 0 && candleSeriesRef.current) {
        for (const pl of lines) candleSeriesRef.current.removePriceLine(pl);
      }
      map.pivotLines = undefined;
    };
    if (wantPivots && candleSeriesRef.current) {
      const main = candleSeriesRef.current;
      const window = defaultPivotWindow(combined.length);
      const levels = pivotLevels(combined, window);
      // Always rebuild — pivot lines are cheap and the levels can shift if
      // the reference window changes (e.g. on a live tick that grows the
      // candle array).
      dropPivots();
      if (levels) {
        const rows: Array<{
          price: number;
          color: string;
          title: string;
          style: 0 | 1 | 2;
        }> = [
          {
            price: levels.pivot,
            color: INDICATOR_COLORS.pivot_p,
            title: "P",
            style: 0,
          },
          {
            price: levels.r1,
            color: INDICATOR_COLORS.pivot_r1,
            title: "R1",
            style: 2,
          },
          {
            price: levels.r2,
            color: INDICATOR_COLORS.pivot_r2,
            title: "R2",
            style: 2,
          },
          {
            price: levels.s1,
            color: INDICATOR_COLORS.pivot_s1,
            title: "S1",
            style: 2,
          },
          {
            price: levels.s2,
            color: INDICATOR_COLORS.pivot_s2,
            title: "S2",
            style: 2,
          },
        ];
        const created: IPriceLine[] = [];
        for (const row of rows) {
          created.push(
            main.createPriceLine({
              price: row.price,
              color: row.color,
              lineWidth: 1,
              lineStyle: row.style,
              axisLabelVisible: true,
              title: row.title,
            })
          );
        }
        map.pivotLines = created;
      }
    } else {
      dropPivots();
    }

    // v5.1.1 — Super Guppy ribbon. 24 line series total (12 short + 12 long).
    // When the toggle flips on, we compute the trend state from the current
    // candles, pick a palette by (colorMode, state), and (re)create the
    // series. When the trend state changes mid-session (e.g. bullish ribbon
    // suddenly goes mixed because shorts crossed below longs), we tear down
    // the ribbon and rebuild — color flips with state, and lightweight-charts
    // doesn't let us change a line's color in place cleanly.
    const dropGuppy = () => {
      const shorts = map.guppyShort;
      const longs = map.guppyLong;
      if (shorts) {
        for (const s of shorts) {
          seriesMetaRef.current.delete(s);
          chart.removeSeries(s);
        }
        map.guppyShort = undefined;
      }
      if (longs) {
        for (const s of longs) {
          seriesMetaRef.current.delete(s);
          chart.removeSeries(s);
        }
        map.guppyLong = undefined;
      }
      map.guppyPaintedState = undefined;
      map.guppyPaintedColorMode = undefined;
    };

    if (wantGuppy) {
      const guppy = computeGuppy(combined);
      const nextState = guppyTrendStateLatest(guppy, combined.length);
      // Repaint when EITHER the trend state OR the color mode has shifted
      // since the ribbon was last drawn — both change line colors and
      // lightweight-charts has no in-place recolor API. Tracked on the
      // overlay map so a sequence of "candles changed but state stayed"
      // updates doesn't unnecessarily destroy + recreate 24 series.
      const needsRepaint =
        !!map.guppyShort &&
        (map.guppyPaintedState !== nextState ||
          map.guppyPaintedColorMode !== colorMode);
      if (needsRepaint) {
        dropGuppy();
      }
      const palette = paletteFor(colorMode, nextState);
      // v5.9.9 — single solid colour for the whole ribbon (was a pale→deep
      // gradient). Every strand is the state's representative colour at 0.7
      // alpha, so overlaps compound into a clean one-hue band that matches the
      // legend chip. The short-vs-long clusters are still distinguishable by
      // their Y-position, just not by colour.
      const RIBBON_ALPHA = 0.7;
      const shortColors = solidColors(
        palette.representative,
        GUPPY_SHORT_PERIODS.length,
        RIBBON_ALPHA
      );
      const longColors = solidColors(
        palette.representative,
        GUPPY_LONG_PERIODS.length,
        RIBBON_ALPHA
      );

      if (!map.guppyShort) {
        const shorts: ISeriesApi<"Line">[] = [];
        for (let i = 0; i < GUPPY_SHORT_PERIODS.length; i++) {
          const s = chart.addLineSeries({
            color: shortColors[i],
            // v5.1.2 — was 1; bumped to 2 so a single line is recognisable
            // as part of a ribbon, not a hairline. lightweight-charts caps
            // at 4; 2 reads as a clean band when the cluster is compressed.
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          seriesMetaRef.current.set(s, "super_guppy");
          shorts.push(s);
        }
        map.guppyShort = shorts;
      }
      if (!map.guppyLong) {
        const longs: ISeriesApi<"Line">[] = [];
        for (let i = 0; i < GUPPY_LONG_PERIODS.length; i++) {
          const s = chart.addLineSeries({
            color: longColors[i],
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          seriesMetaRef.current.set(s, "super_guppy");
          longs.push(s);
        }
        map.guppyLong = longs;
      }

      // Push values into each series. Skipping nulls (toLineData filters
      // them) keeps the warmup region empty rather than producing a
      // misleading "flat" line at 0.
      for (let i = 0; i < GUPPY_SHORT_PERIODS.length; i++) {
        map.guppyShort![i].setData(toLineData(combined, guppy.short[i]));
      }
      for (let i = 0; i < GUPPY_LONG_PERIODS.length; i++) {
        map.guppyLong![i].setData(toLineData(combined, guppy.long[i]));
      }
      // Stamp so the next overlay-effect run knows the current paint matches.
      map.guppyPaintedState = nextState;
      map.guppyPaintedColorMode = colorMode;
      // Only call setGuppyState if it actually changed, otherwise the
      // setState → re-render → effect cycle becomes a per-tick storm on the
      // live-data path. Guarded.
      if (nextState !== guppyState) setGuppyState(nextState);
    } else {
      dropGuppy();
    }

    // v5.9.4 — Chris's Super Guppy. Same shape as the stock Guppy block
    // but the cluster sizes come from chrisParams (fast/slow length), and
    // optional fast/slow average curves + EMA 200 reference render as
    // separate distinguishable lines.
    const dropChris = () => {
      const lists: Array<ISeriesApi<"Line">[] | undefined> = [
        map.chrisFast,
        map.chrisSlow,
      ];
      for (const list of lists) {
        if (!list) continue;
        for (const s of list) {
          seriesMetaRef.current.delete(s);
          chart.removeSeries(s);
        }
      }
      map.chrisFast = undefined;
      map.chrisSlow = undefined;
      if (map.chrisFastAvg) {
        chart.removeSeries(map.chrisFastAvg);
        map.chrisFastAvg = undefined;
      }
      if (map.chrisSlowAvg) {
        chart.removeSeries(map.chrisSlowAvg);
        map.chrisSlowAvg = undefined;
      }
      if (map.chrisEma200) {
        chart.removeSeries(map.chrisEma200);
        map.chrisEma200 = undefined;
      }
      map.chrisPaintedState = undefined;
      map.chrisPaintedColorMode = undefined;
      map.chrisPaintedSignature = undefined;
    };

    if (wantChrisGuppy) {
      const params = chrisParams;
      const guppy = computeChrisGuppy(combined, params);
      const nextState = chrisGuppyStateLatest(
        guppy,
        combined,
        params.filterWith200
      );
      // Signature captures every shape-affecting param so a change to the
      // fast/slow period lists forces a full rebuild (line count changed),
      // while data-only ticks keep the existing series.
      const signature = [
        params.fast.join(","),
        params.slow.join(","),
        params.showAverageCurves ? 1 : 0,
        params.show200 ? 1 : 0,
        params.ema200Length,
        params.source,
      ].join("|");
      const needsRepaint =
        !!map.chrisFast &&
        (map.chrisPaintedState !== nextState ||
          map.chrisPaintedColorMode !== colorMode ||
          map.chrisPaintedSignature !== signature);
      if (needsRepaint) dropChris();

      const palette = paletteFor(colorMode, nextState);
      // v5.9.9 — single solid colour, matching the Super Guppy change above.
      const RIBBON_ALPHA = 0.7;
      const fastColors = solidColors(
        palette.representative,
        params.fast.length,
        RIBBON_ALPHA
      );
      const slowColors = solidColors(
        palette.representative,
        params.slow.length,
        RIBBON_ALPHA
      );

      if (!map.chrisFast) {
        const list: ISeriesApi<"Line">[] = [];
        for (let i = 0; i < params.fast.length; i++) {
          const s = chart.addLineSeries({
            color: fastColors[i],
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          seriesMetaRef.current.set(s, "chris_guppy");
          list.push(s);
        }
        map.chrisFast = list;
      }
      if (!map.chrisSlow) {
        const list: ISeriesApi<"Line">[] = [];
        for (let i = 0; i < params.slow.length; i++) {
          const s = chart.addLineSeries({
            color: slowColors[i],
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          seriesMetaRef.current.set(s, "chris_guppy");
          list.push(s);
        }
        map.chrisSlow = list;
      }
      for (let i = 0; i < params.fast.length; i++) {
        map.chrisFast![i].setData(toLineData(combined, guppy.fast[i]));
      }
      for (let i = 0; i < params.slow.length; i++) {
        map.chrisSlow![i].setData(toLineData(combined, guppy.slow[i]));
      }

      if (params.showAverageCurves && guppy.fastAvg && guppy.slowAvg) {
        if (!map.chrisFastAvg) {
          map.chrisFastAvg = chart.addLineSeries({
            color: palette.shortEnd,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }
        if (!map.chrisSlowAvg) {
          map.chrisSlowAvg = chart.addLineSeries({
            color: palette.longEnd,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }
        map.chrisFastAvg.setData(toLineData(combined, guppy.fastAvg));
        map.chrisSlowAvg.setData(toLineData(combined, guppy.slowAvg));
      } else {
        if (map.chrisFastAvg) {
          chart.removeSeries(map.chrisFastAvg);
          map.chrisFastAvg = undefined;
        }
        if (map.chrisSlowAvg) {
          chart.removeSeries(map.chrisSlowAvg);
          map.chrisSlowAvg = undefined;
        }
      }

      if (params.show200 && guppy.ema200) {
        if (!map.chrisEma200) {
          map.chrisEma200 = chart.addLineSeries({
            color: EMA200_COLOR,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }
        map.chrisEma200.setData(toLineData(combined, guppy.ema200));
      } else if (map.chrisEma200) {
        chart.removeSeries(map.chrisEma200);
        map.chrisEma200 = undefined;
      }

      map.chrisPaintedState = nextState;
      map.chrisPaintedColorMode = colorMode;
      map.chrisPaintedSignature = signature;
      if (nextState !== chrisState) setChrisState(nextState);
    } else {
      dropChris();
    }
  }, [
    overlays,
    visible,
    hidden,
    revealHidden,
    colorMode,
    guppyState,
    chrisParams,
    chrisState,
  ]);

  // v5.2.0 — Drawings sync. Reads the persisted trendlines for the active
  // scope and draws each as a 2-point line series. On scope change (e.g.
  // scenario switch) we tear down the previous chart's lines and load the
  // new scope's. On hot-changes (a click that adds a new drawing, or a
  // clear-all action) the parent calls back into us via the standard
  // overlays effect rerun; we diff against the existing series array and
  // surgically add/remove only what changed.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const map = overlayRef.current;
    // v5.6.5 — drawingsHidden flag forces the same teardown path as "no
    // scope," so toggling the eye-icon hides everything without losing the
    // persisted entries in localStorage. Toggling back re-runs this
    // effect (drawingsHidden is a dep) and the lines reappear.
    if (!drawingScopeId || drawingsHidden) {
      // No scope OR hidden — clear any existing drawn lines (used when a
      // parent disables drawing mid-session or hits the "hide" toggle).
      if (map.drawnLines) {
        for (const dl of map.drawnLines) chart.removeSeries(dl.series);
        map.drawnLines = undefined;
      }
      // v5.2.3 — same for horizontals.
      if (map.drawnHorizontals && candleSeriesRef.current) {
        const main = candleSeriesRef.current;
        for (const dh of map.drawnHorizontals) main.removePriceLine(dh.line);
        map.drawnHorizontals = undefined;
      }
      return;
    }
    const stored = getDrawings(drawingScopeId);
    const trendlines = stored.filter(
      (d): d is Extract<Drawing, { type: "trendline" }> => d.type === "trendline"
    );
    const horizontals = stored.filter(
      (d): d is Extract<Drawing, { type: "horizontal" }> => d.type === "horizontal"
    );

    // --- Trendlines ---
    const existingLines = map.drawnLines ?? [];
    const existingLineIds = new Set(existingLines.map((e) => e.id));
    const trendlineIds = new Set(trendlines.map((d) => d.id));

    const keptLines: Array<{ id: string; series: ISeriesApi<"Line"> }> = [];
    for (const entry of existingLines) {
      if (trendlineIds.has(entry.id)) {
        keptLines.push(entry);
      } else {
        chart.removeSeries(entry.series);
      }
    }
    for (const d of trendlines) {
      if (existingLineIds.has(d.id)) continue;
      const series = chart.addLineSeries({
        color: "#f59e0b", // amber — distinctive against candles + every indicator
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // Lightweight-charts requires data in ascending time order.
      const a = d.start.time <= d.end.time ? d.start : d.end;
      const b = d.start.time <= d.end.time ? d.end : d.start;
      series.setData([
        { time: a.time as UTCTimestamp, value: a.price },
        { time: b.time as UTCTimestamp, value: b.price },
      ]);
      keptLines.push({ id: d.id, series });
    }
    map.drawnLines = keptLines;

    // --- Horizontals (v5.2.3) ---
    const main = candleSeriesRef.current;
    if (main) {
      const existingHs = map.drawnHorizontals ?? [];
      const existingHIds = new Set(existingHs.map((e) => e.id));
      const hIds = new Set(horizontals.map((d) => d.id));

      const keptHs: Array<{ id: string; line: IPriceLine }> = [];
      for (const entry of existingHs) {
        if (hIds.has(entry.id)) {
          keptHs.push(entry);
        } else {
          main.removePriceLine(entry.line);
        }
      }
      for (const d of horizontals) {
        if (existingHIds.has(d.id)) continue;
        const line = main.createPriceLine({
          price: d.price,
          color: "#f59e0b",
          lineWidth: 1,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "—",
        });
        keptHs.push({ id: d.id, line });
      }
      map.drawnHorizontals = keptHs;
    }
    // No setState — the parent already has the drawings list (it called
    // addDrawing / clearDrawings). The effect just keeps the visual in sync.
  }, [
    drawingScopeId,
    visible,
    hidden,
    revealHidden,
    drawingsVersion,
    drawingsRefreshKey,
    drawingsHidden,
  ]);

  // Fit content only when the candle data itself changes (scenario switch, or hidden
  // candles revealed on submit). Avoids snapping the user's pan position back to fit
  // every time price lines update (e.g. typing entry/stop/tp in the form).
  //
  // v4.1.7 — gated on autoFit. The portfolio simulator passes false so advancing
  // time doesn't snap the user out of their manual zoom level. Callers that want
  // to re-fit (e.g. on symbol switch) force a Chart remount via the React key prop.
  // First fit always runs so the initial render shows the data even when autoFit
  // is false; the ref persists across data changes within a single mount.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (autoFit || !fittedOnceRef.current) {
      chart.timeScale().fitContent();
      fittedOnceRef.current = true;
    }
    updateLineRef.current();
  }, [visible, hidden, revealHidden, autoFit]);

  // Quick lookup keyed by IndicatorLineId so the legend can show the same
  // value the tooltip shows (and the legend stays accurate as the cursor
  // moves). Empty when no hover state is live.
  const hoverValues: Partial<Record<IndicatorLineId, number>> = {};
  if (hover) {
    for (const row of hover.rows) hoverValues[row.id] = row.value;
  }
  // Main-pane legend lists the overlays Chart.tsx actually draws on this
  // chart instance. RSI/MACD live in IndicatorSubChart components and carry
  // their own legends.
  const MAIN_PANE_TOOLS: ChartToolId[] = [
    "ema",
    "bb",
    "vwap",
    "super_guppy",
    "chris_guppy",
    "keltner",
    "pivots",
  ];
  // v5.1.1 — Super Guppy needs to display a colored state chip ("BULL" /
  // "BEAR" / "MIXED") instead of a numeric value, and its legend dot color
  // has to track the live trend state. Pass both to the legend + tooltip
  // so they can branch on the super_guppy id and render the special UI.
  const superGuppyInfo =
    overlays?.super_guppy
      ? { state: guppyState, colorMode }
      : undefined;
  const chrisGuppyInfo =
    overlays?.chris_guppy
      ? { state: chrisState, colorMode }
      : undefined;

  // v5.2.0 — drawing-mode status copy. Tells the user where they are in the
  // two-click handshake (trendline or measure) or that they can cancel.
  const drawingStatus =
    drawingMode === "trendline"
      ? pendingFirstPoint
        ? "Click second point  ·  Esc to cancel"
        : "Click first point on the chart"
      : drawingMode === "measure"
      ? pendingFirstPoint
        ? "Click second point to measure"
        : "Click first point to start measuring"
      : drawingMode === "horizontal"
      ? "Click a price level  ·  Esc to cancel"
      : null;
  // v5.2.1 — drawing-status icon flips with the mode so the user sees
  // which tool is armed at a glance.
  const drawingStatusIcon =
    drawingMode === "measure"
      ? "📐"
      : drawingMode === "horizontal"
      ? "➖"
      : "📏";

  return (
    <div
      className="relative"
      // The crosshair becomes a crosshair cursor in drawing mode so the user
      // sees they're "armed" — distinct from the normal grab-to-pan cursor.
      style={drawingMode ? { cursor: "crosshair" } : undefined}
    >
      <div ref={containerRef} className="w-full" style={{ height }} />
      {/* Vertical dotted line marking the decision point (last visible candle). */}
      <div
        ref={decisionLineRef}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ display: "none", borderLeft: "1px dashed rgba(79,140,255,0.55)" }}
      />
      <div className="absolute top-2 left-2 z-10 flex gap-2 text-[10px] uppercase tracking-wide pointer-events-none">
        <span className="bg-accent/20 border border-accent/60 text-accent px-2 py-0.5 rounded">
          ◆ Decision point
        </span>
        {revealHidden && (
          <span className="bg-warn/20 border border-warn/60 text-warn px-2 py-0.5 rounded">
            Future candles revealed
          </span>
        )}
        {drawingStatus && (
          <span className="bg-warn/30 border border-warn/60 text-warn px-2 py-0.5 rounded">
            {drawingStatusIcon} {drawingStatus}
          </span>
        )}
      </div>
      <ChartLegend
        overlays={overlays}
        tools={MAIN_PANE_TOOLS}
        values={hoverValues}
        highlightId={hover?.closestId ?? null}
        superGuppy={superGuppyInfo}
        chrisGuppy={chrisGuppyInfo}
      />
      {hover && (
        <ChartHoverTooltip
          x={hover.x}
          y={hover.y}
          closestId={hover.closestId}
          rows={hover.rows}
          containerWidth={containerRef.current?.clientWidth ?? 800}
          superGuppy={superGuppyInfo}
        />
      )}
      {measureResult && (
        <MeasureOverlay
          x={measureResult.x}
          y={measureResult.y}
          stats={measureResult.stats}
          containerWidth={containerRef.current?.clientWidth ?? 800}
          colorMode={colorMode}
          onClose={() => setMeasureResult(null)}
        />
      )}
    </div>
  );
}
