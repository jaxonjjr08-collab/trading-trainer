"use client";

import { useState } from "react";
import {
  DIAGNOSTIC_QUESTIONS,
  PROFILE_BLURB,
  PROFILE_LABEL,
  assignProfile,
  type DiagnosticQuestion,
  type DiagnosticResult,
} from "@/lib/diagnostic";
import { listAttempts, saveDiagnostic } from "@/lib/storage";
import { chartFor } from "@/lib/learn-charts";
import MiniChart from "./MiniChart";

type Props = {
  onComplete: (r: DiagnosticResult) => void;
};

export default function Diagnostic({ onComplete }: Props) {
  const total = DIAGNOSTIC_QUESTIONS.length;
  const [step, setStep] = useState<number>(0); // 0..total-1 = question; total = result
  const [picks, setPicks] = useState<(number | null)[]>(() => Array(total).fill(null));

  function recordPick(i: number, optIdx: number) {
    if (picks[i] != null) return;
    setPicks((prev) => {
      const next = [...prev];
      next[i] = optIdx;
      return next;
    });
  }

  function advance() {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      // Final step → compute and save.
      const result = assignProfile(picks, listAttempts().length);
      saveDiagnostic(result);
      setStep(total);
      onComplete(result);
    }
  }

  const done = step >= total;
  const progress = done ? 100 : (step / total) * 100;

  return (
    <div className="rounded-md border border-accent/40 bg-accent/5 p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-accent">Diagnostic</div>
        <h2 className="text-xl font-bold mt-1">
          Where are you starting from?
        </h2>
        <p className="text-sm text-muted mt-1">
          {total} quick questions. Used to pick your first training assignment — not stored
          anywhere but your browser.
        </p>
      </div>

      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>

      {!done && (
        <Step
          n={step + 1}
          total={total}
          question={DIAGNOSTIC_QUESTIONS[step]}
          pick={picks[step]}
          setPick={(opt) => recordPick(step, opt)}
          onNext={advance}
          ctaLabel={step === total - 1 ? "See result" : "Next"}
        />
      )}
      {done && (
        <ResultCard
          profile={assignProfile(picks).profile}
        />
      )}
    </div>
  );
}

function Step({
  n,
  total,
  question,
  pick,
  setPick,
  onNext,
  ctaLabel,
}: {
  n: number;
  total: number;
  question: DiagnosticQuestion;
  pick: number | null;
  setPick: (p: number) => void;
  onNext: () => void;
  ctaLabel: string;
}) {
  const locked = pick != null;
  const userWasWrong = locked && pick !== question.correct;
  const chartSpec = question.chartKey ? chartFor(question.chartKey) : null;
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">
        Step {n} of {total} · {question.title}
      </div>
      <div className="text-sm font-semibold leading-snug">{question.prompt}</div>
      {chartSpec && (
        <div className="rounded-md border border-line bg-panel2 p-2 max-w-2xl">
          <MiniChart spec={chartSpec} />
        </div>
      )}
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correct;
          const isPicked = pick === i;
          let cls = "w-full text-left text-sm rounded-md border px-4 py-3 transition-colors";
          if (!locked) cls += " border-line bg-panel hover:bg-panel2 cursor-pointer";
          else if (isCorrect) cls += " border-good/60 bg-good/10 text-good";
          else if (isPicked) cls += " border-bad/60 bg-bad/10 text-bad";
          else cls += " border-line bg-panel2 text-muted";
          return (
            <button
              key={i}
              type="button"
              onClick={() => !locked && setPick(i)}
              disabled={locked}
              className={cls}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>
      {locked && (
        <div className="text-xs leading-snug p-3 rounded-md border border-line bg-panel space-y-2">
          {/* v2.3 — normalize wrong answers before the explanation so beginners
              don't internalize their first interaction as "I'm bad at this." */}
          {userWasWrong && question.wrongAnswerEncouragement && (
            <p className="text-muted italic">{question.wrongAnswerEncouragement}</p>
          )}
          <div>
            <span className="uppercase tracking-wider text-[10px] mr-2 font-semibold text-muted">
              Explanation
            </span>
            {question.explanation}
          </div>
        </div>
      )}
      {locked && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="text-xs font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
          >
            {ctaLabel} →
          </button>
        </div>
      )}
    </div>
  );
}

function ResultCard({ profile }: { profile: keyof typeof PROFILE_LABEL }) {
  return (
    <div className="rounded-md border border-good/40 bg-good/5 p-4">
      <div className="text-xs uppercase tracking-wide text-good">Your profile</div>
      <div className="text-2xl font-bold mt-1">{PROFILE_LABEL[profile]}</div>
      <p className="text-sm text-muted mt-2 leading-relaxed">{PROFILE_BLURB[profile]}</p>
      <p className="text-xs text-muted mt-3">
        Your Training Path below is now personalized.
      </p>
    </div>
  );
}
