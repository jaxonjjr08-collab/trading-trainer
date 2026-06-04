"use client";

// v5.0 — React hook that drives the live paper-trading tick loop. Owns:
//   - setInterval at granularity-appropriate cadence (lib/live-data.pollIntervalMs)
//   - fetch-latest-candles per active symbol
//   - exponential-backoff retry on network failure
//   - "connected" / "fetching" / "error" status the UI displays
//
// Calling pattern (from app/paper-trading/page.tsx):
//
//   const status = useLivePolling({
//     session,
//     onNewCandles: (symbol, candles) => {
//       persist(appendLiveCandles(session, symbol, candles));
//     },
//   });
//
// The hook does not own session state — it just calls onNewCandles when new
// candles arrive. The page reduces them into the session via appendLiveCandles
// and persists. This keeps the hook stateless (apart from its own polling
// status) and the session as the single source of truth.

import { useEffect, useRef, useState } from "react";
import { fetchLatestCandles, pollIntervalMs, type Granularity } from "./live-data";
import type { Candle, PortfolioSession } from "./types";

export type LiveStatus = "idle" | "connected" | "fetching" | "error" | "paused";

export type UseLivePollingResult = {
  status: LiveStatus;
  lastTickAt: number | null;
  lastErrorMessage: string | null;
  retryInMs: number | null;
  // Allow the caller to pause/resume (e.g. when session.status === "ended").
  paused: boolean;
};

type Opts = {
  session: PortfolioSession;
  onNewCandles: (symbol: string, candles: Candle[]) => void;
  // Optional override; otherwise derived from granularity.
  pollMs?: number;
  // When true, the polling loop stops scheduling further ticks. Used when
  // the session has ended or the user explicitly paused.
  paused?: boolean;
};

const MAX_BACKOFF_MS = 60_000;

export function useLivePolling(opts: Opts): UseLivePollingResult {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [retryInMs, setRetryInMs] = useState<number | null>(null);

  // Keep latest callback in a ref so the polling effect doesn't restart on
  // every parent re-render — only on session.id or paused changes.
  const onNewCandlesRef = useRef(opts.onNewCandles);
  useEffect(() => {
    onNewCandlesRef.current = opts.onNewCandles;
  }, [opts.onNewCandles]);

  // Same for the session: we read it inside the tick handler rather than
  // capturing it in the effect closure, so a session that grew by one candle
  // doesn't restart the polling loop.
  const sessionRef = useRef(opts.session);
  useEffect(() => {
    sessionRef.current = opts.session;
  }, [opts.session]);

  const paused = opts.paused ?? false;

  useEffect(() => {
    if (paused) {
      setStatus("paused");
      return;
    }
    if (opts.session.mode !== "live") {
      // Only live sessions need polling.
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 0;

    async function tick(): Promise<void> {
      if (cancelled) return;
      setStatus("fetching");
      const current = sessionRef.current;
      const liveSymbols = current.symbols.filter(
        (s) => s.productId && s.granularitySec
      );
      try {
        for (const sym of liveSymbols) {
          if (cancelled) return;
          const last = sym.candles[sym.candles.length - 1];
          const sinceTime = last?.time ?? 0;
          const fresh = await fetchLatestCandles(
            sym.productId!,
            sym.granularitySec! as Granularity,
            sinceTime
          );
          if (fresh.length > 0) {
            onNewCandlesRef.current(sym.symbol, fresh);
          }
        }
        if (cancelled) return;
        setStatus("connected");
        setLastTickAt(Date.now());
        setLastErrorMessage(null);
        setRetryInMs(null);
        backoffMs = 0;
        const next =
          opts.pollMs ??
          pollIntervalMs(
            (liveSymbols[0]?.granularitySec ?? 60) as Granularity
          );
        timer = setTimeout(tick, next);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setLastErrorMessage(message);
        // Exponential backoff capped at MAX_BACKOFF_MS.
        backoffMs = Math.min(MAX_BACKOFF_MS, backoffMs > 0 ? backoffMs * 2 : 4_000);
        setRetryInMs(backoffMs);
        timer = setTimeout(tick, backoffMs);
      }
    }

    // First tick fires immediately so the user sees the chart catch up to
    // "now" on session restore, not after a full pollMs wait.
    tick();

    return () => {
      cancelled = true;
      if (timer != null) clearTimeout(timer);
    };
    // We deliberately only restart the loop on session identity (new session)
    // or pause toggle. session.symbols[0].candles changes every tick — making
    // the loop depend on it would create a restart storm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.session.id, opts.session.mode, paused]);

  return {
    status,
    lastTickAt,
    lastErrorMessage,
    retryInMs,
    paused,
  };
}
