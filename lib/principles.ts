import type { Score, ScoreCategoryId, ScoreCategoryResult } from "./types";

const PRINCIPLE: Record<ScoreCategoryId, { title: string; body: string }> = {
  direction: {
    title: "Trade with structure, not against it",
    body:
      "Trends and ranges aren't predictions — they're descriptions of who's currently in control. Counter-trend trades can work, but the probability shifts against you and the reward-to-risk needs to compensate. Pick the side the market is already paying.",
  },
  risk: {
    title: "Position size is your survival rate",
    body:
      "Risk per trade compounds in both directions. Risking 5% per trade means 5 losses in a row cuts the account in half; 1% means you can lose 10 in a row and barely feel it. The point of small risk isn't being timid — it's staying in the game long enough for your edge to play out.",
  },
  rr: {
    title: "Reward-to-risk decides who's allowed to be wrong",
    body:
      "At 1:1, you need to be right more than 50% of the time just to break even after fees. At 1:2 you can be wrong twice as often as you're right and still grow the account. Stack the math in your favor before you click buy.",
  },
  stop: {
    title: "Stops belong outside the noise",
    body:
      "A stop too close to entry gets wicked by normal price chop and you exit a trade that was never actually wrong. A stop in the right place sits beyond the level your thesis depends on — if price violates it, the setup is gone. Place the stop where the trade is invalidated, then size the position around that distance.",
  },
  leverage: {
    title: "Leverage amplifies, it doesn't add edge",
    body:
      "Leverage doesn't change the probability of being right. It changes how much you lose when you're wrong — and how easily the exchange takes your position before your stop fires. Match leverage to your stop distance: tight stop with high leverage and you'll get liquidated by a wick.",
  },
  entry: {
    title: "Patience for the level is most of the edge",
    body:
      "Chasing entries means worse fill, worse stop distance, and worse reward-to-risk. The same setup taken 1% better can turn a losing trade into a winning one. If price runs away from your level, the trade is gone — don't manufacture a new one in mid-air.",
  },
  target: {
    title: "Take what the market gives at the next level",
    body:
      "Most moves rest, retrace, or fully reverse at the next major level. Holding for one ambitious target means watching paper profit evaporate when price rejects there. A first target at the next level (with a partial close) plus a runner for the extension gives you something locked in either way.",
  },
  thesis: {
    title: "If you can't write it, you can't review it",
    body:
      "A traded setup with no written reason is a trade you cannot learn from. Months from now, you won't remember why you took it — only that it won or lost. The thesis is what makes the journal a coach instead of a scoreboard.",
  },
  invalidation: {
    title: "Decide when you're wrong before you're emotional",
    body:
      "Writing down what would prove the trade wrong, before you take it, is the only reliable way to exit losers cleanly. Without it, every loss becomes 'just give it a bit more room' and your defined risk quietly becomes undefined risk.",
  },
  trade_management: {
    title: "Most P&L is made or lost after entry",
    body:
      "The entry is one decision. Moving the stop to break-even after the trade moves 1R in your favour, banking a partial at the next level, and exiting cleanly when the structure breaks are five more — and they decide more of the outcome than the entry did. A great entry managed badly loses money; a mediocre entry managed well usually doesn't.",
  },
  chart_tools: {
    title: "Use the tool the chart was built around",
    body:
      "Indicators don't predict — they describe. When a scenario centers on an EMA or an RSI divergence, the tool is the language the lesson is written in. Turning it on lets you see the read; naming it in your thesis lets you review the read months later. Both habits, together, are what turns a glance at a chart into a reviewable trade.",
  },
  portfolio_risk: {
    title: "Diversify your bets, not your label",
    body:
      "Five 1% positions only diversify if they don't move together. Three same-direction longs on majors during a market dump aren't five trades — they're one leveraged trade in a costume. The portfolio question isn't 'how many positions do I have' but 'how many independent ideas am I actually expressing'.",
  },
};

/**
 * Pick the single most teaching-worthy category from a score:
 *   - among the non-passing categories (positive === false),
 *   - lowest fraction (points / max),
 *   - tiebreaker by category importance below.
 *
 * Returns null if everything went well.
 */
const IMPORTANCE: ScoreCategoryId[] = [
  "leverage", // can liquidate you immediately
  "stop",
  "risk",
  "portfolio_risk", // similar weight to per-trade risk — caps a different axis
  "rr",
  "direction",
  "target",
  "trade_management",
  "entry",
  "thesis",
  "invalidation",
  "chart_tools",
];

export function pickPrincipleForScore(score: Score): { category: ScoreCategoryId; title: string; body: string } | null {
  const failing: ScoreCategoryResult[] = score.breakdown.filter(
    (b) => !b.positive && b.points < b.max
  );
  if (failing.length === 0) return null;

  // Prefer categories that surfaced an explicit (non-positive) tag — those reflect
  // the actual mistake. Categories that scored 0 only because a dependent field
  // was missing (e.g. leverage can't be evaluated without a stop) get deprioritized
  // so we don't teach the wrong lesson.
  const tagged = failing.filter((c) => c.tags.length > 0);
  const pool = tagged.length > 0 ? tagged : failing;

  pool.sort((a, b) => {
    const pa = a.points / a.max;
    const pb = b.points / b.max;
    if (pa !== pb) return pa - pb;
    return IMPORTANCE.indexOf(a.id) - IMPORTANCE.indexOf(b.id);
  });

  const worst = pool[0];
  const p = PRINCIPLE[worst.id];
  return { category: worst.id, title: p.title, body: p.body };
}

// v2.7 — Deterministic principle-of-the-day. Picks one of the 10 principles
// by day-of-year so every visit on the same calendar day returns the same
// principle, but the dashboard rotates through all of them over ~10 days.
export function principleOfTheDay(now: Date = new Date()): { title: string; body: string } {
  const entries = Object.values(PRINCIPLE);
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  const idx = ((dayOfYear % entries.length) + entries.length) % entries.length;
  return entries[idx];
}
