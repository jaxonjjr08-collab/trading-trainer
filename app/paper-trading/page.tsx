"use client";

// v5.0 — Live paper trading. Single-symbol per session (BTC-USD only through
// v5.6); v5.7.0 unlocked the full Coinbase USD product catalog. One master
// clock
// that ticks on each new closed Coinbase candle. Reuses the /portfolio
// position engine (openPosition / closePosition / advanceTo / positionMarkPnl)
// since none of it depends on synthetic data — it just reads candles.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart, { type PriceLine } from "@/components/Chart";
import IndicatorSubChart from "@/components/IndicatorSubChart";
import ChartOverlayBar from "@/components/practice/ChartOverlayBar";
import DrawingBar, { type DrawingMode } from "@/components/practice/DrawingBar";
import OpenPositionForm from "@/components/portfolio/OpenPositionForm";
import PositionList from "@/components/portfolio/PositionList";
import LiquidationProximityBanner from "@/components/paper-trading/LiquidationProximityBanner";
import LiveSessionSummary from "@/components/paper-trading/LiveSessionSummary";
import PaperLessonBanner from "@/components/paper-trading/PaperLessonBanner";
import PaperSessionHeader from "@/components/paper-trading/PaperSessionHeader";
import PaperSymbolTabs from "@/components/paper-trading/PaperSymbolTabs";
import PriceTicker from "@/components/paper-trading/PriceTicker";
import StatusFooter from "@/components/paper-trading/StatusFooter";
import SymbolPicker from "@/components/paper-trading/SymbolPicker";
import {
  decidePaperLesson,
  type PaperLessonId,
} from "@/lib/paper-trading-lessons";
import TimeframeSwitcher from "@/components/paper-trading/TimeframeSwitcher";
import {
  appendLiveCandles,
  addLiveSymbol,
  closePosition,
  createLiveSession,
  endSession,
  openPosition,
  prependLiveCandles,
  switchLiveSessionTimeframe,
  type OpenPositionParams,
} from "@/lib/portfolio";
import {
  clearLiveSession,
  getActivePaperSymbol,
  getDecisionDefaults,
  getDefaultIndicators,
  getLastPaperSymbol,
  getLiveSession,
  getPaperLessonsSeen,
  markPaperLessonSeen,
  saveLiveSession,
  setActivePaperSymbol,
  setDecisionDefaults,
  setLastPaperSymbol,
} from "@/lib/storage";
import {
  fetchHistoryBefore,
  fetchInitialHistory,
  granularityLabel,
  SUPPORTED_GRANULARITIES,
  type Granularity,
} from "@/lib/live-data";
import { useLivePolling } from "@/lib/use-live-polling";
import { useTickerPolling } from "@/lib/use-ticker-polling";
import {
  DEFAULT_INDICATOR_CONFIG,
  type Candle,
  type IndicatorConfig,
  type PortfolioSession,
} from "@/lib/types";

// v5.7.0 — DEFAULT_PRODUCT_ID removed; the symbol is now chosen on the
// start screen via SymbolPicker. getLastPaperSymbol() provides the seed
// value (defaults to BTC-USD for first-time visitors).
const DEFAULT_GRANULARITY: Granularity = 60; // 1m candles

// The granularities we offer in the picker. 1m/5m/15m for scalper-pace,
// 1h/6h for swing-pace, 1d for set-it-and-forget-it position-trade paper.
// All six are Coinbase-supported public-endpoint granularities; the polling
// hook auto-throttles its cadence per width (see lib/live-data.pollIntervalMs).
const PICKABLE_GRANULARITIES: Granularity[] = [60, 300, 900, 3600, 21600, 86400];

export default function PaperTradingPage() {
  const [session, setSession] = useState<PortfolioSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<IndicatorConfig>(DEFAULT_INDICATOR_CONFIG);
  // v5.2.0 — trendline drawing on the live chart. Scope is per (symbol,
  // granularity) so the same symbol's 1m and 1h chart don't share lines.
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [drawingsRefreshKey, setDrawingsRefreshKey] = useState(0);
  // v5.6.5 — eye toggle. Persists in component state only — refreshing
  // the page restores drawings to visible. Per-symbol persistence would be
  // overkill for a "hide while I read structure" gesture.
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  // v5.4.0 — set of lesson ids the user has dismissed. Seeded from
  // localStorage on mount; updated when the user clicks "Got it" on a
  // lesson banner.
  const [lessonsSeen, setLessonsSeen] = useState<Set<string>>(new Set());
  useEffect(() => {
    setLessonsSeen(getPaperLessonsSeen());
  }, []);
  const activeLesson = useMemo(() => {
    if (!session) return null;
    return decidePaperLesson(session, lessonsSeen as ReadonlySet<PaperLessonId>);
  }, [session, lessonsSeen]);
  function dismissLesson() {
    if (!activeLesson) return;
    markPaperLessonSeen(activeLesson.id);
    setLessonsSeen((prev) => {
      const next = new Set(prev);
      next.add(activeLesson.id);
      return next;
    });
  }

  // Start-screen form state. Persisted account-size default comes from the
  // global DecisionDefaults so /practice and /portfolio agree.
  const [startAccountSize, setStartAccountSize] = useState<number>(10_000);
  const [startGranularity, setStartGranularity] = useState<Granularity>(DEFAULT_GRANULARITY);
  // v5.7.0 — chosen Coinbase product. Seeded from the last-chosen value
  // in localStorage on mount; persisted on every successful session start.
  const [startSymbol, setStartSymbol] = useState<string>("BTC-USD");
  useEffect(() => {
    setStartSymbol(getLastPaperSymbol());
  }, []);

  useEffect(() => {
    const existing = getLiveSession();
    if (existing && existing.mode === "live") {
      setSession(existing);
    }
    setOverlays(getDefaultIndicators());
    setStartAccountSize(getDecisionDefaults().accountSize);
    setHydrated(true);
  }, []);

  function persist(next: PortfolioSession) {
    setSession(next);
    saveLiveSession(next);
  }

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const safeAccountSize =
        Number.isFinite(startAccountSize) && startAccountSize > 0
          ? startAccountSize
          : 10_000;
      setDecisionDefaults({ accountSize: safeAccountSize });
      const next = await createLiveSession({
        productId: startSymbol,
        granularity: startGranularity,
        accountSize: safeAccountSize,
      });
      persist(next);
      // v5.7.0 — Remember the user's choice so a returning visitor sees
      // their preferred pair pre-selected on the next start screen.
      setLastPaperSymbol(startSymbol);
      // v5.8.0 — Make the just-started symbol the active tab.
      setActiveSymbolState(startSymbol);
      setActivePaperSymbol(startSymbol);
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : "Could not start session."
      );
    } finally {
      setStarting(false);
    }
  }

  function handleOpen(params: OpenPositionParams) {
    if (!session) return;
    persist(openPosition(session, params));
  }

  function handleClose(positionId: string) {
    if (!session) return;
    persist(closePosition(session, positionId));
  }

  function handleEnd() {
    if (!session) return;
    persist(endSession(session));
  }

  function handleStartNew() {
    clearLiveSession();
    setSession(null);
    setStartError(null);
  }

  // v5.8.0 — Add a Coinbase symbol to the active session mid-stream.
  // Uses the active symbol's granularity as the default for the new tab
  // (matches user expectation: "give me the same view, just for ETH").
  // After the fetch succeeds the new tab becomes active automatically.
  const [addingSymbol, setAddingSymbol] = useState(false);
  async function handleAddSymbol(productId: string) {
    if (!session || session.status === "ended") return;
    if (session.symbols.some((s) => s.symbol === productId)) {
      // Already loaded — just switch to it.
      handleSelectSymbol(productId);
      return;
    }
    const sourceGran =
      activeSymForTicker?.granularitySec ?? DEFAULT_GRANULARITY;
    setAddingSymbol(true);
    try {
      const candles = await fetchInitialHistory(
        productId,
        sourceGran as Granularity,
        280
      );
      if (candles.length === 0) {
        console.error(`Coinbase returned no candles for ${productId}`);
        return;
      }
      const next = addLiveSymbol(session, {
        symbol: productId,
        productId,
        granularitySec: sourceGran,
        candles,
      });
      persist(next);
      setActiveSymbolState(productId);
      setActivePaperSymbol(productId);
    } catch (err) {
      console.error("Add symbol failed:", err);
    } finally {
      setAddingSymbol(false);
    }
  }

  // v5.0.1 — Mid-session timeframe switch. Refetch history at the new
  // granularity, swap candles in place via switchLiveSessionTimeframe.
  // Polling hook's next tick picks up the new cadence automatically.
  const [switchingTf, setSwitchingTf] = useState(false);
  // v5.6.2 — Load-older pagination state. `loadingOlder` disables the
  // button + shows a spinner while a fetch is in flight; `noMoreHistory`
  // latches true once Coinbase returns an empty page so the button can
  // disable itself permanently (we've hit the listing date).
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [noMoreHistory, setNoMoreHistory] = useState(false);
  // v5.6.3 — Streaming load-all state. When non-null, the load-all loop is
  // active; setting it false (via the Stop button or natural completion)
  // halts the loop. `loadAllProgress` is the running bar count for the
  // status read-out so the user can see progress without watching the
  // chart redraw 13 times.
  const [loadingAll, setLoadingAll] = useState(false);
  const loadAllAbortRef = useRef({ aborted: false });
  async function handleLoadOlder() {
    if (!session) return;
    // v5.8.0 — operate on the active symbol, not always symbols[0]. The
    // load-older button is per-chart; clicking it while ETH-USD is the
    // active tab paginates ETH-USD history, not BTC-USD.
    const sym =
      session.symbols.find((s) => s.symbol === activeSymbolKey) ??
      session.symbols[0];
    if (!sym || !sym.productId || sym.granularitySec == null) return;
    const oldest = sym.candles[0];
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const older = await fetchHistoryBefore(
        sym.productId,
        sym.granularitySec as Granularity,
        oldest.time,
        280
      );
      if (older.length === 0) {
        setNoMoreHistory(true);
        return;
      }
      const next = prependLiveCandles(session, sym.symbol, older);
      persist(next);
    } catch (err) {
      console.error("Load older failed:", err);
    } finally {
      setLoadingOlder(false);
    }
  }
  // v5.6.3 — Stream every available page until Coinbase returns empty.
  // Polite to the API: 200ms delay between requests so we don't trip the
  // rate limit even when paginating into 2015. On fine granularities (5m
  // and below) we warn the user that the operation will take a while —
  // they can cancel mid-stream via the Stop button.
  async function handleLoadAll() {
    if (!session) return;
    // v5.8.0 — see handleLoadOlder rationale; same active-symbol scope.
    const sym =
      session.symbols.find((s) => s.symbol === activeSymbolKey) ??
      session.symbols[0];
    if (!sym || !sym.productId || sym.granularitySec == null) return;
    const granSec = sym.granularitySec as Granularity;
    // Confirm before starting on fine granularities where the user might
    // not realise the time + request count involved.
    if (granSec <= 900) {
      const label = granularityLabel(granSec);
      const ok = window.confirm(
        `Loading all available history at ${label} granularity can take ~${
          granSec === 60 ? "hours" : granSec === 300 ? "20+ minutes" : "5+ minutes"
        } and trigger Coinbase rate limits. Continue?`
      );
      if (!ok) return;
    }
    loadAllAbortRef.current = { aborted: false };
    setLoadingAll(true);
    try {
      let working = session;
      while (!loadAllAbortRef.current.aborted) {
        const workingSym = working.symbols.find(
          (s) => s.symbol === sym.symbol
        );
        const oldest = workingSym?.candles[0];
        if (!oldest) break;
        const older = await fetchHistoryBefore(
          sym.productId,
          granSec,
          oldest.time,
          280
        );
        if (older.length === 0) {
          setNoMoreHistory(true);
          break;
        }
        working = prependLiveCandles(working, sym.symbol, older);
        persist(working);
        // Politeness delay — keeps us well clear of Coinbase's public
        // rate limit (~10 rps) and gives the React tree a chance to render
        // the new bar count before the next request fires.
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error("Load-all failed:", err);
    } finally {
      setLoadingAll(false);
    }
  }
  function handleStopLoadAll() {
    loadAllAbortRef.current.aborted = true;
  }
  async function handleTimeframeChange(g: Granularity) {
    if (!session) return;
    // v5.8.0 — timeframe switching is per-symbol: switching the active
    // tab's chart to 1h doesn't change the timeframe on other symbols
    // already loaded into the session. Matches /portfolio's behavior.
    const sym =
      session.symbols.find((s) => s.symbol === activeSymbolKey) ??
      session.symbols[0];
    if (!sym || !sym.productId) return;
    if (sym.granularitySec === g) return;
    setSwitchingTf(true);
    try {
      // v5.6.1 — was 150; bumped to 280 to match createLiveSession's new
      // default. Lets the timeframe-switcher show the same amount of
      // history on every granularity as the initial fetch.
      const fresh = await fetchInitialHistory(sym.productId, g, 280);
      if (fresh.length === 0) {
        throw new Error(`Coinbase returned no candles at ${granularityLabel(g)}.`);
      }
      const next = switchLiveSessionTimeframe(session, sym.symbol, fresh, g);
      persist(next);
      // v5.6.2 — Reset the "no more history" flag on every timeframe
      // change. A coarser granularity might reach further back than the
      // previous one allowed, so the load-older button gets a fresh shot.
      setNoMoreHistory(false);
    } catch (err) {
      // Surface in console; the LiveDataStatus pill will catch the next
      // polling failure if Coinbase is actually unreachable.
      console.error("Timeframe switch failed:", err);
    } finally {
      setSwitchingTf(false);
    }
  }

  // Polling hook callback: append new candles, advanceTo for SL/TP, persist.
  // Wrapped in useCallback so the hook's effect doesn't restart every render.
  const onNewCandles = useCallback(
    (symbol: string, candles: Candle[]) => {
      setSession((prev) => {
        if (!prev) return prev;
        const updated = appendLiveCandles(prev, symbol, candles);
        // Save async so we don't block the render. localStorage write is
        // synchronous so this is fine here.
        saveLiveSession(updated);
        return updated;
      });
    },
    []
  );

  const polling = useLivePolling({
    session: session ?? makeIdlePlaceholder(),
    onNewCandles,
    paused: !session || session.status === "ended",
  });

  // v5.0.2 — In-progress candle synthesized from the ticker poll. NOT part of
  // session.candles (we never write a half-formed bar to storage) — purely a
  // visual smoothing layer between bar closes. Cleared whenever a new closed
  // bar arrives via the candles poll (handled inside onNewCandles below).
  const [inProgress, setInProgress] = useState<Candle | null>(null);

  // v5.8.0 — active symbol within a multi-symbol session. Seeded from
  // localStorage; clamped to a real entry in session.symbols on every
  // render so a stale stored value can't point at a removed symbol.
  // Declared before the ticker-poll block so that block can close over
  // activeSymbolKey at declaration time without a TDZ error.
  const [activeSymbol, setActiveSymbolState] = useState<string | null>(null);
  useEffect(() => {
    setActiveSymbolState(getActivePaperSymbol());
  }, []);
  const activeSymbolKey =
    activeSymbol &&
    session?.symbols.some((s) => s.symbol === activeSymbol)
      ? activeSymbol
      : session?.symbols[0]?.symbol ?? "";
  const activeSymbolData = session?.symbols.find(
    (s) => s.symbol === activeSymbolKey
  );
  function handleSelectSymbol(sym: string) {
    setActiveSymbolState(sym);
    setActivePaperSymbol(sym);
  }
  // Alias the ticker-poll block uses; same lookup as activeSymbolData.
  const activeSymForTicker = activeSymbolData;
  // Reset the in-progress candle anytime the active symbol's last closed
  // candle changes OR the active symbol itself changes — that means
  // either a bar just closed or the user switched tabs.
  const lastClosedTime =
    activeSymForTicker?.candles[activeSymForTicker.candles.length - 1]?.time ??
    0;
  useEffect(() => {
    setInProgress(null);
  }, [lastClosedTime, activeSymbolKey]);

  // Ticker poll updates the in-progress candle's H/L/C from the latest trade
  // price. Bar start time = lastClosed.time + granularity.
  useTickerPolling({
    productId:
      session && session.status !== "ended"
        ? activeSymForTicker?.productId ?? null
        : null,
    paused: !session || session.status === "ended",
    onPrice: (price) => {
      setInProgress((prev) => {
        const sym = activeSymForTicker;
        if (!sym || !sym.granularitySec) return prev;
        const lastReal = sym.candles[sym.candles.length - 1];
        if (!lastReal) return prev;
        const barTime = lastReal.time + sym.granularitySec;
        // If the in-progress is from a previous bar (shouldn't happen because
        // lastClosedTime triggers a reset, but defensive), start a new one.
        if (!prev || prev.time !== barTime) {
          return {
            time: barTime,
            open: lastReal.close,
            high: price,
            low: price,
            close: price,
            volume: 0,
          };
        }
        return {
          ...prev,
          high: Math.max(prev.high, price),
          low: Math.min(prev.low, price),
          close: price,
        };
      });
    },
  });

  // Chart split: real closed candles plus the in-progress bar synthesized
  // from ticker polls (when present). The in-progress bar makes the chart
  // tick smoothly between candle closes instead of freezing for ~60s on 1m.
  // The bar is purely visual — SL/TP resolution still runs only over real
  // closed candles in advanceTo.
  //
  // v5.0.2 defensive filter: when a new real candle has just been appended
  // (its time === the in-progress's time), we'd emit two bars at the same
  // timestamp until the reset effect fires async. lightweight-charts asserts
  // strict-ascending time and crashes. Filter the synthetic if its time isn't
  // strictly greater than the last real candle's.
  const chartSplit = useMemo(() => {
    if (!activeSymbolData) return { visible: [], hidden: [] as Candle[] };
    const realCandles = activeSymbolData.candles;
    const last = realCandles[realCandles.length - 1];
    const safe =
      inProgress && (!last || inProgress.time > last.time) ? inProgress : null;
    const visible = safe ? [...realCandles, safe] : realCandles;
    return { visible, hidden: [] as Candle[] };
  }, [activeSymbolData, inProgress]);

  // Open-position price lines (entry/stop/TP for any open positions).
  // v5.6.0 — leveraged positions also get a dashed liquidation line in red
  // so the user can see at-a-glance how close price is to triggering a
  // forced close. The liq line uses a different style (dashed, thicker
  // implied via the title) so it's distinguishable from the stop.
  const priceLines: PriceLine[] = useMemo(() => {
    if (!session) return [];
    const lines: PriceLine[] = [];
    for (const p of session.positions) {
      if (p.status !== "open") continue;
      // v5.8.0 — only draw price lines for positions on the active
      // symbol. Without this filter, an ETH-USD entry would render as a
      // garbage horizontal line on the BTC-USD chart.
      if (p.symbol !== activeSymbolKey) continue;
      lines.push({ price: p.entry, color: "#4f8cff", title: "entry" });
      lines.push({ price: p.stopLoss, color: "#ef4444", title: "stop" });
      lines.push({ price: p.takeProfit, color: "#22c55e", title: "tp" });
      if (p.liquidationPrice != null) {
        lines.push({
          price: p.liquidationPrice,
          color: "#dc2626",
          title: `liq ${p.leverage}×`,
          lineStyle: "dashed",
        });
      }
    }
    return lines;
  }, [session, activeSymbolKey]);

  if (!hydrated) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Live Paper Trading</h1>
          <p className="text-muted text-sm mt-1 max-w-3xl">
            Open simulated positions against real Coinbase prices. Same R-multiple
            P&amp;L the trainer uses everywhere; no real money. The chart updates
            every time a new candle closes — pick a granularity that matches the
            pace you actually want to trade.
          </p>
        </header>
        <div className="rounded-md border border-line bg-panel p-6 space-y-4 max-w-lg">
          <p className="text-text">No session yet.</p>

          {/* v5.7.0 — Symbol picker. Pick from ~200 USD-quoted Coinbase
              pairs; popular ones are surfaced as shortcuts. The trainer's
              first version was BTC-USD only; the rest of the live-trading
              code worked unchanged once the productId was unhardcoded. */}
          <SymbolPicker value={startSymbol} onChange={setStartSymbol} />

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted block mb-1">
              Starting account size (USD)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted font-mono">$</span>
              <input
                type="number"
                min="100"
                step="100"
                value={startAccountSize}
                onChange={(e) =>
                  setStartAccountSize(Number(e.target.value) || 0)
                }
                className="flex-1 bg-panel2 border border-line text-text text-base px-3 py-1.5 rounded font-mono"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted block mb-1">
              Candle width
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PICKABLE_GRANULARITIES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setStartGranularity(g)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                    g === startGranularity
                      ? "bg-accent/20 border-accent/60 text-accent"
                      : "bg-panel2 border-line text-muted hover:text-text"
                  }`}
                >
                  {granularityLabel(g)}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted block mt-1">
              Faster candles = more decision rhythm; slower = more time per
              decision. Switching candle width mid-session refetches at the
              new resolution without losing your positions.
            </span>
          </label>

          {startError && (
            <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded px-2 py-1.5">
              {startError}
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="w-full bg-accent text-white font-semibold py-2 rounded-md disabled:opacity-60"
          >
            {starting
              ? "Fetching history…"
              : `Start live session — ${startSymbol}`}
          </button>
        </div>
      </div>
    );
  }

  const isEnded = session.status === "ended";
  // v5.8.0 — activeSymbolKey is hoisted above so it's available in the
  // hook callbacks that run before this render block (handlers, memos).

  return (
    <div className="space-y-4">
      <PaperSessionHeader
        session={session}
        status={polling.status}
        lastTickAt={polling.lastTickAt}
        lastErrorMessage={polling.lastErrorMessage}
        retryInMs={polling.retryInMs}
        activeSymbol={activeSymbolKey}
        onEnd={handleEnd}
      />

      {/* v5.4.0 — Contextual lesson banner. Fires when a user behavior
          unlocks a teaching moment (first trade, first leverage, first
          liquidation, etc.). One lesson at a time; persists dismissal. */}
      {activeLesson && (
        <PaperLessonBanner lesson={activeLesson} onDismiss={dismissLesson} />
      )}

      {/* v5.6.0 — Liquidation proximity alert. Fires when an open leveraged
          position is within 20% of its liquidation level. Sits above the
          chart so the user sees the risk before they look at price. */}
      <LiquidationProximityBanner session={session} />

      {/* v5.8.0 — Symbol tabs. One per loaded symbol; switch active to
          repoint the chart and ticker subscription. "+" button opens an
          inline SymbolPicker to add another Coinbase pair to the same
          session — each new add fetches its own initial history at the
          active symbol's current granularity. */}
      {!isEnded && (
        <PaperSymbolTabs
          session={session}
          activeSymbol={activeSymbolKey}
          onSelect={handleSelectSymbol}
          onAdd={handleAddSymbol}
          addingSymbol={addingSymbol}
        />
      )}

      {/* v5.6.5 — Big live price + 24h change above the chart. Pulses on
          every tick so the connection status is visible without staring
          at the LiveDataStatus pill in the header. */}
      {activeSymbolData && activeSymbolData.candles.length > 0 && (
        <PriceTicker
          symbol={activeSymbolKey}
          candles={activeSymbolData.candles}
          intervalSec={activeSymbolData.granularitySec ?? 60}
        />
      )}

      {/* v5.0.1 — Live timeframe switcher above the chart. TradingView-style:
          click any candle width and the chart refetches at that resolution.
          Open positions stay open across the switch. */}
      {!isEnded && activeSymbolData?.granularitySec != null && (
        <TimeframeSwitcher
          current={activeSymbolData.granularitySec as Granularity}
          onChange={handleTimeframeChange}
          disabled={switchingTf}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChartOverlayBar value={overlays} onChange={setOverlays} />
        {activeSymbolData && (
          <DrawingBar
            scopeId={`live:${activeSymbolKey}:${activeSymbolData.granularitySec ?? "tf"}`}
            mode={drawingMode}
            onModeChange={setDrawingMode}
            refreshKey={drawingsRefreshKey}
            onRefresh={() => setDrawingsRefreshKey((v) => v + 1)}
            hidden={drawingsHidden}
            onToggleHidden={() => setDrawingsHidden((h) => !h)}
          />
        )}
      </div>

      {activeSymbolData && (
        <div className="rounded-md border border-line bg-panel p-2 space-y-2">
          {/* v5.6.2 — Load older history. Each click fetches 280 more bars
              before the current oldest. Disabled while a fetch is in flight
              or once Coinbase has signaled no more data exists at this
              granularity. */}
          {!isEnded && (
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadOlder}
                  disabled={loadingOlder || loadingAll || noMoreHistory}
                  className="text-[10px] font-mono uppercase tracking-wide text-muted border border-line bg-panel2 rounded px-2 py-1 hover:text-text hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    noMoreHistory
                      ? "Coinbase has no older data at this granularity"
                      : "Fetch the next 280 bars"
                  }
                >
                  {loadingOlder
                    ? "Loading…"
                    : noMoreHistory
                    ? "← End of data"
                    : "← Load 280 older"}
                </button>
                {!loadingAll && !noMoreHistory && (
                  <button
                    type="button"
                    onClick={handleLoadAll}
                    disabled={loadingOlder}
                    className="text-[10px] font-mono uppercase tracking-wide text-muted border border-line bg-panel2 rounded px-2 py-1 hover:text-text hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Stream every available page back to Coinbase's listing date — fast on 1d/6h, slow on fine granularities."
                  >
                    ⏪ Load all
                  </button>
                )}
                {loadingAll && (
                  <button
                    type="button"
                    onClick={handleStopLoadAll}
                    className="text-[10px] font-mono uppercase tracking-wide text-bad border border-bad/60 bg-bad/10 rounded px-2 py-1 hover:bg-bad/20"
                    title="Stop the streaming history load"
                  >
                    ■ Stop
                  </button>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted">
                {loadingAll && "streaming · "}
                {activeSymbolData.candles.length} bars loaded
              </span>
            </div>
          )}
          {/* v5.0.1 — include granularitySec in the key so a timeframe switch
              forces a Chart remount; the autoFit=false flag preserves the
              user's manual zoom WITHIN a granularity but the new mount
              re-fits to the new time range. */}
          <Chart
            key={`${activeSymbolKey}-${activeSymbolData.granularitySec ?? "tf"}`}
            visible={chartSplit.visible}
            hidden={chartSplit.hidden}
            priceLines={priceLines}
            overlays={overlays}
            height={420}
            autoFit={false}
            drawingScopeId={`live:${activeSymbolKey}:${activeSymbolData.granularitySec ?? "tf"}`}
            drawingMode={drawingMode}
            drawingsRefreshKey={drawingsRefreshKey}
            drawingsHidden={drawingsHidden}
            onDrawingComplete={() => setDrawingMode(null)}
          />
          {overlays.rsi && (
            <IndicatorSubChart
              key={`${activeSymbolKey}-${activeSymbolData.granularitySec ?? "tf"}-rsi`}
              kind="rsi"
              candles={chartSplit.visible}
            />
          )}
          {overlays.macd && (
            <IndicatorSubChart
              key={`${activeSymbolKey}-${activeSymbolData.granularitySec ?? "tf"}-macd`}
              kind="macd"
              candles={chartSplit.visible}
            />
          )}
        </div>
      )}

      {isEnded ? (
        <LiveSessionSummary session={session} onStartNew={handleStartNew} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OpenPositionForm
            session={session}
            activeSymbol={activeSymbolKey}
            onSubmit={handleOpen}
          />
          <PositionList session={session} onClose={handleClose} />
        </div>
      )}

      {/* v5.6.5 — Subtle "this is a real tool" footer with version, symbol,
          bar count, timezone, and last-tick freshness. */}
      <StatusFooter
        symbol={activeSymbolKey}
        granularity={activeSymbolData?.granularitySec ?? null}
        barCount={activeSymbolData?.candles.length ?? 0}
        lastTickAt={polling.lastTickAt}
      />
    </div>
  );
}

// Helper to give useLivePolling a non-null session reference when none is
// active (the hook bails on session.mode !== "live" anyway, so this is only
// shape compatibility for TypeScript).
function makeIdlePlaceholder(): PortfolioSession {
  return {
    id: "__idle__",
    startedAt: Date.now(),
    datasetSeed: 0,
    intervalSec: 60,
    candleCount: 0,
    symbols: [],
    currentIdx: 0,
    positions: [],
    status: "active",
    accountSize: 0,
    mode: "synthetic",
  };
}
