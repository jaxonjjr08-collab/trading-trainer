"use client";

// v2.4 — Speed-read drill runner. Shows a chart for ~5 seconds, asks a
// question, scores it, moves on. Builds the chart-reading reflex that the
// full decision form trains slowly. Session-only state — no persistence.

import { useEffect, useMemo, useState } from "react";
import MiniChart from "./MiniChart";
import { CHART_SPECS } from "@/lib/learn-charts";
import { SPEED_DRILLS, type SpeedDrill } from "@/lib/speed-drills";

const REVEAL_SECONDS = 5;

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Phase = "reveal" | "answer" | "result" | "done";

export default function SpeedDrillRunner() {
  const queue = useMemo(() => shuffled(SPEED_DRILLS).slice(0, 10), []);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("reveal");
  const [pick, setPick] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS);
  const [correct, setCorrect] = useState(0);

  const drill = queue[idx];

  // Reveal countdown: tick every second while in 'reveal' phase. Switching
  // to 'answer' resets the chart (hidden during the question) so the user
  // has to rely on what they saw, not re-read.
  useEffect(() => {
    if (phase !== "reveal") return;
    setSecondsLeft(REVEAL_SECONDS);
    const start = Date.now();
    const handle = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, REVEAL_SECONDS - elapsed);
      setSecondsLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(handle);
        setPhase("answer");
      }
    }, 250);
    return () => clearInterval(handle);
  }, [phase, idx]);

  function handlePick(i: number) {
    if (phase !== "answer") return;
    setPick(i);
    if (i === drill.correct) setCorrect((c) => c + 1);
    setPhase("result");
  }

  function handleNext() {
    if (idx + 1 >= queue.length) {
      setPhase("done");
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("reveal");
  }

  function handleReveal() {
    // Let the user peek the chart again on the result screen for review.
    setPhase("result");
  }

  if (phase === "done") {
    return (
      <div className="rounded-md border border-accent/40 bg-accent/5 p-6 space-y-3">
        <div className="text-xs uppercase tracking-wide text-accent">Speed-read complete</div>
        <div className="text-3xl font-bold">
          {correct} / {queue.length}
        </div>
        <p className="text-sm text-muted">
          {correct === queue.length
            ? "Perfect score. Your pattern-recognition reflex is solid."
            : correct >= queue.length * 0.7
            ? "Strong. The slow patterns are starting to feel quick."
            : "Worth running again. Speed drills compound — your eye gets faster with reps."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          Another set →
        </button>
      </div>
    );
  }

  const spec = CHART_SPECS[drill.chartKey];

  return (
    <div className="rounded-md border border-line bg-panel p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            Speed-read · {idx + 1} of {queue.length}
          </div>
          <h2 className="text-base font-bold mt-0.5">{drill.question}</h2>
        </div>
        <div className="text-xs text-muted shrink-0">
          {correct} correct so far
        </div>
      </div>

      {phase === "reveal" && spec && (
        <div className="space-y-2">
          <div className="rounded-md border border-line bg-panel2 p-2">
            <MiniChart spec={spec} />
          </div>
          <div className="text-center text-sm">
            <span className="text-accent font-mono font-bold">{secondsLeft}s</span>{" "}
            <span className="text-muted">— look closely, the chart hides next.</span>
          </div>
        </div>
      )}

      {phase === "answer" && (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-panel2 p-8 text-center">
            <div className="text-xs uppercase tracking-wider text-muted">Chart hidden</div>
            <p className="text-sm text-muted mt-1">Answer from memory.</p>
          </div>
          <div className="space-y-2">
            {drill.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePick(i)}
                className="w-full text-left text-sm rounded-md border border-line bg-panel hover:bg-panel2 px-4 py-3"
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && spec && (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-panel2 p-2">
            <MiniChart spec={spec} />
          </div>
          <div className="space-y-2">
            {drill.options.map((opt, i) => {
              const isCorrect = i === drill.correct;
              const isPicked = pick === i;
              let cls = "w-full text-left text-sm rounded-md border px-4 py-3";
              if (isCorrect) cls += " border-good/60 bg-good/10 text-good";
              else if (isPicked) cls += " border-bad/60 bg-bad/10 text-bad";
              else cls += " border-line bg-panel2 text-muted";
              return (
                <div key={i} className={cls}>
                  {String.fromCharCode(65 + i)}. {opt}
                </div>
              );
            })}
          </div>
          <div className="text-xs leading-snug p-3 rounded-md border border-line bg-panel">
            <span className="uppercase tracking-wider text-[10px] mr-2 font-semibold text-muted">
              {pick === drill.correct ? "Right" : "The read"}
            </span>
            {drill.explanation}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="text-sm font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              {idx + 1 < queue.length ? "Next →" : "See result →"}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted">
        Speed drills build reflex pattern-recognition. Reuse the same set as many times as you want — the chart specs are the same; the order is randomised.
      </p>
    </div>
  );
}
