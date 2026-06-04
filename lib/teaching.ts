// v2.1 Phase 4 — spaced-repetition for repeated mistake tags.
//
// Goal: turn the trainer from "test repeatedly" into "test, then teach the
// gap." Today the app catches mistakes once and moves on; a beginner can
// trigger no_stop_loss five times in a row and just see the same lesson
// recommendation link each time.
//
// Logic:
//   For each non-positive tag T:
//     - count hits in the last `windowSize` (default 10) attempts → `recentCount`
//     - find the recommended Learn term for T via MISTAKE_TO_LEARN
//     - the lesson is "stale" if the user has never reviewed it OR it's been
//       > REVIEW_FRESHNESS_MS since they did
//     - the lesson is "cooling down" if we've already shown them this exact
//       micro-lesson in the last SHOWN_COOLDOWN_MS
//     - shouldForceRepetition(T) is true when recentCount ≥ HIT_THRESHOLD AND
//       stale AND not cooling down
//
// Threshold values are conservative defaults — over-firing is annoying,
// under-firing defeats the purpose. Plan to tune after a week of dogfood.

import { MISTAKE_TAGS } from "./mistakes";
import { MISTAKE_TO_LEARN, termForTag, type LearnTerm } from "./learn";
import { getLessonsReadAt, getLessonsShownAt, listAttempts } from "./storage";
import type { Attempt, MistakeTag } from "./types";

export const HIT_THRESHOLD = 3;
export const WINDOW_SIZE = 10;
const REVIEW_FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24h
const SHOWN_COOLDOWN_MS = 24 * 60 * 60 * 1000;   // 24h

// Count occurrences of `tag` in the user's most recent attempts. Positive tags
// (wait_was_best, managed_well) are excluded — they're not mistakes to drill on.
export function recentTagCount(
  tag: MistakeTag,
  attempts: Attempt[] = listAttempts(),
  windowSize: number = WINDOW_SIZE
): number {
  const info = MISTAKE_TAGS[tag];
  if (info?.positive) return 0;
  const sorted = [...attempts].sort((a, b) => b.createdAt - a.createdAt).slice(0, windowSize);
  let n = 0;
  for (const a of sorted) {
    if (a.score.tags.includes(tag)) n++;
  }
  return n;
}

type RepetitionVerdict = {
  shouldFire: boolean;
  reason: "ok" | "below_threshold" | "no_term" | "positive_tag" | "freshly_reviewed" | "shown_recently";
  count: number;
  term: LearnTerm | null;
};

export function repetitionVerdict(
  tag: MistakeTag,
  attempts: Attempt[] = listAttempts(),
  now: number = Date.now()
): RepetitionVerdict {
  const info = MISTAKE_TAGS[tag];
  if (info?.positive) return { shouldFire: false, reason: "positive_tag", count: 0, term: null };
  const count = recentTagCount(tag, attempts);
  const term = termForTag(tag);
  if (!term) return { shouldFire: false, reason: "no_term", count, term: null };
  if (count < HIT_THRESHOLD) return { shouldFire: false, reason: "below_threshold", count, term };
  const readAt = getLessonsReadAt()[term.id] ?? 0;
  if (now - readAt < REVIEW_FRESHNESS_MS) {
    return { shouldFire: false, reason: "freshly_reviewed", count, term };
  }
  const shownAt = getLessonsShownAt()[term.id] ?? 0;
  if (now - shownAt < SHOWN_COOLDOWN_MS) {
    return { shouldFire: false, reason: "shown_recently", count, term };
  }
  return { shouldFire: true, reason: "ok", count, term };
}

export function shouldForceRepetition(
  tag: MistakeTag,
  attempts: Attempt[] = listAttempts()
): boolean {
  return repetitionVerdict(tag, attempts).shouldFire;
}

// Given a fresh attempt's tags, pick the FIRST one (by MISTAKE_TO_LEARN
// priority, desc) that warrants a forced lesson. Firing only one per attempt
// avoids stacking modals; subsequent tags surface on later attempts if they
// keep hitting the threshold.
//
// QoL fix #X4: the prior version iterated tags in arrival order (scoring
// breakdown order: direction, risk, rr, stop, leverage, ...) — so an attempt
// with both `no_stop_loss` (priority 100) and `risk_too_high` (95) would
// teach `risk_too_high` first. The most-account-threatening lesson should win.
export function pickForcedLesson(
  tags: MistakeTag[],
  attempts: Attempt[] = listAttempts()
): { tag: MistakeTag; term: LearnTerm; count: number } | null {
  const ordered = [...tags].sort((a, b) => {
    const pa = MISTAKE_TO_LEARN[a]?.priority ?? 0;
    const pb = MISTAKE_TO_LEARN[b]?.priority ?? 0;
    return pb - pa;
  });
  for (const tag of ordered) {
    const v = repetitionVerdict(tag, attempts);
    if (v.shouldFire && v.term) {
      return { tag, term: v.term, count: v.count };
    }
  }
  return null;
}

// Used by the Dashboard "Repeated mistakes you haven't reviewed" widget.
// Returns tags that have crossed the threshold AND have stale lessons,
// regardless of cooldown (the dashboard isn't gated by shown-recently — the
// user opens it of their own accord).
export type PendingRepetition = {
  tag: MistakeTag;
  term: LearnTerm;
  count: number;
};

export function listPendingMicroLessons(
  attempts: Attempt[] = listAttempts(),
  now: number = Date.now()
): PendingRepetition[] {
  const seen = new Set<MistakeTag>();
  const out: PendingRepetition[] = [];
  const sorted = [...attempts].sort((a, b) => b.createdAt - a.createdAt).slice(0, WINDOW_SIZE);
  for (const a of sorted) {
    for (const tag of a.score.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      const info = MISTAKE_TAGS[tag];
      if (info?.positive) continue;
      const term = termForTag(tag);
      if (!term) continue;
      const count = recentTagCount(tag, attempts);
      if (count < HIT_THRESHOLD) continue;
      const readAt = getLessonsReadAt()[term.id] ?? 0;
      if (now - readAt < REVIEW_FRESHNESS_MS) continue;
      out.push({ tag, term, count });
    }
  }
  // Highest count first (most repeated).
  return out.sort((a, b) => b.count - a.count);
}
