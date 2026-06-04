// v2.1 Phase 3 — daily streak + practice goal.
//
// One of the most reliable retention mechanisms in consumer apps. Streak counts
// consecutive days with ≥1 saved attempt; goal is N attempts per day (default 3).
// All local — no backend, no notifications (those are a separate add-on).
//
// Date math is anchored to the USER'S LOCAL DAY (not UTC). Reason: a user who
// trades at 11 PM and again at 1 AM expects "two days in a row." UTC would
// produce inconsistent boundaries for users in non-UTC timezones.
//
// All public functions are safe to call during SSR (return defaults rather than
// touching window.localStorage).

const STREAK_KEY = "trainer.streak.v1";
const GOAL_KEY = "trainer.dailyGoal.v1";

export const DEFAULT_DAILY_GOAL = 3;
const MIN_GOAL = 1;
const MAX_GOAL = 20;

export type StreakState = {
  current: number;        // consecutive days with ≥1 attempt
  longest: number;        // best streak ever
  lastActiveDay: string;  // YYYY-MM-DD in local time
  todayCount: number;     // attempts saved today
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// Local YYYY-MM-DD. Using getFullYear/getMonth/getDate so the boundary matches
// what the user perceives as "today" in their timezone. ISO formatting in UTC
// would produce wrong dates for negative UTC offsets in the evening.
function localDayString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localYesterday(d: Date = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return localDayString(y);
}

const EMPTY_STATE: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDay: "",
  todayCount: 0,
};

export function getStreak(): StreakState {
  if (!isBrowser()) return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      current: Number(parsed.current) || 0,
      longest: Number(parsed.longest) || 0,
      lastActiveDay: typeof parsed.lastActiveDay === "string" ? parsed.lastActiveDay : "",
      todayCount: Number(parsed.todayCount) || 0,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function saveStreak(state: StreakState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

/**
 * Call from saveAttempt(). Returns the new state for convenience.
 *
 * Logic:
 *   - same day as lastActive  → todayCount++
 *   - lastActive was yesterday → current++, todayCount = 1
 *   - otherwise (first ever or gap) → current = 1, todayCount = 1
 *   - longest always = max(longest, current)
 */
export function recordStreakAttempt(now: Date = new Date()): StreakState {
  const state = getStreak();
  const today = localDayString(now);
  const yesterday = localYesterday(now);

  if (state.lastActiveDay === today) {
    state.todayCount = state.todayCount + 1;
  } else if (state.lastActiveDay === yesterday) {
    state.current = state.current + 1;
    state.todayCount = 1;
  } else {
    state.current = 1;
    state.todayCount = 1;
  }
  state.lastActiveDay = today;
  state.longest = Math.max(state.longest, state.current);
  saveStreak(state);
  return state;
}

/**
 * Returns the current streak as the user should see it now. If the user hasn't
 * recorded an attempt today AND the last active day is not yesterday OR today,
 * the visible streak is 0 (it's already broken). The stored state isn't mutated
 * until they save the next attempt — keeps "yesterday's broken streak" visible
 * so they know what they lost.
 *
 * Pass `now` for tests.
 */
export function visibleStreak(now: Date = new Date()): {
  current: number;
  longest: number;
  todayCount: number;
  isBrokenButRecoverable: boolean;
} {
  const s = getStreak();
  const today = localDayString(now);
  const yesterday = localYesterday(now);
  if (s.lastActiveDay === today) {
    return { current: s.current, longest: s.longest, todayCount: s.todayCount, isBrokenButRecoverable: false };
  }
  if (s.lastActiveDay === yesterday) {
    // Yesterday's attempt counts toward the active streak; today is fresh.
    return { current: s.current, longest: s.longest, todayCount: 0, isBrokenButRecoverable: false };
  }
  // Gap of ≥2 days. Streak is effectively broken.
  return { current: 0, longest: s.longest, todayCount: 0, isBrokenButRecoverable: s.current > 0 };
}

// --- Daily goal --------------------------------------------------------------

export function getDailyGoal(): number {
  if (!isBrowser()) return DEFAULT_DAILY_GOAL;
  try {
    const raw = window.localStorage.getItem(GOAL_KEY);
    if (!raw) return DEFAULT_DAILY_GOAL;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_DAILY_GOAL;
    return Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(n)));
  } catch {
    return DEFAULT_DAILY_GOAL;
  }
}

export function setDailyGoal(n: number): void {
  if (!isBrowser()) return;
  const clamped = Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(n)));
  try {
    window.localStorage.setItem(GOAL_KEY, String(clamped));
  } catch {
    // ignore
  }
}

export const STREAK_KEYS = [STREAK_KEY, GOAL_KEY] as const;
