"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TUTORIAL_STEPS, markTutorialDone } from "@/lib/tutorial";
import { chartFor } from "@/lib/learn-charts";
import MiniChart from "./MiniChart";
import Mascot from "./Mascot";

export default function Tutorial() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const total = TUTORIAL_STEPS.length;
  const current = TUTORIAL_STEPS[step];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function next() {
    if (step < total - 1) setStep(step + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function finish() {
    markTutorialDone();
    router.push("/training");
  }

  function skip() {
    markTutorialDone();
    router.push("/");
  }

  const spec = current.chartKey ? chartFor(current.chartKey) : null;
  const isLast = step === total - 1;

  return (
    <div className="space-y-5">
      {/* Progress + skip */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-1.5">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < step
                  ? "bg-accent"
                  : i === step
                  ? "bg-accent/70"
                  : "bg-panel2 border border-line"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          className="shrink-0 text-xs text-muted hover:text-text"
        >
          Skip
        </button>
      </div>

      <div className="rounded-md border border-line bg-panel p-6 md:p-8 space-y-5">
        <div className="flex items-start gap-4">
          {/* v2.6 — owl mascot greets the user on Welcome step 1. Smaller on
              other steps to keep the layout consistent without dominating. */}
          {(step === 0 || current.id === "spot_vs_futures") && (
            <div className="shrink-0 hidden md:block">
              <Mascot mood="idle" size="xl" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-accent">
              Step {step + 1} of {total}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">{current.title}</h2>
          </div>
        </div>

        <p className="text-base text-text leading-relaxed max-w-2xl">{current.body}</p>

        {spec && (
          <div className="rounded-md border border-line bg-panel2 p-3 max-w-2xl">
            <MiniChart spec={spec} />
            {current.chartCaption && (
              <div className="text-[10px] text-muted px-1 pt-1 italic">
                {current.chartCaption}
              </div>
            )}
          </div>
        )}

        {current.customVisual === "spot_vs_futures_compare" && (
          <div className="max-w-2xl space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-line bg-panel2 p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted">Spot</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted">buy &amp; hold</span>
                </div>
                <div className="text-sm font-semibold">You own the actual coin.</div>
                <ul className="text-xs text-muted leading-snug space-y-0.5 list-disc pl-4">
                  <li>Max loss = what you put in</li>
                  <li>No leverage, no liquidation</li>
                  <li>No funding fees</li>
                  <li>Hold forever if you want</li>
                </ul>
                <div className="text-xs text-text pt-1 border-t border-line">
                  <span className="text-muted">This trainer's chart-reading and risk lessons still help.</span>
                </div>
              </div>
              <div className="rounded-md border border-accent/40 bg-accent/5 p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wide text-accent">Futures / Perp</span>
                  <span className="text-[10px] uppercase tracking-wider text-accent">leveraged contract</span>
                </div>
                <div className="text-sm font-semibold">You trade a contract on the price.</div>
                <ul className="text-xs text-muted leading-snug space-y-0.5 list-disc pl-4">
                  <li>Leverage multiplies wins and losses</li>
                  <li>Liquidation closes you at the worst time</li>
                  <li>Funding fees every 8 hours</li>
                  <li>Can short price down, not just up</li>
                </ul>
                <div className="text-xs text-text pt-1 border-t border-accent/30">
                  <span className="text-accent font-semibold">What this trainer is built for.</span>
                </div>
              </div>
            </div>

            {/* v4.1.7 — worked example so the difference is concrete, not
                conceptual. Same starting dollar, same price drop, very
                different consequences. */}
            <div className="rounded-md border border-line bg-panel p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted">
                Worked example — $1,000 of your money, BTC drops 10%
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <div className="font-semibold text-text">Spot: buy 0.0167 BTC at $60,000</div>
                  <ul className="text-muted leading-snug space-y-0.5">
                    <li>BTC drops to $54,000 (−10%).</li>
                    <li>Your coins are now worth $900.</li>
                    <li>
                      Loss: <span className="text-bad font-mono">−$100</span> (−10% of your money).
                    </li>
                    <li>You still hold the 0.0167 BTC; it can come back.</li>
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-text">Perp: 10× long with $1,000 margin</div>
                  <ul className="text-muted leading-snug space-y-0.5">
                    <li>Position size = $10,000 (your $1,000 × 10).</li>
                    <li>BTC drops to $54,000 (−10%).</li>
                    <li>
                      Loss: <span className="text-bad font-mono">−$1,000</span> — your full margin.
                    </li>
                    <li>
                      You get <span className="text-bad font-semibold">liquidated</span> before that;
                      the position is closed at $0. Nothing comes back.
                    </li>
                  </ul>
                </div>
              </div>
              <div className="text-[11px] text-text bg-warn/10 border border-warn/30 rounded px-2 py-1.5 leading-snug">
                <span className="text-warn font-semibold">Same chart move. 10× the dollar loss.</span>{" "}
                That's what leverage actually does — not "10× the gains" the way exchanges market it.
              </div>
            </div>
          </div>
        )}

        {current.customVisual === "trains_vs_doesnt" && (
          <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-good/40 bg-good/5 p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-good">Trains</span>
                <span className="text-[10px] uppercase tracking-wider text-good">cognitive</span>
              </div>
              <ul className="text-xs text-text leading-snug space-y-1 list-disc pl-4">
                <li>Chart reading and structure</li>
                <li>Risk math and position sizing</li>
                <li>Stop and target placement</li>
                <li>Decision discipline under rules</li>
                <li>Tagging your own repeated mistakes</li>
              </ul>
            </div>
            <div className="rounded-md border border-warn/40 bg-warn/5 p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-warn">Doesn't simulate</span>
                <span className="text-[10px] uppercase tracking-wider text-warn">behavioural</span>
              </div>
              <ul className="text-xs text-text leading-snug space-y-1 list-disc pl-4">
                <li>Emotions under real-money pressure</li>
                <li>FOMO into fast-moving candles</li>
                <li>Fees, funding, and slippage drag</li>
                <li>News gaps and exchange outages</li>
                <li>Your own behaviour at 3am</li>
              </ul>
              <div className="text-xs text-text pt-1 border-t border-warn/30 italic">
                When you graduate: start tiny on spot before futures.
              </div>
            </div>
          </div>
        )}

        {current.customVisual === "decision_quality_compare" && (
          <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-good/40 bg-good/5 p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-good">Trade A</span>
                <span className="text-2xl font-bold text-good">85<span className="text-muted text-sm">/100</span></span>
              </div>
              <div className="text-sm font-semibold">Lost money</div>
              <ul className="text-xs text-muted leading-snug space-y-0.5 list-disc pl-4">
                <li>1% risk, clean stop placement</li>
                <li>R:R 2.5, written thesis</li>
                <li>Hit stop on a wick</li>
              </ul>
              <div className="text-xs text-text pt-1 border-t border-line">
                Good plan, unlucky outcome. <span className="text-good font-semibold">We score this high.</span>
              </div>
            </div>
            <div className="rounded-md border border-bad/40 bg-bad/5 p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-bad">Trade B</span>
                <span className="text-2xl font-bold text-bad">30<span className="text-muted text-sm">/100</span></span>
              </div>
              <div className="text-sm font-semibold">Made money</div>
              <ul className="text-xs text-muted leading-snug space-y-0.5 list-disc pl-4">
                <li>No stop loss</li>
                <li>20× leverage on a guess</li>
                <li>Got lucky on a pump</li>
              </ul>
              <div className="text-xs text-text pt-1 border-t border-line">
                Bad plan, lucky outcome. <span className="text-bad font-semibold">We score this low.</span>
              </div>
            </div>
          </div>
        )}

        {current.learnTermId && (
          <Link
            href={`/learn?term=${current.learnTermId}`}
            className="inline-block text-xs text-accent hover:underline"
          >
            Read the full lesson →
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={step === 0}
          className="text-sm border border-line bg-panel text-text px-4 py-2 rounded-md hover:bg-panel2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          className="text-sm font-semibold bg-accent text-white px-5 py-2 rounded-md hover:opacity-90"
        >
          {isLast ? "Take diagnostic →" : "Next →"}
        </button>
      </div>

      <p className="text-[10px] text-muted text-center">
        Press → to advance, ← to go back, Esc anytime.
      </p>
    </div>
  );
}
