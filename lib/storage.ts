import {
  DEFAULT_INDICATOR_CONFIG,
  type Attempt,
  type ChartToolId,
  type IndicatorConfig,
  type PortfolioSession,
  type Scenario,
  type ScenarioSnapshot,
} from "./types";
import type { DiagnosticResult } from "./diagnostic";
import { recordStreakAttempt, STREAK_KEYS } from "./streak";

// v4.1.1 — inlined to avoid pulling lib/portfolio-challenge (and its
// transitive lib/portfolio + lib/portfolio-data dependencies) into every
// route that imports storage.ts. The canonical export of the same string
// lives in lib/portfolio-challenge as PORTFOLIO_CHALLENGE_KEY_NAME; a test
// in lib/__tests__/portfolio.test.ts asserts the two match.
export const PORTFOLIO_CHALLENGE_KEY_NAME_INLINE = "trainer.portfolioChallenges.v1";
// v5.0 — live paper-trading session. Same shape as a portfolio session, but
// fed by Coinbase REST polls instead of a synthetic generator. Kept under a
// separate localStorage key so /portfolio and /paper-trading can both have an
// active session simultaneously without stepping on each other.
const LIVE_PORTFOLIO_KEY = "trainer.livePositions.v1";

// v3.1 — pure helper that compresses a live Scenario into the persisted
// snapshot saved on every Attempt. Centralised so callers don't accidentally
// drop fields the review surfaces need.
export function buildScenarioSnapshot(scenario: Scenario): ScenarioSnapshot {
  return {
    title: scenario.title,
    symbol: scenario.symbol,
    timeframe: scenario.timeframe,
    setupType: scenario.setupType,
    difficulty: scenario.difficulty,
    visibleCandles: scenario.visibleCandles,
    hiddenCandles: scenario.hiddenCandles,
    keyLevels: scenario.keyLevels,
    preferredDecision: scenario.preferredDecision,
    outcome: scenario.outcome,
    idealDecisionPlan: scenario.idealDecisionPlan,
    dataSource: scenario.dataSource,
  };
}

const KEY = "trainer.attempts.v1";
const QUIZ_KEY = "trainer.quiz.v1";
const DIAGNOSTIC_KEY = "trainer.diagnostic.v1";
const ACTIVE_DRILL_KEY = "trainer.drill.v1";
const TUTORIAL_KEY = "trainer.tutorialDone.v1";
const CURRICULUM_KEY = "trainer.curriculum.v1";
// v2.0.1 — bookmarked scenario IDs the user wants to retry.
const BOOKMARKS_KEY = "trainer.bookmarks.v1";
// v2.1 Phase 4 — spaced-repetition tracking.
// lessonsReadAt: when the user actually opened a Learn term detail (resets cooldown).
// lessonsShownAt: when we last forced a micro-lesson for that term (prevents re-firing within 24h).
// microLessonsEnabled: user toggle. Default ON; disabling defeats the trainer's purpose but is allowed.
const LESSONS_READ_AT_KEY = "trainer.lessonsReadAt.v1";
const LESSONS_SHOWN_AT_KEY = "trainer.lessonsShownAt.v1";
const MICRO_LESSONS_ENABLED_KEY = "trainer.microLessons.v1";
// v2.3 — set once the user has completed (or skipped) the "watch me" first
// Practice walkthrough. While false AND the user has zero saved attempts, the
// Practice page replaces the decision form with the walkthrough and forces
// the scenario to tc-sol-2024-10.
const WATCH_ME_DONE_KEY = "trainer.watchMeDone.v1";
// v2.5 — AI features (BYOK). All off by default; the practice page
// only fires API calls when isAiEnabled() AND hasAiConsent() AND a key is
// present. Caches per-attempt review text and chat threads so revisiting
// the journal doesn't re-bill. Supports Anthropic and OpenAI providers.
const AI_ENABLED_KEY = "trainer.aiEnabled.v1";
const AI_KEY_KEY = "trainer.aiKey.v1";
const AI_MODEL_KEY = "trainer.aiModel.v1";
const AI_CONSENT_AT_KEY = "trainer.aiConsentAt.v1";
const AI_REVIEW_KEY = "trainer.aiReview.v1";
const AI_CHAT_KEY = "trainer.aiChat.v1";
const AI_PROVIDER_KEY = "trainer.aiProvider.v1";
const OPENAI_KEY_KEY = "trainer.openaiKey.v1";
const OPENAI_MODEL_KEY = "trainer.openaiModel.v1";
// v2.9 — User-set defaults that prefill new attempts. Removes the friction of
// re-entering risk %, leverage, and account size on every scenario. Falls back
// to the historic in-form defaults (1% / 3× / $1,000) when unset.
const DEFAULTS_KEY = "trainer.defaults.v1";
// v3.0 — when a scenario is loaded into Practice (not just attempted). Smart
// rotation in pickNextScenario uses this to prefer scenarios the user hasn't
// SEEN recently, not just hasn't attempted recently. Important because skipping
// past a scenario still teaches "stop showing me this" even if no attempt
// landed.
const SCENARIOS_SEEN_AT_KEY = "trainer.scenariosSeenAt.v1";
// v4.0.2 — per-user default for which chart overlays come on by default in
// Practice. Stored as a plain Record<ChartToolId, boolean>; missing keys fall
// back to false so adding a new tool in future versions doesn't auto-enable it
// for existing users.
const INDICATORS_KEY = "trainer.indicators.v1";
// v5.9.4 — params for Chris's Super Guppy. Stored as JSON; the modal in
// ChrisGuppySettings writes here. Missing-key fallback is the TV indicator's
// defaults (see CHRIS_GUPPY_DEFAULTS).
const CHRIS_GUPPY_KEY = "trainer.chrisGuppy.v1";
// v5.1.1 — chart color mode: "colorblind" (default, blue/orange/gray) or
// "standard" (green/red/amber). Read by the Super Guppy ribbon today; future
// trend-state-colored tools will read the same key. Missing-key fallback is
// the colorblind palette since it reads cleanly for everyone.
const COLOR_MODE_KEY = "trainer.colorMode.v1";
// v5.4.0 — paper-trading lessons that the user has dismissed. JSON array
// of lesson ids; lib/paper-trading-lessons consults this when picking the
// next lesson to show. One lesson is shown at a time; the user dismisses
// with "Got it" and the id is appended here.
const PAPER_LESSONS_KEY = "trainer.paperLessonsSeen.v1";
// v5.7.0 — last-chosen Coinbase product on /paper-trading. The start
// screen pre-fills with this so a returning user doesn't have to re-pick.
// Missing-key fallback is BTC-USD (the trainer's original single-symbol
// default through v5.6.x).
const LAST_PAPER_SYMBOL_KEY = "trainer.lastPaperSymbol.v1";
// v5.8.0 — active symbol within a multi-symbol live session. Stored
// alongside the session itself so refreshes preserve which tab the user
// was looking at. The active symbol is always present in
// session.symbols[].symbol; if a stale value is loaded that no longer
// matches any symbol in the active session, the page falls back to
// symbols[0].
const ACTIVE_PAPER_SYMBOL_KEY = "trainer.activePaperSymbol.v1";
// v4.1 — active portfolio session. We serialize the whole PortfolioSession
// (~40KB for the default 5-symbol × 42-candle basket) rather than just the
// seed so saved sessions stay valid across changes to lib/portfolio-data.
const PORTFOLIO_KEY = "trainer.openPositions.v1";

// Stamped on every new attempt so old saves remain interpretable after rule changes.
// v3.0 adds the optional `chart_tools` scoring category (only present when the
// scenario has availableIndicators AND the user took a non-wait position).
// v2.0 attempts continue to display correctly — they just lack that category.
// v2.0 added the optional `trade_management` category on the same opt-in
// pattern.
export const SCORING_VERSION = "3.0.0";

const ALL_KEYS = [
  KEY,
  QUIZ_KEY,
  DIAGNOSTIC_KEY,
  ACTIVE_DRILL_KEY,
  TUTORIAL_KEY,
  CURRICULUM_KEY,
  BOOKMARKS_KEY,
  LESSONS_READ_AT_KEY,
  LESSONS_SHOWN_AT_KEY,
  MICRO_LESSONS_ENABLED_KEY,
  WATCH_ME_DONE_KEY,
  AI_ENABLED_KEY,
  AI_KEY_KEY,
  AI_MODEL_KEY,
  AI_CONSENT_AT_KEY,
  AI_REVIEW_KEY,
  AI_CHAT_KEY,
  AI_PROVIDER_KEY,
  OPENAI_KEY_KEY,
  OPENAI_MODEL_KEY,
  DEFAULTS_KEY,
  SCENARIOS_SEEN_AT_KEY,
  INDICATORS_KEY,
  COLOR_MODE_KEY,
  PAPER_LESSONS_KEY,
  LAST_PAPER_SYMBOL_KEY,
  ACTIVE_PAPER_SYMBOL_KEY,
  // v5.2.0 — drawings persistence. Key string is owned by lib/drawings.ts so
  // that module stays the source of truth; mirrored here as a const so the
  // export/import round-trip survives a future rename without circular
  // imports.
  "trainer.drawings.v1",
  PORTFOLIO_KEY,
  PORTFOLIO_CHALLENGE_KEY_NAME_INLINE,
  LIVE_PORTFOLIO_KEY,
  ...STREAK_KEYS,
] as const;

export type QuizAttempt = {
  termId: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  missedQuestionIds?: number[];
  completedAt: number;
};

export type Mastery = "not_started" | "needs_work" | "improving" | "strong";

export const MASTERY_LABEL: Record<Mastery, string> = {
  not_started: "Not started",
  needs_work: "Needs work",
  improving: "Improving",
  strong: "Strong",
};

export function masteryFromPercent(pct: number | null): Mastery {
  if (pct == null) return "not_started";
  if (pct >= 80) return "strong";
  if (pct >= 60) return "improving";
  return "needs_work";
}

// v5.2.0 — exported so peer modules (lib/drawings.ts and other future
// storage-touching modules) can share the same SSR-safe guard without
// duplicating it. Local-only helper before this version.
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function listAttempts(): Attempt[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(a: Attempt): void {
  if (!isBrowser()) return;
  const all = listAttempts();
  all.push(a);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  // v2.1 Phase 3 — every saved attempt also bumps the daily streak counter.
  // Keeps streak state in sync without callers having to opt in.
  recordStreakAttempt();
}

export function deleteAttempt(id: string): void {
  if (!isBrowser()) return;
  const all = listAttempts().filter((a) => a.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function updateAttempt(id: string, patch: Partial<Attempt>): void {
  if (!isBrowser()) return;
  const all = listAttempts();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

// v2.4 — Append a timestamped annotation to a saved attempt. Used by the
// annotated-replay UI in the journal so users can return to old attempts
// and add new notes about what they now see differently.
export function appendAttemptAnnotation(id: string, note: string): void {
  if (!isBrowser()) return;
  const trimmed = note.trim();
  if (trimmed.length === 0) return;
  const all = listAttempts();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return;
  const existing = all[idx].annotations ?? [];
  all[idx] = {
    ...all[idx],
    annotations: [...existing, { at: Date.now(), note: trimmed }],
  };
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function listQuizAttempts(): QuizAttempt[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUIZ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveQuizAttempt(a: QuizAttempt): void {
  if (!isBrowser()) return;
  const all = listQuizAttempts();
  all.push(a);
  window.localStorage.setItem(QUIZ_KEY, JSON.stringify(all));
}

// Latest attempt per term — used to compute current mastery.
export function latestQuizByTerm(): Record<string, QuizAttempt> {
  const out: Record<string, QuizAttempt> = {};
  for (const a of listQuizAttempts()) {
    const cur = out[a.termId];
    if (!cur || a.completedAt > cur.completedAt) out[a.termId] = a;
  }
  return out;
}

export function masteryFor(termId: string): Mastery {
  const latest = latestQuizByTerm()[termId];
  if (!latest) return "not_started";
  return masteryFromPercent(latest.scorePercent);
}

export function getDiagnostic(): DiagnosticResult | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DIAGNOSTIC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiagnosticResult;
  } catch {
    return null;
  }
}

export function saveDiagnostic(d: DiagnosticResult): void {
  if (!isBrowser()) return;
  // v2.4 — chain previous diagnostics so the Training Path can show a
  // Before/Now comparison on retake. We avoid keeping deeper history (the
  // .previous chain is intentionally only one level deep) so old results
  // don't bloat localStorage forever.
  const existing = getDiagnostic();
  const next: DiagnosticResult = existing
    ? { ...d, previous: { ...existing, previous: undefined } }
    : d;
  window.localStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(next));
}

export function clearDiagnostic(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DIAGNOSTIC_KEY);
}

export type ActiveDrill = {
  drillId: string;
  startedAt: number;
  completed: number; // attempts saved while this drill was active
};

export function getActiveDrill(): ActiveDrill | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_DRILL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveDrill;
  } catch {
    return null;
  }
}

export function setActiveDrill(drillId: string): void {
  if (!isBrowser()) return;
  const existing = getActiveDrill();
  if (existing && existing.drillId === drillId) return;
  const next: ActiveDrill = { drillId, startedAt: Date.now(), completed: 0 };
  window.localStorage.setItem(ACTIVE_DRILL_KEY, JSON.stringify(next));
}

export function incrementDrillProgress(): void {
  if (!isBrowser()) return;
  const existing = getActiveDrill();
  if (!existing) return;
  const next = { ...existing, completed: existing.completed + 1 };
  window.localStorage.setItem(ACTIVE_DRILL_KEY, JSON.stringify(next));
}

export function clearActiveDrill(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACTIVE_DRILL_KEY);
}

export function clearAllQuiz(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(QUIZ_KEY);
}

// v2.0.1 — bookmarks. Stored as a string[] of scenarioIds.
export function listBookmarks(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(scenarioId: string): boolean {
  return listBookmarks().includes(scenarioId);
}

export function toggleBookmark(scenarioId: string): boolean {
  if (!isBrowser()) return false;
  const list = listBookmarks();
  const idx = list.indexOf(scenarioId);
  if (idx >= 0) {
    list.splice(idx, 1);
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    return false;
  }
  list.push(scenarioId);
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  return true;
}

// v2.1 Phase 4 — spaced-repetition timestamps.

function readTimestampMap(key: string): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function writeTimestamp(key: string, termId: string, ts: number): void {
  if (!isBrowser()) return;
  const map = readTimestampMap(key);
  map[termId] = ts;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

export function getLessonsReadAt(): Record<string, number> {
  return readTimestampMap(LESSONS_READ_AT_KEY);
}

export function markLessonReviewed(termId: string, now: number = Date.now()): void {
  writeTimestamp(LESSONS_READ_AT_KEY, termId, now);
}

export function getLessonsShownAt(): Record<string, number> {
  return readTimestampMap(LESSONS_SHOWN_AT_KEY);
}

export function markLessonShown(termId: string, now: number = Date.now()): void {
  writeTimestamp(LESSONS_SHOWN_AT_KEY, termId, now);
}

export function isForceLessonsEnabled(): boolean {
  if (!isBrowser()) return true;
  // Default: enabled (turning off requires explicit opt-out).
  return window.localStorage.getItem(MICRO_LESSONS_ENABLED_KEY) !== "off";
}

export function setForceLessonsEnabled(on: boolean): void {
  if (!isBrowser()) return;
  if (on) {
    window.localStorage.removeItem(MICRO_LESSONS_ENABLED_KEY);
  } else {
    window.localStorage.setItem(MICRO_LESSONS_ENABLED_KEY, "off");
  }
}

// v2.3 — "Watch me" first-Practice walkthrough state. Returns true once the
// user has either completed or explicitly skipped the demo.
export function isWatchMeDone(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(WATCH_ME_DONE_KEY) === "true";
}

export function markWatchMeDone(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(WATCH_ME_DONE_KEY, "true");
  } catch {
    // ignore quota errors
  }
}

export function clearWatchMeDone(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(WATCH_ME_DONE_KEY);
  } catch {
    // ignore
  }
}

// ─── v2.5: AI features (BYOK) ─────────────────────────────────────────────────

export type AiProvider = "anthropic" | "openai";
export const DEFAULT_AI_PROVIDER: AiProvider = "anthropic";

export type AiModel = "claude-haiku-4-5-20251001" | "claude-sonnet-4-6";
export const DEFAULT_AI_MODEL: AiModel = "claude-haiku-4-5-20251001";

export type OpenAiModel = "gpt-4o-mini" | "gpt-4o";
export const DEFAULT_OPENAI_MODEL: OpenAiModel = "gpt-4o-mini";

export type AiCachedReview = {
  model: string;
  text: string;
  createdAt: number;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export function isAiEnabled(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(AI_ENABLED_KEY) === "true";
}

export function setAiEnabled(on: boolean): void {
  if (!isBrowser()) return;
  if (on) window.localStorage.setItem(AI_ENABLED_KEY, "true");
  else window.localStorage.removeItem(AI_ENABLED_KEY);
}

export function getAiKey(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(AI_KEY_KEY) ?? "";
}

export function setAiKey(key: string): void {
  if (!isBrowser()) return;
  const trimmed = key.trim();
  if (trimmed.length === 0) window.localStorage.removeItem(AI_KEY_KEY);
  else window.localStorage.setItem(AI_KEY_KEY, trimmed);
}

export function clearAiKey(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AI_KEY_KEY);
}

export function getAiModel(): AiModel {
  if (!isBrowser()) return DEFAULT_AI_MODEL;
  const raw = window.localStorage.getItem(AI_MODEL_KEY);
  if (raw === "claude-sonnet-4-6") return "claude-sonnet-4-6";
  return DEFAULT_AI_MODEL;
}

export function setAiModel(m: AiModel): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(AI_MODEL_KEY, m);
}

export function getAiProvider(): AiProvider {
  if (!isBrowser()) return DEFAULT_AI_PROVIDER;
  const raw = window.localStorage.getItem(AI_PROVIDER_KEY);
  if (raw === "openai") return "openai";
  return DEFAULT_AI_PROVIDER;
}

export function setAiProvider(p: AiProvider): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(AI_PROVIDER_KEY, p);
}

export function getOpenAiKey(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(OPENAI_KEY_KEY) ?? "";
}

export function setOpenAiKey(key: string): void {
  if (!isBrowser()) return;
  const trimmed = key.trim();
  if (trimmed.length === 0) window.localStorage.removeItem(OPENAI_KEY_KEY);
  else window.localStorage.setItem(OPENAI_KEY_KEY, trimmed);
}

export function clearOpenAiKey(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(OPENAI_KEY_KEY);
}

export function getOpenAiModel(): OpenAiModel {
  if (!isBrowser()) return DEFAULT_OPENAI_MODEL;
  const raw = window.localStorage.getItem(OPENAI_MODEL_KEY);
  if (raw === "gpt-4o") return "gpt-4o";
  return DEFAULT_OPENAI_MODEL;
}

export function setOpenAiModel(m: OpenAiModel): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(OPENAI_MODEL_KEY, m);
}

export function hasAiConsent(): boolean {
  if (!isBrowser()) return false;
  return !!window.localStorage.getItem(AI_CONSENT_AT_KEY);
}

export function getAiConsentAt(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(AI_CONSENT_AT_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function markAiConsent(): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(AI_CONSENT_AT_KEY, Date.now().toString());
}

export function revokeAiConsent(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AI_CONSENT_AT_KEY);
  window.localStorage.removeItem(AI_ENABLED_KEY);
  // Key intentionally left so the user can re-enable without re-pasting; the
  // settings panel exposes a separate "Clear key" action.
}

// Cached reviews — keyed by attempt.id. Returns null when not cached.
export function getCachedReview(attemptId: string): AiCachedReview | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(AI_REVIEW_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, AiCachedReview>;
    return all[attemptId] ?? null;
  } catch {
    return null;
  }
}

export function cacheReview(attemptId: string, review: AiCachedReview): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(AI_REVIEW_KEY);
    const all = (raw ? (JSON.parse(raw) as Record<string, AiCachedReview>) : {}) as Record<string, AiCachedReview>;
    all[attemptId] = review;
    window.localStorage.setItem(AI_REVIEW_KEY, JSON.stringify(all));
  } catch {
    // ignore quota errors
  }
}

export function clearCachedReview(attemptId: string): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(AI_REVIEW_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, AiCachedReview>;
    delete all[attemptId];
    window.localStorage.setItem(AI_REVIEW_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// Chat threads — also keyed by attempt.id. Each thread is an array of
// user/assistant messages in order.
export function getChatHistory(attemptId: string): AiChatMessage[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(AI_CHAT_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, AiChatMessage[]>;
    return all[attemptId] ?? [];
  } catch {
    return [];
  }
}

export function appendChatMessage(attemptId: string, msg: AiChatMessage): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(AI_CHAT_KEY);
    const all = (raw ? (JSON.parse(raw) as Record<string, AiChatMessage[]>) : {}) as Record<string, AiChatMessage[]>;
    const existing = all[attemptId] ?? [];
    all[attemptId] = [...existing, msg];
    window.localStorage.setItem(AI_CHAT_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function clearChatHistory(attemptId: string): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(AI_CHAT_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, AiChatMessage[]>;
    delete all[attemptId];
    window.localStorage.setItem(AI_CHAT_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// v2.0.1 — per-scenario attempt summary.
export function attemptsForScenario(scenarioId: string): {
  count: number;
  bestScore: number | null;
  lastScore: number | null;
} {
  const all = listAttempts().filter((a) => a.scenarioId === scenarioId);
  if (all.length === 0) return { count: 0, bestScore: null, lastScore: null };
  const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);
  return {
    count: all.length,
    bestScore: all.reduce((m, a) => Math.max(m, a.score.total), 0),
    lastScore: sorted[0].score.total,
  };
}

export function resetAllLocalData(): void {
  if (!isBrowser()) return;
  for (const k of ALL_KEYS) window.localStorage.removeItem(k);
}

// v2.9 — Trading defaults the user can set once in Settings. Prefilled into
// the DecisionForm and used as the account size for risk-dollar math.
// Defaults match the previously-hardcoded in-form values so behaviour is
// unchanged for users who never visit Settings.
export type DecisionDefaults = {
  riskPercent: number;
  leverage: number;
  accountSize: number;
};

export const DEFAULT_DECISION_DEFAULTS: DecisionDefaults = {
  riskPercent: 1,
  leverage: 3,
  accountSize: 1000,
};

export function getDecisionDefaults(): DecisionDefaults {
  if (!isBrowser()) return { ...DEFAULT_DECISION_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return { ...DEFAULT_DECISION_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<DecisionDefaults>;
    return {
      riskPercent:
        typeof parsed.riskPercent === "number" && parsed.riskPercent > 0
          ? parsed.riskPercent
          : DEFAULT_DECISION_DEFAULTS.riskPercent,
      leverage:
        typeof parsed.leverage === "number" && parsed.leverage >= 1
          ? parsed.leverage
          : DEFAULT_DECISION_DEFAULTS.leverage,
      accountSize:
        typeof parsed.accountSize === "number" && parsed.accountSize > 0
          ? parsed.accountSize
          : DEFAULT_DECISION_DEFAULTS.accountSize,
    };
  } catch {
    return { ...DEFAULT_DECISION_DEFAULTS };
  }
}

export function setDecisionDefaults(next: Partial<DecisionDefaults>): DecisionDefaults {
  const current = getDecisionDefaults();
  const merged: DecisionDefaults = {
    riskPercent: next.riskPercent ?? current.riskPercent,
    leverage: next.leverage ?? current.leverage,
    accountSize: next.accountSize ?? current.accountSize,
  };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify(merged));
    } catch {
      // ignore quota
    }
  }
  return merged;
}

// v4.0.2 — default indicator overlays for the Practice chart. The Practice
// page seeds its session-level toggles from this on mount; flipping a toggle in
// the Settings UI is what changes the persisted value, not toggling on the
// chart itself (so per-scenario experimentation stays separate from "what I
// normally want on").
export function getDefaultIndicators(): IndicatorConfig {
  if (!isBrowser()) return { ...DEFAULT_INDICATOR_CONFIG };
  try {
    const raw = window.localStorage.getItem(INDICATORS_KEY);
    if (!raw) return { ...DEFAULT_INDICATOR_CONFIG };
    const parsed = JSON.parse(raw) as Partial<Record<ChartToolId, unknown>>;
    const out: IndicatorConfig = { ...DEFAULT_INDICATOR_CONFIG };
    for (const id of Object.keys(out) as ChartToolId[]) {
      if (typeof parsed[id] === "boolean") out[id] = parsed[id] as boolean;
    }
    return out;
  } catch {
    return { ...DEFAULT_INDICATOR_CONFIG };
  }
}

export function setDefaultIndicators(next: Partial<IndicatorConfig>): IndicatorConfig {
  const current = getDefaultIndicators();
  const merged: IndicatorConfig = { ...current, ...next };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(INDICATORS_KEY, JSON.stringify(merged));
    } catch {
      // ignore quota
    }
  }
  return merged;
}

// v5.9.4 — Chris's Super Guppy params, persisted across sessions. Reads
// fall back to CHRIS_GUPPY_DEFAULTS for any missing/corrupted field so the
// shape stays valid even after schema additions in future versions.
import {
  CHRIS_GUPPY_DEFAULTS,
  type ChrisGuppyParams,
  type ChrisGuppySource,
} from "./indicators-chris-guppy";

const VALID_SOURCES: ChrisGuppySource[] = [
  "close",
  "open",
  "high",
  "low",
  "hl2",
  "hlc3",
  "ohlc4",
];

export function getChrisGuppyParams(): ChrisGuppyParams {
  if (!isBrowser()) return { ...CHRIS_GUPPY_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(CHRIS_GUPPY_KEY);
    if (!raw) return { ...CHRIS_GUPPY_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ChrisGuppyParams>;
    const fast = Array.isArray(parsed.fast)
      ? parsed.fast
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0)
      : null;
    const slow = Array.isArray(parsed.slow)
      ? parsed.slow
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0)
      : null;
    return {
      fast:
        fast && fast.length > 0
          ? fast.slice(0, CHRIS_GUPPY_DEFAULTS.fast.length)
          : [...CHRIS_GUPPY_DEFAULTS.fast],
      slow:
        slow && slow.length > 0
          ? slow.slice(0, CHRIS_GUPPY_DEFAULTS.slow.length)
          : [...CHRIS_GUPPY_DEFAULTS.slow],
      ema200Length:
        Number.isFinite(parsed.ema200Length) && (parsed.ema200Length as number) > 0
          ? (parsed.ema200Length as number)
          : CHRIS_GUPPY_DEFAULTS.ema200Length,
      source:
        typeof parsed.source === "string" &&
        VALID_SOURCES.includes(parsed.source as ChrisGuppySource)
          ? (parsed.source as ChrisGuppySource)
          : CHRIS_GUPPY_DEFAULTS.source,
      showAverageCurves:
        typeof parsed.showAverageCurves === "boolean"
          ? parsed.showAverageCurves
          : CHRIS_GUPPY_DEFAULTS.showAverageCurves,
      show200:
        typeof parsed.show200 === "boolean"
          ? parsed.show200
          : CHRIS_GUPPY_DEFAULTS.show200,
      filterWith200:
        typeof parsed.filterWith200 === "boolean"
          ? parsed.filterWith200
          : CHRIS_GUPPY_DEFAULTS.filterWith200,
      colourCandles:
        typeof parsed.colourCandles === "boolean"
          ? parsed.colourCandles
          : CHRIS_GUPPY_DEFAULTS.colourCandles,
    };
  } catch {
    return { ...CHRIS_GUPPY_DEFAULTS };
  }
}

export function setChrisGuppyParams(next: ChrisGuppyParams): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CHRIS_GUPPY_KEY, JSON.stringify(next));
    // Same-tab broadcast so any open chart re-reads and repaints without
    // requiring a navigation event.
    window.dispatchEvent(new CustomEvent("trainer:chris-guppy-change"));
  } catch {
    // ignore quota
  }
}

// v5.1.1 — chart color mode getter/setter. The Super Guppy ribbon reads
// this on render. Missing-key fallback is "colorblind" since blue/orange
// reads cleanly across the board; opting into "standard" is an explicit
// user choice in Settings.
export type StoredColorMode = "colorblind" | "standard";

export function getColorMode(): StoredColorMode {
  if (!isBrowser()) return "colorblind";
  try {
    const raw = window.localStorage.getItem(COLOR_MODE_KEY);
    if (raw === "standard") return "standard";
    if (raw === "colorblind") return "colorblind";
    return "colorblind";
  } catch {
    return "colorblind";
  }
}

export function setColorMode(mode: StoredColorMode): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(COLOR_MODE_KEY, mode);
    // v5.6.6 — dispatch a same-tab event so any mounted Chart (which is
    // listening for it) can re-read and repaint. The native 'storage'
    // event only fires for OTHER tabs in the same origin — same-tab
    // changes leave existing charts stuck on the old palette until the
    // window happens to refocus.
    window.dispatchEvent(new CustomEvent("trainer:color-mode-change"));
  } catch {
    // ignore quota
  }
}

// v5.4.0 — paper-trading lesson tracking. JSON-array of dismissed lesson
// ids. Each call to markPaperLessonSeen appends an id idempotently; reads
// return the current set. Strings are kept untyped here so a future lesson
// id added to the lib doesn't require a storage-key schema bump.
export function getPaperLessonsSeen(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = window.localStorage.getItem(PAPER_LESSONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s): s is string => typeof s === "string"));
  } catch {
    return new Set();
  }
}

export function markPaperLessonSeen(id: string): void {
  if (!isBrowser()) return;
  try {
    const current = getPaperLessonsSeen();
    if (current.has(id)) return;
    current.add(id);
    window.localStorage.setItem(
      PAPER_LESSONS_KEY,
      JSON.stringify([...current])
    );
  } catch {
    // ignore quota
  }
}

// Used by Settings → Data management to wipe and let the user re-see the
// in-context lessons (useful when returning after a long break).
export function clearPaperLessonsSeen(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PAPER_LESSONS_KEY);
  } catch {
    // ignore
  }
}

// v5.7.0 — last-chosen Coinbase product on /paper-trading. Returned as a
// product id like "BTC-USD"; the start screen uses this to seed the
// picker's default selection on mount.
export function getLastPaperSymbol(): string {
  if (!isBrowser()) return "BTC-USD";
  try {
    const raw = window.localStorage.getItem(LAST_PAPER_SYMBOL_KEY);
    return raw && /^[A-Z0-9]+-USD$/.test(raw) ? raw : "BTC-USD";
  } catch {
    return "BTC-USD";
  }
}

export function setLastPaperSymbol(productId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_PAPER_SYMBOL_KEY, productId);
  } catch {
    // ignore quota
  }
}

// v5.8.0 — active tab within a multi-symbol session. Returns null when
// no stored value exists or it was cleared; the page falls back to
// session.symbols[0] in that case.
export function getActivePaperSymbol(): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_PAPER_SYMBOL_KEY);
    return raw && /^[A-Z0-9]+-USD$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setActivePaperSymbol(productId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACTIVE_PAPER_SYMBOL_KEY, productId);
  } catch {
    // ignore quota
  }
}

// v4.1 — Portfolio session storage. One active session at a time. Saving
// overwrites; clearing wipes the slot (used when the user explicitly ends a
// session or wants to start over).
export function getPortfolioSession(): PortfolioSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PortfolioSession;
  } catch {
    return null;
  }
}

export function savePortfolioSession(session: PortfolioSession): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(session));
  } catch {
    // ignore quota — the session is large enough that very small quotas
    // (<100KB) could reject it. Caller may surface a warning if needed.
  }
}

export function clearPortfolioSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PORTFOLIO_KEY);
}

// v5.0 — Live paper-trading session storage. Same get/save/clear pattern as
// the synthetic portfolio session, just under a separate key so the two
// surfaces don't collide. The session payload is large for long-running live
// sessions (history grows with each polled candle) — caller is expected to
// trim history before save if running for many days.
export function getLiveSession(): PortfolioSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LIVE_PORTFOLIO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PortfolioSession;
  } catch {
    return null;
  }
}

export function saveLiveSession(session: PortfolioSession): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LIVE_PORTFOLIO_KEY, JSON.stringify(session));
  } catch {
    // ignore quota — caller may want to trim history and retry
  }
}

export function clearLiveSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LIVE_PORTFOLIO_KEY);
}

// v3.0 — Scenario "last seen" tracking. Feeds smart rotation in
// pickNextScenario so the user doesn't keep cycling through the same handful
// of scenarios just because their attempt timestamps are bunched together.
//
// "Seen" = the scenario was loaded into the Practice surface (the user looked
// at the chart). Distinct from "attempted" (the user submitted a decision).
// Skipped scenarios should still get pushed to the back of the queue.

export function getScenariosSeenAt(): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(SCENARIOS_SEEN_AT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function markScenarioSeen(scenarioId: string, now: number = Date.now()): void {
  if (!isBrowser()) return;
  const map = getScenariosSeenAt();
  map[scenarioId] = now;
  try {
    window.localStorage.setItem(SCENARIOS_SEEN_AT_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

export type ExportPayload = {
  version: string;
  exportedAt: number;
  attempts: Attempt[];
  quizAttempts: QuizAttempt[];
  diagnostic: DiagnosticResult | null;
  activeDrill: ActiveDrill | null;
};

export function exportAllData(): ExportPayload {
  return {
    version: SCORING_VERSION,
    exportedAt: Date.now(),
    attempts: listAttempts(),
    quizAttempts: listQuizAttempts(),
    diagnostic: getDiagnostic(),
    activeDrill: getActiveDrill(),
  };
}

export type ImportResult = {
  ok: boolean;
  imported?: {
    attempts: number;
    quizAttempts: number;
    diagnostic: boolean;
    activeDrill: boolean;
  };
  error?: string;
};

export function importAllData(json: string): ImportResult {
  if (!isBrowser()) return { ok: false, error: "Storage not available." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Payload is not an object." };
  }
  const p = parsed as Partial<ExportPayload>;
  if (!Array.isArray(p.attempts) || !Array.isArray(p.quizAttempts)) {
    return { ok: false, error: "Missing required fields (attempts, quizAttempts)." };
  }
  window.localStorage.setItem(KEY, JSON.stringify(p.attempts));
  window.localStorage.setItem(QUIZ_KEY, JSON.stringify(p.quizAttempts));
  if (p.diagnostic) {
    window.localStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(p.diagnostic));
  } else {
    window.localStorage.removeItem(DIAGNOSTIC_KEY);
  }
  if (p.activeDrill) {
    window.localStorage.setItem(ACTIVE_DRILL_KEY, JSON.stringify(p.activeDrill));
  } else {
    window.localStorage.removeItem(ACTIVE_DRILL_KEY);
  }
  return {
    ok: true,
    imported: {
      attempts: p.attempts.length,
      quizAttempts: p.quizAttempts.length,
      diagnostic: !!p.diagnostic,
      activeDrill: !!p.activeDrill,
    },
  };
}
