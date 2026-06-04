"use client";

// v5.6.5 — Subtle status strip at the bottom of /paper-trading. Reads as
// the "this is a real tool" cue without taking real screen real estate.
// Shows: build version, current symbol + granularity, bar count, browser
// timezone, last successful tick time.
//
// No interactive controls — read-only. The PaperSessionHeader carries the
// account/PnL/end-session buttons; this footer is purely informational.

import { APP_VERSION } from "@/lib/version";
import { granularityLabel, type Granularity } from "@/lib/live-data";

type Props = {
  symbol: string;
  granularity: number | null;
  barCount: number;
  lastTickAt: number | null;
};

function fmtLastTick(ms: number | null): string {
  if (ms == null) return "—";
  const delta = Date.now() - ms;
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  return new Date(ms).toLocaleTimeString();
}

export default function StatusFooter({
  symbol,
  granularity,
  barCount,
  lastTickAt,
}: Props) {
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "—";
  const granLabel =
    granularity != null
      ? granularityLabel(granularity as Granularity)
      : "—";
  return (
    <footer className="border-t border-line bg-panel/40 -mx-4 px-4 py-1.5 mt-4 text-[10px] font-mono text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>v{APP_VERSION}</span>
      <span className="opacity-50">·</span>
      <span>
        {symbol} · {granLabel}
      </span>
      <span className="opacity-50">·</span>
      <span>{barCount.toLocaleString()} bars</span>
      <span className="opacity-50">·</span>
      <span>{tz}</span>
      <span className="ml-auto">last tick {fmtLastTick(lastTickAt)}</span>
    </footer>
  );
}
