"use client";

import { useEffect, useState } from "react";
import type { QuizQuestion } from "@/lib/learn-quizzes";
import {
  MASTERY_LABEL,
  latestQuizByTerm,
  masteryFromPercent,
  saveQuizAttempt,
  type QuizAttempt,
} from "@/lib/storage";

type Props = {
  termId: string;
  quiz: QuizQuestion[];
  toneClass: string;
  barClass: string;
};

const MASTERY_TONE: Record<string, string> = {
  not_started: "border-line bg-panel2 text-muted",
  needs_work: "border-bad/40 bg-bad/10 text-bad",
  improving: "border-warn/40 bg-warn/10 text-warn",
  strong: "border-good/40 bg-good/10 text-good",
};

export default function TermQuiz({ termId, quiz, toneClass, barClass }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [previous, setPrevious] = useState<QuizAttempt | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const latest = latestQuizByTerm()[termId] ?? null;
    setPrevious(latest);
  }, [termId]);

  const total = quiz.length;
  const answered = Object.keys(answers).length;
  const correctCount = quiz.reduce(
    (n, q, i) => (answers[i] === q.correct ? n + 1 : n),
    0
  );
  const allAnswered = answered === total;

  // Save once per completion. New attempts (via Reset) save again.
  useEffect(() => {
    if (!allAnswered || saved) return;
    const scorePercent = Math.round((correctCount / total) * 100);
    const missedQuestionIds: number[] = [];
    quiz.forEach((q, i) => {
      if (answers[i] !== q.correct) missedQuestionIds.push(i);
    });
    const attempt: QuizAttempt = {
      termId,
      scorePercent,
      correctCount,
      totalQuestions: total,
      missedQuestionIds,
      completedAt: Date.now(),
    };
    saveQuizAttempt(attempt);
    setPrevious(attempt);
    setSaved(true);
  }, [allAnswered, saved, correctCount, total, quiz, answers, termId]);

  function pick(qIdx: number, optIdx: number) {
    if (answers[qIdx] !== undefined) return;
    setAnswers((a) => ({ ...a, [qIdx]: optIdx }));
  }

  function reset() {
    setAnswers({});
    setSaved(false);
  }

  const masteryNow = allAnswered
    ? masteryFromPercent(Math.round((correctCount / total) * 100))
    : previous
    ? masteryFromPercent(previous.scorePercent)
    : "not_started";

  return (
    <div id="quiz" className="rounded-md border-2 border-accent/40 bg-accent/5 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-accent/10 border-b border-accent/30">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-4 h-4 text-accent shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span className="text-sm font-semibold text-accent">Check your understanding</span>
          <span
            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${MASTERY_TONE[masteryNow]}`}
          >
            {MASTERY_LABEL[masteryNow]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {allAnswered && (
            <div className="text-sm font-semibold">
              <span
                className={
                  correctCount === total
                    ? "text-good"
                    : correctCount >= total / 2
                    ? "text-warn"
                    : "text-bad"
                }
              >
                {correctCount}/{total}
              </span>
              <span className="text-muted font-normal text-xs ml-1">correct</span>
            </div>
          )}
          {!allAnswered && previous && (
            <div className="text-xs text-muted">
              Last attempt: <span className="font-semibold">{previous.scorePercent}%</span>
            </div>
          )}
          {answered > 0 && (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] uppercase tracking-wider text-muted hover:text-text border border-line bg-panel px-2.5 py-1 rounded-md"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        <ol className="space-y-6 list-none p-0">
          {quiz.map((q, qIdx) => {
            const picked = answers[qIdx];
            const locked = picked !== undefined;
            return (
              <li key={qIdx} className="space-y-3">
                <div className="text-sm font-semibold leading-snug">
                  <span className="text-accent/70 mr-2">Q{qIdx + 1}.</span>
                  {q.prompt}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correct;
                    const isPicked = picked === optIdx;
                    let cls =
                      "w-full text-left text-sm rounded-md border px-4 py-3 transition-colors";
                    if (!locked) {
                      cls += " border-accent/20 bg-panel hover:bg-accent/10 hover:border-accent/40 cursor-pointer";
                    } else if (isCorrect) {
                      cls += " border-good/60 bg-good/10 text-good";
                    } else if (isPicked) {
                      cls += " border-bad/60 bg-bad/10 text-bad";
                    } else {
                      cls += " border-line bg-panel2 text-muted";
                    }
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => pick(qIdx, optIdx)}
                        disabled={locked}
                        className={cls}
                      >
                        <span className="inline-flex items-center gap-3 w-full">
                          <span
                            className={`text-[11px] font-mono w-5 h-5 shrink-0 rounded flex items-center justify-center border ${
                              !locked
                                ? "border-accent/30 text-accent/70 bg-accent/5"
                                : isCorrect
                                ? "border-good/60 text-good bg-good/10"
                                : isPicked
                                ? "border-bad/60 text-bad bg-bad/10"
                                : "border-line text-muted bg-panel2"
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {locked && isCorrect && (
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-good font-semibold shrink-0">
                              ✓ Correct
                            </span>
                          )}
                          {locked && isPicked && !isCorrect && (
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-bad font-semibold shrink-0">
                              ✗ Your pick
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {locked && (
                  <div
                    className={`text-xs leading-snug p-3.5 rounded-md border ${
                      picked === q.correct
                        ? "border-good/40 bg-good/5 text-good/90"
                        : "border-accent/40 bg-accent/5 text-text"
                    }`}
                  >
                    <span className="uppercase tracking-wider text-[10px] mr-2 font-semibold text-muted">
                      Explanation
                    </span>
                    {q.explanation}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
