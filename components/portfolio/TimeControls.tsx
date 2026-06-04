"use client";

// v4.1 — Time controls for the portfolio simulator. Three actions:
//   +1: advance one candle
//   +4: advance four candles (~16h at 4h cadence, a natural "next morning")
//   Skip to next event: advance to the next candle where an open position
//   would resolve (SL or TP hit). Disabled when there are no open positions.

import { useMemo } from "react";
import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
  onAdvance: (targetIdx: number) => void;
  onEnd: () => void;
};

function findNextEvent(session: PortfolioSession): number | null {
  const open = session.positions.filter((p) => p.status === "open");
  if (open.length === 0) return null;
  let next = Infinity;
  for (const p of open) {
    const sym = session.symbols.find((s) => s.symbol === p.symbol);
    if (!sym) continue;
    for (
      let i = Math.max(p.openedAtIdx, session.currentIdx + 1);
      i < session.candleCount;
      i++
    ) {
      const c = sym.candles[i];
      if (!c) break;
      const hitStop =
        p.direction === "long" ? c.low <= p.stopLoss : c.high >= p.stopLoss;
      const hitTp =
        p.direction === "long" ? c.high >= p.takeProfit : c.low <= p.takeProfit;
      if (hitStop || hitTp) {
        if (i < next) next = i;
        break;
      }
    }
  }
  return next === Infinity ? null : next;
}

export default function TimeControls({ session, onAdvance, onEnd }: Props) {
  const nextEvent = useMemo(() => findNextEvent(session), [session]);
  const atEnd = session.currentIdx >= session.candleCount - 1;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel2 p-3">
      <div className="flex-1 min-w-[160px]">
        <div className="text-[10px] uppercase tracking-wide text-muted">
          Timeline
        </div>
        <div className="font-mono text-sm">
          Candle {session.currentIdx + 1}/{session.candleCount}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdvance(session.currentIdx + 1)}
        disabled={atEnd}
        className="bg-panel border border-line px-3 py-1.5 rounded-md text-xs font-semibold hover:border-accent/60 disabled:opacity-40"
      >
        +1 candle
      </button>
      <button
        type="button"
        onClick={() => onAdvance(session.currentIdx + 4)}
        disabled={atEnd}
        className="bg-panel border border-line px-3 py-1.5 rounded-md text-xs font-semibold hover:border-accent/60 disabled:opacity-40"
      >
        +4 candles
      </button>
      <button
        type="button"
        onClick={() => nextEvent != null && onAdvance(nextEvent)}
        disabled={nextEvent == null || atEnd}
        className="bg-accent/15 border border-accent/40 px-3 py-1.5 rounded-md text-xs font-semibold text-accent hover:bg-accent/25 disabled:opacity-40"
        title={
          nextEvent == null
            ? "No open position is on track to hit SL or TP."
            : `Advance to candle ${nextEvent + 1} when the next SL/TP is hit.`
        }
      >
        Skip to next event
      </button>
      <button
        type="button"
        onClick={onEnd}
        className="bg-panel border border-line px-3 py-1.5 rounded-md text-xs font-semibold text-muted hover:text-text"
      >
        End session
      </button>
    </div>
  );
}
