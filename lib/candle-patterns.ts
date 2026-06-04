// v5.2.2 — Candle pattern detection. Pure functions that walk a candle
// array and return a list of recognised patterns with their candle index,
// kind, and directional bias.
//
// The detection is deliberately conservative — the patterns ship with
// noticeable thresholds (body-to-range ratios, wick-to-body ratios) so a
// learner sees them only on the cleanest examples. Real markets blur the
// edges; we'd rather under-mark than train the user to see patterns where
// there aren't any.
//
// Six patterns at launch — the canonical beginner-level set:
//   - Doji            : indecision (open ≈ close, tiny body)
//   - Hammer          : bullish reversal (small body at top, long lower wick)
//   - Shooting Star   : bearish reversal (small body at bottom, long upper wick)
//   - Bullish Engulfing : reversal up (red bar followed by green that envelops it)
//   - Bearish Engulfing : reversal down (green bar followed by red that envelops it)
//   - Inside Bar      : consolidation (second bar's range fits inside the first)

import type { Candle } from "./types";

export type CandlePatternKind =
  | "doji"
  | "hammer"
  | "shooting_star"
  | "bullish_engulfing"
  | "bearish_engulfing"
  | "inside_bar";

export type CandlePatternDirection = "bull" | "bear" | "neutral";

export type DetectedPattern = {
  candleIndex: number;
  kind: CandlePatternKind;
  direction: CandlePatternDirection;
};

const PATTERN_LABELS: Record<CandlePatternKind, string> = {
  doji: "Doji",
  hammer: "Hammer",
  shooting_star: "Shooting Star",
  bullish_engulfing: "Bullish Engulfing",
  bearish_engulfing: "Bearish Engulfing",
  inside_bar: "Inside Bar",
};

const PATTERN_MEANINGS: Record<CandlePatternKind, string> = {
  doji:
    "Open and close almost equal — buyers and sellers cancelled out this bar. Indecision; not directional on its own.",
  hammer:
    "Small body at the top of the range with a long lower wick. After a downtrend, signals buyers stepped in at the lows.",
  shooting_star:
    "Small body at the bottom of the range with a long upper wick. After an uptrend, signals sellers rejected the highs.",
  bullish_engulfing:
    "Red bar followed by a green bar that fully envelops it. Aggressive shift of control to buyers at a low.",
  bearish_engulfing:
    "Green bar followed by a red bar that fully envelops it. Aggressive shift of control to sellers at a high.",
  inside_bar:
    "Second bar's high and low sit inside the first bar's range. Compression; trend often resumes when it breaks out.",
};

export function patternLabel(kind: CandlePatternKind): string {
  return PATTERN_LABELS[kind];
}
export function patternMeaning(kind: CandlePatternKind): string {
  return PATTERN_MEANINGS[kind];
}

// Helpers — keep the per-pattern detection terse and readable below.
function body(c: Candle): number {
  return Math.abs(c.close - c.open);
}
function range(c: Candle): number {
  return Math.max(0, c.high - c.low);
}
function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}
function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}
function isUp(c: Candle): boolean {
  return c.close > c.open;
}
function isDown(c: Candle): boolean {
  return c.close < c.open;
}

// Doji: open and close within 10% of the bar's range, range non-trivial.
// Trivial-range bars (e.g. holidays / illiquid moments) would be flagged as
// dojis under a strict ratio definition; the range floor filters those out.
function isDoji(c: Candle): boolean {
  const r = range(c);
  if (r === 0) return false;
  if (r < c.close * 0.001) return false; // skip near-flat bars
  return body(c) <= r * 0.1;
}

// Hammer: small body at the TOP of the range, long lower wick (>= 2x body),
// small upper wick (<= 15% of the bar's range). Range-based upper-wick
// threshold is more forgiving than a body-relative one: a tiny body with a
// tiny upper wick is still a clean hammer even if upper-wick = body. The
// 15%-of-range cap rules out cases where the body sits in the middle of
// the bar (which would be a spinning top, not a hammer). Direction is
// bullish regardless of body color — it's the shape that signals
// rejection, not the close-vs-open.
function isHammer(c: Candle): boolean {
  const b = body(c);
  if (b === 0) return false;
  const r = range(c);
  if (r === 0) return false;
  const lw = lowerWick(c);
  const uw = upperWick(c);
  return (
    lw >= b * 2 && // long lower wick
    uw <= r * 0.15 && // small upper wick (range-based)
    b <= r * 0.35 // small body
  );
}

// Shooting Star: mirror image of Hammer — small body at the BOTTOM of the
// range, long upper wick. Same range-based lower-wick cap as Hammer.
function isShootingStar(c: Candle): boolean {
  const b = body(c);
  if (b === 0) return false;
  const r = range(c);
  if (r === 0) return false;
  const lw = lowerWick(c);
  const uw = upperWick(c);
  return uw >= b * 2 && lw <= r * 0.15 && b <= r * 0.35;
}

// Bullish Engulfing: previous bar red, current bar green AND its body
// fully envelops the previous bar's body. Both bodies must be non-trivial
// so a tiny-body green doesn't engulf a previous doji and trigger.
function isBullishEngulfing(prev: Candle, curr: Candle): boolean {
  if (!isDown(prev) || !isUp(curr)) return false;
  if (body(prev) === 0 || body(curr) === 0) return false;
  return curr.open <= prev.close && curr.close >= prev.open;
}

// Bearish Engulfing: previous green, current red, current body envelops.
function isBearishEngulfing(prev: Candle, curr: Candle): boolean {
  if (!isUp(prev) || !isDown(curr)) return false;
  if (body(prev) === 0 || body(curr) === 0) return false;
  return curr.open >= prev.close && curr.close <= prev.open;
}

// Inside Bar: current bar's high AND low both sit inside the previous bar.
// Conservative — equal highs or equal lows don't count, to avoid flagging
// noisy near-overlaps.
function isInsideBar(prev: Candle, curr: Candle): boolean {
  return curr.high < prev.high && curr.low > prev.low;
}

// Walk the candle array and surface all detected patterns. We do NOT
// dedup conflicts (e.g. a bar could be flagged Doji AND Inside Bar) —
// surfacing both is honest, since both apply, and the user can interpret.
export function detectPatterns(candles: Candle[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (isDoji(c)) {
      out.push({ candleIndex: i, kind: "doji", direction: "neutral" });
    }
    if (isHammer(c)) {
      out.push({ candleIndex: i, kind: "hammer", direction: "bull" });
    }
    if (isShootingStar(c)) {
      out.push({ candleIndex: i, kind: "shooting_star", direction: "bear" });
    }
    if (i > 0) {
      const prev = candles[i - 1];
      if (isBullishEngulfing(prev, c)) {
        out.push({
          candleIndex: i,
          kind: "bullish_engulfing",
          direction: "bull",
        });
      }
      if (isBearishEngulfing(prev, c)) {
        out.push({
          candleIndex: i,
          kind: "bearish_engulfing",
          direction: "bear",
        });
      }
      if (isInsideBar(prev, c)) {
        out.push({ candleIndex: i, kind: "inside_bar", direction: "neutral" });
      }
    }
  }
  return out;
}
