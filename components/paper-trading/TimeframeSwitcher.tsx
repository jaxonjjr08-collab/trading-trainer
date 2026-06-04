"use client";

// v5.0.1 — Mid-session timeframe switcher, above the chart. Click 1m / 5m /
// 15m / 1h / 6h / 1d to refetch history at the new granularity and continue
// the session at that resolution. Open positions stay open; their entry,
// stop, and TP prices don't change. Forward SL/TP resolution runs against
// the new bars going forward.

import {
  granularityLabel,
  SUPPORTED_GRANULARITIES,
  type Granularity,
} from "@/lib/live-data";

// The full set Coinbase's public endpoint supports. The same picker that
// appears on the empty-state start screen — but it switches in place here.
const ORDER: Granularity[] = [...SUPPORTED_GRANULARITIES];

type Props = {
  current: Granularity;
  onChange: (next: Granularity) => void;
  disabled?: boolean;
};

export default function TimeframeSwitcher({
  current,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted uppercase tracking-wide text-[10px] mr-1">
        Timeframe
      </span>
      {ORDER.map((g) => {
        const active = g === current;
        return (
          <button
            key={g}
            type="button"
            onClick={() => !disabled && !active && onChange(g)}
            disabled={disabled || active}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
              active
                ? "bg-accent/20 border-accent/60 text-accent"
                : "bg-panel2 border-line text-muted hover:text-text disabled:opacity-50"
            }`}
            aria-pressed={active}
            title={
              active
                ? `Currently ${granularityLabel(g)}`
                : `Switch to ${granularityLabel(g)} candles`
            }
          >
            {granularityLabel(g)}
          </button>
        );
      })}
    </div>
  );
}
