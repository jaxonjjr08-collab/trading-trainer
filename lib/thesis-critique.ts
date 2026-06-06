// v2.4 — Structural critique of free-text thesis + invalidation. No LLM,
// just keyword + numeric checks against a small trader-vocab list. The goal
// isn't to grade prose — it's to surface the structural gaps that beginners
// most commonly leave: theses without a level, invalidations without a
// price, no direction word, etc.

export type ThesisGap = {
  field: "thesis" | "invalidation";
  // Human-readable description of what's missing.
  message: string;
  severity: "warn" | "info";
};

export type ThesisCritique = {
  gaps: ThesisGap[];
  // True when there are no `warn` gaps and the user wrote something substantive.
  solid: boolean;
};

// Words that indicate the writer is referencing structural concepts a
// reviewer could verify. Generous list — typos and partials handled by
// substring matching.
const STRUCTURE_WORDS = [
  "support",
  "resistance",
  "swing",
  "level",
  "range",
  "breakout",
  "pullback",
  "retest",
  "trend",
  "structure",
  "higher low",
  "higher high",
  "lower low",
  "lower high",
  "wick",
  "consolidat", // matches consolidation, consolidating
  "rejection",
  "reclaim",
  "sweep",
  "liquidity",
  "volume",
  "fakeout",
  "failed",
  "broke",
  "break",
];

const DIRECTION_WORDS = [
  "long",
  "short",
  "up",
  "down",
  "bull",
  "bear",
  "rally",
  "decline",
  "fade",
  "buy",
  "sell",
  "drop",
];

const INVALIDATION_HOOKS = [
  "close below",
  "close above",
  "break below",
  "break above",
  "break of",
  "loss of",
  "below the",
  "above the",
  "reclaim of",
  "lose",
  "loses",
  "fails",
];

// Numbers like "$58k", "58,000", "59500", "139.50" all qualify as level
// references. Looks for two or more consecutive digits, optionally with
// commas, decimals, or a k/m suffix.
const NUMBER_LIKE = /\$?\d{2,}([,.]\d+)?[kKmM]?/;

function hasAnyWord(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

// v5.9.7 — exported single-source detectors. lib/scoring.ts uses these so the
// thesis SCORE and the inline thesis-check CARD agree on what counts as a
// structure reference, a level, a direction, and an invalidation hook. Before
// this, the scorer had its own shorter keyword list and graded far more
// leniently than the card implied.
export function hasStructureWord(text: string): boolean {
  return hasAnyWord(text, STRUCTURE_WORDS);
}
export function hasDirectionWord(text: string): boolean {
  return hasAnyWord(text, DIRECTION_WORDS);
}
export function hasInvalidationHook(text: string): boolean {
  return hasAnyWord(text, INVALIDATION_HOOKS);
}
export function hasLevelReference(text: string): boolean {
  return NUMBER_LIKE.test(text);
}

export function critique(thesis: string, invalidation: string): ThesisCritique {
  const gaps: ThesisGap[] = [];
  const t = thesis.trim();
  const i = invalidation.trim();

  // Thesis: at least one structure word OR a number-like level. Otherwise
  // the writer probably stated a hunch ("I feel like it'll go up") with
  // nothing concrete behind it.
  if (t.length >= 20) {
    const hasStructure = hasAnyWord(t, STRUCTURE_WORDS);
    const hasLevel = NUMBER_LIKE.test(t);
    if (!hasStructure && !hasLevel) {
      gaps.push({
        field: "thesis",
        message:
          "Your thesis doesn't name a level or structural concept. A reviewable thesis cites at least one — a support price, a swing low, the trend direction.",
        severity: "warn",
      });
    } else if (!hasLevel) {
      gaps.push({
        field: "thesis",
        message:
          "Your thesis references structure but no specific level. Citing a price makes the idea checkable later.",
        severity: "info",
      });
    }
    if (!hasAnyWord(t, DIRECTION_WORDS)) {
      gaps.push({
        field: "thesis",
        message:
          "Your thesis doesn't state a direction or directional concept. Saying \"trend continues up\" or \"fades the rally\" anchors the trade.",
        severity: "info",
      });
    }
  }

  // Invalidation: must reference a level OR a structural hook
  // ("close below the swing low"). Pure feelings here are the most common
  // beginner trap.
  if (i.length >= 20) {
    const hasHook = hasAnyWord(i, INVALIDATION_HOOKS);
    const hasLevel = NUMBER_LIKE.test(i);
    if (!hasHook && !hasLevel) {
      gaps.push({
        field: "invalidation",
        message:
          "Your invalidation reads like a feeling, not a level. Real invalidation cites a price or a structural event (e.g. \"close below the swing low at $58.5k\").",
        severity: "warn",
      });
    } else if (!hasLevel) {
      gaps.push({
        field: "invalidation",
        message:
          "Your invalidation describes the structure but no specific price. Adding the level makes it pre-committed instead of negotiable.",
        severity: "info",
      });
    }
  }

  const hasWarn = gaps.some((g) => g.severity === "warn");
  const substantive = t.length >= 20 && i.length >= 20;
  return {
    gaps,
    solid: substantive && !hasWarn,
  };
}
