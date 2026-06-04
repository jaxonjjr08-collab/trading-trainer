"use client";

// v4.1 — Live correlation hint banner. Shows when the session has 2+ open
// positions and any same-direction pair exceeds the overlap threshold over
// the candles seen so far. The lesson is "your 'separate' trades are
// expressing the same idea" — surfaced before the session ends so the user
// can still adjust.

import { findCorrelatedOverlap } from "@/lib/portfolio";
import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
};

export default function CorrelationHint({ session }: Props) {
  const overlaps = findCorrelatedOverlap(session);
  if (overlaps.length === 0) return null;
  return (
    <div className="rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-xs space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-warn font-semibold uppercase tracking-wide text-[10px]">
          Correlation hint
        </span>
        <span className="text-text">
          {overlaps.length === 1
            ? "Two of your open positions are moving together."
            : `${overlaps.length} pairs of your open positions are moving together.`}
        </span>
      </div>
      <ul className="text-muted leading-snug">
        {overlaps.map((o) => (
          <li key={`${o.a}-${o.b}`}>
            <span className="font-mono">
              {o.a} + {o.b}
            </span>{" "}
            same direction, ρ={o.rho.toFixed(2)} — close to one trade, not two.
          </li>
        ))}
      </ul>
    </div>
  );
}
