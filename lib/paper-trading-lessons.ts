// v5.4.0 — Lessons-along-the-path for /paper-trading.
//
// Closes the gap the trainer's biggest critique pointed at: paper trading
// existed as a sandbox but didn't teach anything. Now the act of opening,
// holding, or losing a position triggers Learn-term cards at the moments
// where a beginner would benefit from the lesson — first trade, first
// leveraged trade, first liquidation, etc.
//
// One lesson per moment, one moment per session. Each lesson fires AT MOST
// ONCE per user (tracked via lib/storage.markPaperLessonSeen), so a returning
// learner who's already seen "Welcome to perps" doesn't get it again.
//
// The lesson decision is pure: given the current session + the set of
// already-seen lesson ids, return the first eligible lesson or null. The UI
// renders the result as a banner card with a "Got it" button + a "Learn
// more" link to the full term.

import type { PortfolioSession } from "./types";

export type PaperLessonId =
  | "first_trade"
  | "first_leverage"
  | "first_high_leverage"
  | "first_liquidation"
  | "first_short"
  | "losing_streak";

export type PaperLesson = {
  id: PaperLessonId;
  title: string;
  // One-paragraph plain-English lesson body. Mirrors the Learn term's
  // simpleDefinition register so the in-line lesson and the full Learn term
  // speak with one voice.
  body: string;
  // Slug into LEARN_TERMS for the deep-link "Learn more" button.
  learnTermId: string;
  // Visual tone — "info" for first-time-FYI cards, "warn" for cards that
  // signal the user is taking on real risk, "alert" for outcome-driven
  // teaching moments (a liquidation).
  tone: "info" | "warn" | "alert";
};

export const LESSONS: Record<PaperLessonId, PaperLesson> = {
  first_trade: {
    id: "first_trade",
    title: "First trade on /paper-trading",
    body: "You just opened your first position with real Coinbase prices and paper money. The trainer scores nothing here — live markets don't have a 'right answer.' What it does instead: every win and loss reinforces the decision process you've been practising on /practice. Watch your stop placement and risk % the same way.",
    learnTermId: "risk_percent",
    tone: "info",
  },
  first_leverage: {
    id: "first_leverage",
    title: "You're on a perp now",
    body: "Anything above 1× is a perpetual future. Two costs come with it: a funding rate that nibbles at your position every 8 hours (longs pay; shorts receive at the default 0.01% rate), and a liquidation level that closes you out at a full margin loss if price wicks through it. Higher leverage = liquidation closer to entry.",
    learnTermId: "leverage",
    tone: "warn",
  },
  first_high_leverage: {
    id: "first_high_leverage",
    title: "10× is a different category",
    body: "At 10× or higher, the liquidation level sits within ~10% of entry — well inside normal market noise. Even a clean setup can get wicked out before the trade has time to work. Pros use high leverage on short timeframes with tight stops; for learning, 2-5× teaches the same mechanic without the every-trade-is-a-coinflip dynamic.",
    learnTermId: "leverage_trap",
    tone: "warn",
  },
  first_liquidation: {
    id: "first_liquidation",
    title: "That was a liquidation",
    body: "Price crossed your liquidation level — you lost the full margin you posted (-riskPercent × leverage). At 10× leverage on 1% risk, that's -10% of your account in one trade. The lesson isn't 'leverage is bad' — it's that the liquidation level acts as a hard stop the market doesn't know about. Build position size so it sits well outside normal volatility.",
    learnTermId: "liquidation",
    tone: "alert",
  },
  first_short: {
    id: "first_short",
    title: "First short",
    body: "Shorting profits from price falling. Mechanically it's symmetric to a long — same R:R math, same stop placement principles — but the psychology is different: most beginners short into uptrends and long into downtrends because they 'feel due to reverse.' Same setup quality bar applies in both directions.",
    learnTermId: "direction",
    tone: "info",
  },
  losing_streak: {
    id: "losing_streak",
    title: "3 losers in a row",
    body: "The data says you're 50/50 on whether the next trade is signal or tilt. The trainer's anti-tilt principle: when your last three trades are losers, the highest-EV action is usually NOT taking the next trade — it's stepping away for 30 minutes, reviewing the three losses, and writing the one rule that would have caught all three.",
    learnTermId: "discipline",
    tone: "warn",
  },
};

// Decide which lesson (if any) to show given the current session and the
// set of lesson ids the user has already dismissed. Returns null when no
// new lesson applies. Triggers are evaluated in priority order — the first
// match wins, so a user who hits a liquidation on their first leveraged
// trade sees the liquidation lesson (highest impact) rather than the
// "first_leverage" lesson that would otherwise have queued.
export function decidePaperLesson(
  session: PortfolioSession,
  seen: ReadonlySet<PaperLessonId>
): PaperLesson | null {
  const positions = session.positions;
  if (positions.length === 0) return null;

  // Highest priority: liquidation. Teaching moment, immediate.
  if (!seen.has("first_liquidation")) {
    const liq = positions.find((p) => p.status === "closed_liq");
    if (liq) return LESSONS.first_liquidation;
  }

  // Losing streak — last 3 closed trades all negative.
  if (!seen.has("losing_streak")) {
    const closed = positions.filter((p) => p.status !== "open");
    const last3 = closed.slice(-3);
    if (last3.length === 3 && last3.every((p) => (p.pnlPercent ?? 0) < 0)) {
      return LESSONS.losing_streak;
    }
  }

  // First high-leverage (10×+) entry.
  if (!seen.has("first_high_leverage")) {
    const highLev = positions.find((p) => (p.leverage ?? 1) >= 10);
    if (highLev) return LESSONS.first_high_leverage;
  }

  // First leveraged entry of any kind.
  if (!seen.has("first_leverage")) {
    const lev = positions.find((p) => (p.leverage ?? 1) > 1);
    if (lev) return LESSONS.first_leverage;
  }

  // First short.
  if (!seen.has("first_short")) {
    const short = positions.find((p) => p.direction === "short");
    if (short) return LESSONS.first_short;
  }

  // First trade overall — the welcome lesson.
  if (!seen.has("first_trade")) {
    return LESSONS.first_trade;
  }

  return null;
}
