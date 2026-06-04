"use client";

// v5.6.0 — Surfaces the most-at-risk leveraged position when the current
// mark price gets close to its liquidation level. Two thresholds:
//
//   < 20% of entry-to-liq distance remaining → "warn" banner (orange)
//   < 5%                                    → "alert" banner (red)
//
// The banner names the position, shows current → liq distance as percent
// + dollar, and points the user at the close action without auto-closing
// anything. Rationale: the trainer's job is to teach the cost of bad
// sizing, not to bail the user out.
//
// One banner at a time — the closest-to-liq open position wins. Hidden
// when no leveraged position is open or all of them are comfortably far
// from their liq.

import type { PortfolioSession } from "@/lib/types";

type Props = {
  session: PortfolioSession;
};

type Risk = {
  positionId: string;
  symbol: string;
  leverage: number;
  liqPrice: number;
  markPrice: number;
  // Distance from current mark to liq, as fraction of entry-to-liq.
  // 1.0 = at entry (max headroom). 0.0 = mark sits at liq.
  remaining: number;
};

const WARN_THRESHOLD = 0.2;
const ALERT_THRESHOLD = 0.05;

function evaluate(session: PortfolioSession): Risk | null {
  let worst: Risk | null = null;
  for (const p of session.positions) {
    if (p.status !== "open") continue;
    if (p.liquidationPrice == null || p.leverage == null) continue;
    const sym = session.symbols.find((s) => s.symbol === p.symbol);
    if (!sym) continue;
    const idx = Math.min(session.currentIdx, sym.candles.length - 1);
    const mark = sym.candles[idx]?.close ?? p.entry;
    const entryToLiq = Math.abs(p.entry - p.liquidationPrice);
    if (entryToLiq === 0) continue;
    const markToLiq = Math.abs(mark - p.liquidationPrice);
    // remaining = fraction of the original entry-to-liq distance still
    // intact between mark and liq. Clamped to [0, 1].
    const remaining = Math.max(0, Math.min(1, markToLiq / entryToLiq));
    if (worst == null || remaining < worst.remaining) {
      worst = {
        positionId: p.id,
        symbol: p.symbol,
        leverage: p.leverage,
        liqPrice: p.liquidationPrice,
        markPrice: mark,
        remaining,
      };
    }
  }
  return worst;
}

export default function LiquidationProximityBanner({ session }: Props) {
  const risk = evaluate(session);
  if (!risk) return null;
  if (risk.remaining >= WARN_THRESHOLD) return null;

  const isAlert = risk.remaining < ALERT_THRESHOLD;
  const pctToLiq = Math.abs(
    ((risk.markPrice - risk.liqPrice) / risk.markPrice) * 100
  );
  const tone = isAlert
    ? {
        border: "border-bad/60",
        bg: "bg-bad/10",
        title: "text-bad",
        title_label: "Liquidation imminent",
        icon: "🚨",
      }
    : {
        border: "border-warn/60",
        bg: "bg-warn/10",
        title: "text-warn",
        title_label: "Close to liquidation",
        icon: "⚠️",
      };

  return (
    <div
      className={`rounded-md border ${tone.border} ${tone.bg} p-3 flex items-start gap-2`}
      role="alert"
    >
      <span aria-hidden className="text-base leading-none mt-0.5">
        {tone.icon}
      </span>
      <div className="flex-1 min-w-0 text-xs">
        <div className={`font-semibold ${tone.title}`}>
          {tone.title_label} — {risk.symbol} {risk.leverage}×
        </div>
        <div className="text-text mt-0.5">
          Mark {risk.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
          · liq {risk.liqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
          · <span className="font-mono">{pctToLiq.toFixed(2)}%</span> away.
        </div>
        <p className="text-muted text-[10px] mt-1 leading-snug">
          {isAlert
            ? "One adverse candle from a full margin loss. Closing now caps the loss at current PnL — staying is a bet the wick reverses before it triggers."
            : "Position is in the danger zone. Decide now whether the original thesis still holds; chasing the trade past liq is the most expensive lesson in trading."}
        </p>
      </div>
    </div>
  );
}
