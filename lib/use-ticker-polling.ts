"use client";

// v5.0.2 — Separate hook for ticker polling (the in-progress price). Runs
// alongside useLivePolling but on a faster cadence (~1.5s default) and against
// the /products/{id}/ticker endpoint instead of /candles. Failures are silent
// — the closed-candle path is the source of truth; this is purely visual
// smoothness, so a transient ticker outage just freezes the chart for a tick
// rather than surfacing as a banner error.

import { useEffect, useRef } from "react";
import { fetchTicker } from "./live-data";

export type UseTickerPollingOpts = {
  productId: string | null;
  onPrice: (price: number, time: number) => void;
  intervalMs?: number;
  paused?: boolean;
};

const DEFAULT_INTERVAL_MS = 1_500;

export function useTickerPolling(opts: UseTickerPollingOpts): void {
  // Latest callback in a ref so we don't restart the timer on every parent
  // re-render — only when productId/paused change.
  const onPriceRef = useRef(opts.onPrice);
  useEffect(() => {
    onPriceRef.current = opts.onPrice;
  }, [opts.onPrice]);

  useEffect(() => {
    if (opts.paused) return;
    if (!opts.productId) return;
    const interval = Math.max(500, opts.intervalMs ?? DEFAULT_INTERVAL_MS);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick(): Promise<void> {
      if (cancelled || !opts.productId) return;
      try {
        const t = await fetchTicker(opts.productId);
        if (cancelled) return;
        onPriceRef.current(t.price, t.time);
      } catch {
        // Silent. The closed-candle poll surfaces real connectivity issues
        // via its own status pill; the ticker is best-effort smoothness.
      }
      if (cancelled) return;
      timer = setTimeout(tick, interval);
    }

    tick();
    return () => {
      cancelled = true;
      if (timer != null) clearTimeout(timer);
    };
  }, [opts.productId, opts.paused, opts.intervalMs]);
}
