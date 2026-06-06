// v5.9.6 — Single-candle classifier for the Candle Identifier study tool.
//
// lib/candle-patterns.ts handles MULTI-candle detection on a real series
// (engulfing, inside bar) for the live chart. This module is the
// complementary single-candle read: given one candle's OHLC, name its shape
// and explain what it means. Used by the interactive Candle Identifier where
// a beginner morphs a candle and watches the label update live.
//
// Everything here is pure and side-effect free so it's trivially testable.

export type SingleCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandleAnatomyKind =
  | "doji"
  | "marubozu"
  | "hammer"
  | "inverted_hammer"
  | "shooting_star"
  | "hanging_man"
  | "spinning_top"
  | "standard"
  | "flat";

export type CandleDirection = "bull" | "bear" | "flat";

export type CandleAnatomy = {
  kind: CandleAnatomyKind;
  label: string;
  direction: CandleDirection;
  // Proportions of the bar's total range, each 0..1. Handy for the
  // identifier's read-out and for any future scoring.
  bodyFraction: number;
  upperWickFraction: number;
  lowerWickFraction: number;
  // One-line plain-English description for the identifier card.
  meaning: string;
};

const LABELS: Record<CandleAnatomyKind, string> = {
  doji: "Doji",
  marubozu: "Marubozu",
  hammer: "Hammer",
  inverted_hammer: "Inverted Hammer",
  shooting_star: "Shooting Star",
  hanging_man: "Hanging Man",
  spinning_top: "Spinning Top",
  standard: "Standard candle",
  flat: "Flat bar",
};

export function anatomyLabel(kind: CandleAnatomyKind): string {
  return LABELS[kind];
}

function body(c: SingleCandle): number {
  return Math.abs(c.close - c.open);
}
function range(c: SingleCandle): number {
  return Math.max(0, c.high - c.low);
}
function upperWick(c: SingleCandle): number {
  return c.high - Math.max(c.open, c.close);
}
function lowerWick(c: SingleCandle): number {
  return Math.min(c.open, c.close) - c.low;
}

// Direction is bull when it closed above where it opened. Flat when body is a
// negligible fraction of the range (the doji case) — the identifier treats
// that as "no clear direction" rather than forcing green/red.
function directionOf(c: SingleCandle, bodyFrac: number): CandleDirection {
  if (bodyFrac <= 0.1) return "flat";
  return c.close >= c.open ? "bull" : "bear";
}

// Classify one candle. Thresholds mirror lib/candle-patterns.ts where they
// overlap (doji 10% body, hammer wick >= 2× body, small opposite wick) so the
// identifier teaches the same shapes the live chart flags.
export function classifyCandle(c: SingleCandle): CandleAnatomy {
  const r = range(c);
  const b = body(c);
  const uw = upperWick(c);
  const lw = lowerWick(c);

  // Degenerate: no range at all. Guard before dividing.
  if (r <= 0) {
    return {
      kind: "flat",
      label: LABELS.flat,
      direction: "flat",
      bodyFraction: 0,
      upperWickFraction: 0,
      lowerWickFraction: 0,
      meaning:
        "No movement this period — open, high, low, and close are the same. You'll see this only on dead/illiquid bars.",
    };
  }

  const bodyFraction = b / r;
  const upperWickFraction = uw / r;
  const lowerWickFraction = lw / r;
  const direction = directionOf(c, bodyFraction);
  const dirWord = direction === "bull" ? "buyers" : "sellers";

  // ── Doji: tiny body, both wicks present → pure indecision. ──
  if (bodyFraction <= 0.1) {
    return {
      kind: "doji",
      label: LABELS.doji,
      direction: "flat",
      bodyFraction,
      upperWickFraction,
      lowerWickFraction,
      meaning:
        "Open and close finished almost equal — buyers and sellers cancelled out. Indecision. On its own it's a pause, not a direction; it matters most at a level after a strong run.",
    };
  }

  // ── Marubozu: body fills almost the whole range, barely any wick. ──
  if (bodyFraction >= 0.9 && uw <= r * 0.05 && lw <= r * 0.05) {
    return {
      kind: "marubozu",
      label: LABELS.marubozu,
      direction,
      bodyFraction,
      upperWickFraction,
      lowerWickFraction,
      meaning:
        direction === "bull"
          ? "One-sided green bar with almost no wick — buyers were in control start to finish. Strong conviction up."
          : "One-sided red bar with almost no wick — sellers were in control start to finish. Strong conviction down.",
    };
  }

  // ── Hammer / Hanging Man: small body at the TOP, long lower wick. ──
  // Same shape; the name depends on the trend it appears in. We surface both
  // so the learner connects shape → context.
  if (lw >= b * 2 && uw <= r * 0.15 && bodyFraction <= 0.4) {
    return {
      kind: "hammer",
      label: `${LABELS.hammer} / ${LABELS.hanging_man}`,
      direction,
      bodyFraction,
      upperWickFraction,
      lowerWickFraction,
      meaning:
        "Long lower wick, small body up top — price dropped hard then got bought back. After a downtrend it's a bullish Hammer (buyers stepped in). After an uptrend the same shape is a bearish Hanging Man. Context decides.",
    };
  }

  // ── Shooting Star / Inverted Hammer: small body at the BOTTOM, long upper wick. ──
  if (uw >= b * 2 && lw <= r * 0.15 && bodyFraction <= 0.4) {
    return {
      kind: "shooting_star",
      label: `${LABELS.shooting_star} / ${LABELS.inverted_hammer}`,
      direction,
      bodyFraction,
      upperWickFraction,
      lowerWickFraction,
      meaning:
        "Long upper wick, small body down low — price spiked up then got rejected. After an uptrend it's a bearish Shooting Star (sellers slammed the highs). After a downtrend the same shape is an Inverted Hammer hinting at a turn.",
    };
  }

  // ── Spinning Top: small body in the MIDDLE, wicks on both sides. ──
  if (bodyFraction <= 0.35 && uw >= b && lw >= b) {
    return {
      kind: "spinning_top",
      label: LABELS.spinning_top,
      direction,
      bodyFraction,
      upperWickFraction,
      lowerWickFraction,
      meaning:
        "Small body with wicks above and below — both sides pushed and neither won. Like a doji, it signals indecision and a possible pause in the current move.",
    };
  }

  // ── Everything else: a normal directional candle. ──
  return {
    kind: "standard",
    label: direction === "bull" ? "Standard bull candle" : "Standard bear candle",
    direction,
    bodyFraction,
    upperWickFraction,
    lowerWickFraction,
    meaning:
      direction === "bull"
        ? `A normal green bar — ${dirWord} closed it above the open, with wicks showing the high and low it touched along the way.`
        : `A normal red bar — ${dirWord} closed it below the open, with wicks showing the high and low it touched along the way.`,
  };
}
