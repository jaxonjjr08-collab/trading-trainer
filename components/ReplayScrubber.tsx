"use client";

// v3.1 — Replay scrubber on the AttemptDetail page. A slider reveals the
// hidden candles one at a time so the user sees what price actually did
// between entry and exit, not just the final outcome.
//
// Reads from the attempt's scenarioSnapshot first (always present for
// v3.1+ attempts). Falls back to looking up the live scenario for older
// attempts; hides itself when neither is available (procedural pre-v3.1).

import { useMemo, useState } from "react";
import Chart, { type PriceLine } from "./Chart";
import type { Candle, Decision, Direction, KeyLevel, ScenarioSnapshot } from "@/lib/types";

type Props = {
  snapshot?: ScenarioSnapshot;
  // Fallback for pre-v3.1 attempts that don't have a snapshot yet but whose
  // scenario is still in the live SCENARIOS array.
  liveVisible?: Candle[];
  liveHidden?: Candle[];
  liveKeyLevels?: KeyLevel[];
  decision: Decision;
  estimatedLiquidationPrice?: number | null;
};

export default function ReplayScrubber({
  snapshot,
  liveVisible,
  liveHidden,
  liveKeyLevels,
  decision,
  estimatedLiquidationPrice,
}: Props) {
  const baseVisible = snapshot?.visibleCandles ?? liveVisible ?? [];
  const baseHidden = snapshot?.hiddenCandles ?? liveHidden ?? [];
  const keyLevels = snapshot?.keyLevels ?? liveKeyLevels ?? [];

  // Nothing to replay — bail (older procedural attempt, or scenario removed
  // from the library before snapshots existed).
  if (baseVisible.length === 0) return null;

  // 0 = entry only. baseHidden.length = full replay.
  const [revealed, setRevealed] = useState(baseHidden.length);

  const candles = useMemo(
    () => [...baseVisible, ...baseHidden.slice(0, revealed)],
    [baseVisible, baseHidden, revealed]
  );

  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];
    for (const lvl of keyLevels) {
      lines.push({ price: lvl.price, color: "#9aa0a6", title: lvl.label, lineStyle: "dotted" });
    }
    if (decision.direction !== "wait") {
      if (decision.entry != null)
        lines.push({ price: decision.entry, color: "#4f8cff", title: "entry" });
      if (decision.stopLoss != null)
        lines.push({ price: decision.stopLoss, color: "#ef4444", title: "stop" });
      if (decision.takeProfit != null)
        lines.push({ price: decision.takeProfit, color: "#22c55e", title: "tp" });
      if (estimatedLiquidationPrice != null) {
        lines.push({
          price: estimatedLiquidationPrice,
          color: "#f59e0b",
          title: "est. liq.",
          lineStyle: "dashed",
        });
      }
    }
    return lines;
  }, [keyLevels, decision, estimatedLiquidationPrice]);

  const total = baseHidden.length;
  const fullyRevealed = revealed >= total;

  // Time elapsed since decision point, expressed in candle units. UI shows
  // "+N candles" because we can't know the timeframe label without the
  // snapshot (and snapshot.timeframe is a string like "6h"); ambiguity is
  // honest — "candle 5 of 12" is the universal unit.
  const candlesAfterDecision = revealed;

  // What outcome got hit (if any) at the current scrub position. Lets us
  // overlay "stop hit at candle 3" feedback in real time.
  const hitInfo = useMemo<{ kind: "tp" | "sl" | "liq" | null; atIndex: number | null }>(() => {
    if (decision.direction === "wait") return { kind: null, atIndex: null };
    const stop = decision.stopLoss;
    const tp = decision.takeProfit;
    const liq = estimatedLiquidationPrice ?? null;
    const long = decision.direction === "long";
    for (let i = 0; i < revealed; i++) {
      const c = baseHidden[i];
      if (long) {
        if (liq != null && c.low <= liq) return { kind: "liq", atIndex: i };
        if (stop != null && c.low <= stop) return { kind: "sl", atIndex: i };
        if (tp != null && c.high >= tp) return { kind: "tp", atIndex: i };
      } else {
        if (liq != null && c.high >= liq) return { kind: "liq", atIndex: i };
        if (stop != null && c.high >= stop) return { kind: "sl", atIndex: i };
        if (tp != null && c.low <= tp) return { kind: "tp", atIndex: i };
      }
    }
    return { kind: null, atIndex: null };
  }, [baseHidden, decision, estimatedLiquidationPrice, revealed]);

  return (
    <div className="rounded-md border border-line bg-panel p-3 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Replay</div>
          <div className="text-sm mt-0.5">
            Scrub forward to see what price actually did after your decision.
          </div>
        </div>
        <div className="text-xs text-muted font-mono tab-nums">
          +{candlesAfterDecision} / {total} candles
        </div>
      </div>

      <Chart visible={candles} hidden={[]} priceLines={priceLines} height={360} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRevealed(0)}
          className="text-xs border border-line bg-panel2 px-2 py-1 rounded-md hover:bg-panel"
          aria-label="Reset replay to decision point"
        >
          ⟲ Reset
        </button>
        <input
          type="range"
          min={0}
          max={total}
          value={revealed}
          onChange={(e) => setRevealed(Number(e.target.value))}
          className="flex-1"
          aria-label="Replay scrubber"
        />
        <button
          type="button"
          onClick={() => setRevealed(total)}
          className="text-xs border border-line bg-panel2 px-2 py-1 rounded-md hover:bg-panel"
          aria-label="Reveal full replay"
        >
          End ⟶
        </button>
      </div>

      {hitInfo.kind && hitInfo.atIndex != null && hitInfo.atIndex < revealed && (
        <div
          className={`text-xs rounded-md border px-3 py-2 ${
            hitInfo.kind === "tp"
              ? "border-good/40 bg-good/5 text-good"
              : hitInfo.kind === "liq"
              ? "border-bad/40 bg-bad/10 text-bad font-semibold"
              : "border-warn/40 bg-warn/5 text-warn"
          }`}
        >
          {hitInfo.kind === "tp" && `Take-profit hit at candle +${hitInfo.atIndex + 1}.`}
          {hitInfo.kind === "sl" && `Stop loss hit at candle +${hitInfo.atIndex + 1}.`}
          {hitInfo.kind === "liq" && `Liquidation triggered at candle +${hitInfo.atIndex + 1} — before the stop.`}
        </div>
      )}

      {fullyRevealed && (
        <div className="text-[10px] text-muted leading-snug">
          Full hidden window revealed. Notice where the move actually paid (or
          didn't) and compare that to where your stop and TP sat.
        </div>
      )}
    </div>
  );
}

// Re-export the Direction type to keep callers' imports flat.
export type { Direction };
