import type { SkillId } from "./skills";

export type DiagnosticProfile =
  | "beginner"
  | "developing"
  | "practice_ready"
  | "risk_warning";

export const PROFILE_LABEL: Record<DiagnosticProfile, string> = {
  beginner: "Beginner",
  developing: "Developing",
  practice_ready: "Practice ready",
  // v2.3 — renamed from "Risk warning" to a coaching tone. The underlying
  // profile id stays risk_warning so saved diagnostics still load.
  risk_warning: "First focus area",
};

export const PROFILE_BLURB: Record<DiagnosticProfile, string> = {
  beginner:
    "Start with the basics. Risk management and stop placement come before chart pattern hunting.",
  developing:
    "You've got the building blocks. Sharpen weak skills before chasing complex setups.",
  practice_ready:
    "Solid foundation. Use Practice to repeat weak setups until averages come up.",
  // v2.3 — coaching tone. Same recommended action, less judgmental framing.
  risk_warning:
    "Your first focus area is risk discipline. Start with position sizing and stops before anything else — the rest gets easier once these are second nature.",
};

export type DiagnosticQuestion = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  // Which skill this question's correctness informs. Drives weakSkill in assignProfile.
  skillSignal: SkillId;
  // Wrong answers on these questions force the risk_warning profile.
  hardFlag?: boolean;
  // v2.3 — optional MiniChart key from CHART_SPECS. When set, the question
  // renders the chart above the options instead of asking the user to read
  // a text price stream. Beginners can't picture "$58k → $61k → $60k".
  chartKey?: string;
  // v2.3 — optional normalizing line prepended to the explanation when the
  // user picks a wrong answer. Eases the sting of failing your first
  // interaction with the app.
  wrongAnswerEncouragement?: string;
};

// Single source of truth for the diagnostic. To extend, append a new entry — the
// component is data-driven and no UI changes are needed.
//
// v2.3 ordering — Q1 is now the visual chart-reading question. The previous
// math word problem (risk_math) sits at Q2. Beginners get a confidence-building
// pictorial start instead of an unwelcoming math test.
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "trend_reading",
    title: "Chart reading",
    prompt:
      "Look at the chart below — a recent run of candles on the daily. Which best describes the trend?",
    options: ["Downtrend", "Uptrend — higher highs and higher lows", "Range chop"],
    correct: 1,
    explanation:
      "Each successive high is higher than the last, and each pullback bottoms above the previous one. That's the definition of an uptrend — higher highs and higher lows.",
    skillSignal: "direction_reading",
    chartKey: "trend",
    wrongAnswerEncouragement:
      "If you didn't spot the higher-highs / higher-lows pattern right away, that's normal — it's the single most useful chart skill and it takes a few reps to see automatically.",
  },
  {
    id: "risk_math",
    title: "Risk math",
    prompt:
      "Account: $5,000. You decide to risk 1% per trade. What's the maximum dollar loss this trade should produce if your stop hits?",
    options: ["$5", "$50", "$500"],
    correct: 1,
    explanation:
      "1% of $5,000 = $50. That's the planned loss if the stop is hit — position size is set around that, not the other way around.",
    skillSignal: "risk_control",
    hardFlag: true,
    wrongAnswerEncouragement:
      "The math here is the foundation everything else sits on. Most beginners miss it the first time — once you see it, it sticks.",
  },
  {
    id: "scenario_plan",
    title: "Practice scenario",
    prompt:
      "BTC is in a clean uptrend on the 4h chart and pulled back to $59,500 support — which held twice this week. You want to take this trade. Which plan is best?",
    options: [
      "Short — price has gone up too much",
      "Long at $59,600 with stop $59,200 and TP $62,800",
      "Long at $59,600 with no stop (close it manually if it goes down)",
    ],
    correct: 1,
    explanation:
      "Long with-trend at support, stop just past the level, target before resistance. The 'no stop' option drops you into the most common account-killer.",
    skillSignal: "trade_thesis",
    hardFlag: true, // failing this (no-stop choice) forces risk_warning
    wrongAnswerEncouragement:
      "Picking the no-stop option is the most common beginner mistake — the app shows it deliberately so you can actively reject it later.",
  },
  {
    id: "wait_obvious",
    title: "Wait or trade",
    prompt:
      "Price is chopping in a $300 range with no clear level nearby, and a major news event is 15 minutes away. Best decision?",
    options: [
      "Long — feels like it'll break out",
      "Short — feels like it'll break down",
      "Wait — conditions don't meet your criteria",
    ],
    correct: 2,
    explanation:
      "No level, low volatility, news event imminent — this is exactly the kind of condition where waiting is the highest-EV decision.",
    skillSignal: "patience",
    wrongAnswerEncouragement:
      "Wait is the hardest answer for new traders — it feels like missing out. In setups like this it's the highest-EV move more often than not.",
  },
  // ─── v1.7 additions: ambiguous answers, real trap setups ──────────────────────
  {
    id: "fakeout_read",
    title: "Reading a breakout candle",
    prompt:
      "Resistance has held three times at $63,000. A 4h candle just wicked to $63,400 and closed back at $62,750 on the highest volume of the week. What is the most likely read?",
    options: [
      "Real breakout — buy the close",
      "Fakeout — sellers absorbed the breakout, expect a move back into range",
      "Trend reversal confirmed long-term",
    ],
    correct: 1,
    explanation:
      "Wicked above the level and closed back inside on heavy volume = sellers absorbed the breakout. That's a textbook fakeout, often followed by a move toward range low.",
    skillSignal: "direction_reading",
    wrongAnswerEncouragement:
      "Reading a fakeout from where a candle wicks versus where it closes is a skill most chart books skip — not clicking yet? Fine. That's why this question is in the diagnostic, not the test.",
  },
  {
    id: "sizing_trap",
    title: "Sizing trap",
    prompt:
      "Same trade, same $200 risk if stop hits. Which plan survives normal noise?",
    options: [
      "$200 position with 50× leverage — liquidation ~2% away from entry",
      "$2,000 position with 5× leverage — same dollar risk, liquidation ~20% away",
      "They are identical; only dollar risk matters",
    ],
    correct: 1,
    explanation:
      "Both have the same dollar risk on a stop hit — but at 50× any normal 2% wick liquidates you before your stop fires. Leverage decides the buffer between entry and forced exit.",
    skillSignal: "leverage_control",
    hardFlag: true, // picking the 50× option forces risk_warning
    wrongAnswerEncouragement:
      "Sizing math trips up almost everyone the first time. Both options have the same dollar risk on a clean stop — but only one survives normal market noise.",
  },
  {
    id: "marginal_wait",
    title: "Wait or take the level",
    prompt:
      "BTC is ranging $60k–$63k. Price is right at the $60k range low for the fourth time, with a clean bounce setup forming on the 1h. Best action?",
    options: [
      "Wait — ranges are choppy, no edge",
      "Long at $60,100, stop $59,700, target $62,800 — buy support inside a range",
      "Short — break of $60k is imminent",
    ],
    correct: 1,
    explanation:
      "Ranges have edges at the edges. A clean bounce setup at a four-touch level is one of the higher-quality range plays — better than blanket-waiting. Wait is right *outside* clean levels, not at them.",
    skillSignal: "patience",
    wrongAnswerEncouragement:
      "Picking 'wait' here feels safe after learning patience — but ranges have edges *at* the edges, not the middle. Counter-intuitive on the first pass.",
  },
  {
    id: "invalidation_specificity",
    title: "Invalidation",
    prompt: "Which is a real trade invalidation, not a feeling?",
    options: [
      "If it goes down a lot",
      "If I start feeling uncomfortable about the trade",
      "If the 4h candle closes below $59,400, breaking the swing low",
    ],
    correct: 2,
    explanation:
      "Invalidation must reference a specific level or structure. 'Goes down' and 'feels bad' are how losers become 'just one more candle'. Pre-commit to the level.",
    skillSignal: "invalidation",
    wrongAnswerEncouragement:
      "Most beginners pick a feeling-based answer here. The whole point of trading rules is to replace feelings with pre-committed levels.",
  },
];

// Map question correctness to answer record. The picks array indexes into DIAGNOSTIC_QUESTIONS.
export type DiagnosticPicks = (number | null)[];

export type DiagnosticResult = {
  profile: DiagnosticProfile;
  completedAt: number;
  picks: DiagnosticPicks;
  // Initial skill bias — used by Training Path before practice attempts exist.
  weakSkill: SkillId;
  // Used by v1.7.5 to decide when to prompt the user to retake.
  attemptCountAtDiagnostic?: number;
  // v2.4 — when the user retakes, the prior result is chained here so the
  // Training Path can show a Before/Now comparison. Only the most recent
  // previous result is kept; deeper history would require a list.
  previous?: DiagnosticResult;
};

export function isCorrect(qIdx: number, pick: number | null): boolean {
  if (pick == null) return false;
  return DIAGNOSTIC_QUESTIONS[qIdx].correct === pick;
}

export function assignProfile(
  picks: DiagnosticPicks,
  attemptCountAtDiagnostic?: number
): DiagnosticResult {
  const correctCount = picks.reduce<number>(
    (n, pick, idx) => (isCorrect(idx, pick) ? n + 1 : n),
    0
  );

  // Risk warning trumps everything — wrong on any hardFlag question signals an urgent
  // training need (account-blowing decisions).
  const failedHardFlag = DIAGNOSTIC_QUESTIONS.some(
    (q, idx) => q.hardFlag && !isCorrect(idx, picks[idx])
  );
  if (failedHardFlag) {
    return {
      profile: "risk_warning",
      completedAt: Date.now(),
      picks,
      weakSkill: firstWeakSkill(picks) ?? "stop_placement",
      attemptCountAtDiagnostic,
    };
  }

  // 8-question scale: 7+ = practice_ready, 4–6 = developing, < 4 = beginner.
  let profile: DiagnosticProfile;
  if (correctCount >= 7) profile = "practice_ready";
  else if (correctCount >= 4) profile = "developing";
  else profile = "beginner";

  return {
    profile,
    completedAt: Date.now(),
    picks,
    weakSkill: firstWeakSkill(picks) ?? "risk_control",
    attemptCountAtDiagnostic,
  };
}

// Returns the skillSignal of the first wrong question, or null if all correct.
function firstWeakSkill(picks: DiagnosticPicks): SkillId | null {
  for (let i = 0; i < DIAGNOSTIC_QUESTIONS.length; i++) {
    if (!isCorrect(i, picks[i])) return DIAGNOSTIC_QUESTIONS[i].skillSignal;
  }
  return null;
}
