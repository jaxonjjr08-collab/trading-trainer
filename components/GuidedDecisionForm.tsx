"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Decision, Direction, Scenario } from "@/lib/types";
import type { DecisionDraft } from "./DecisionForm";
import { estimateLiquidationPrice } from "@/lib/scoring";
import { getDecisionDefaults, DEFAULT_DECISION_DEFAULTS } from "@/lib/storage";

type Props = {
  scenario: Scenario;
  onSubmit: (decision: Decision) => void;
  onDraftChange?: (draft: DecisionDraft) => void;
  disabled?: boolean;
  // Optional: switch to the full DecisionForm if the user wants to.
  onSkipToFull?: () => void;
};

type WizardStep = "direction" | "stop" | "target" | "risk" | "thesis" | "confirm";

// Bite-sized wizard for the first 5 attempts. Same Decision payload as DecisionForm
// at submit time, just collected one prompt at a time with plain-language framing.
export default function GuidedDecisionForm({
  scenario,
  onSubmit,
  onDraftChange,
  disabled,
  onSkipToFull,
}: Props) {
  const currentPrice = scenario.context.currentPrice;
  // v2.9 — defaults honored in guided mode too. Initial render uses the
  // historical fallback (matches SSR), then the effect re-syncs with whatever
  // the user set in Settings.
  const [defaults, setDefaults] = useState(() => DEFAULT_DECISION_DEFAULTS);
  const [direction, setDirection] = useState<Direction>("long");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [riskPercent, setRiskPercent] = useState<number>(DEFAULT_DECISION_DEFAULTS.riskPercent);
  const [thesis, setThesis] = useState<string>("");
  const [step, setStep] = useState<WizardStep>("direction");

  useEffect(() => {
    const d = getDecisionDefaults();
    setDefaults(d);
    setRiskPercent(d.riskPercent);
  }, []);

  const parsedStop = parseFloat(stopLoss);
  const parsedTP = parseFloat(takeProfit);

  const liq = useMemo(() => {
    if (direction === "wait") return null;
    return estimateLiquidationPrice(direction, currentPrice, defaults.leverage);
  }, [direction, currentPrice, defaults.leverage]);

  const rr = useMemo(() => {
    if (direction === "wait") return null;
    if (!isFinite(parsedStop) || !isFinite(parsedTP)) return null;
    const risk = Math.abs(currentPrice - parsedStop);
    const reward = Math.abs(parsedTP - currentPrice);
    if (risk <= 0) return null;
    return reward / risk;
  }, [direction, currentPrice, parsedStop, parsedTP]);

  useEffect(() => {
    onDraftChange?.({
      direction,
      entry: direction === "wait" ? undefined : currentPrice,
      stopLoss: direction === "wait" ? undefined : isFinite(parsedStop) ? parsedStop : undefined,
      takeProfit: direction === "wait" ? undefined : isFinite(parsedTP) ? parsedTP : undefined,
      leverage: direction === "wait" ? undefined : defaults.leverage,
      riskPercent: direction === "wait" ? undefined : riskPercent,
      thesis: thesis.trim(),
      invalidation: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, currentPrice, parsedStop, parsedTP, riskPercent, thesis]);

  function submit() {
    const decision: Decision = {
      direction,
      entry: direction === "wait" ? undefined : currentPrice,
      stopLoss: direction === "wait" ? undefined : isFinite(parsedStop) ? parsedStop : undefined,
      takeProfit: direction === "wait" ? undefined : isFinite(parsedTP) ? parsedTP : undefined,
      leverage: direction === "wait" ? undefined : defaults.leverage,
      riskPercent: direction === "wait" ? undefined : riskPercent,
      accountSize: defaults.accountSize,
      thesis: thesis.trim(),
      invalidation: thesis.trim(), // good enough for guided mode — same reason
    };
    onSubmit(decision);
  }

  // Map step → next step based on direction (skip trade-only steps on wait).
  function next() {
    if (step === "direction") {
      setStep(direction === "wait" ? "thesis" : "stop");
    } else if (step === "stop") {
      setStep("target");
    } else if (step === "target") {
      setStep("risk");
    } else if (step === "risk") {
      setStep("thesis");
    } else if (step === "thesis") {
      setStep("confirm");
    } else if (step === "confirm") {
      submit();
    }
  }

  function back() {
    if (step === "stop" || step === "thesis") {
      // Thesis comes from direction (wait path) or from risk (trade path)
      if (step === "thesis" && direction === "wait") setStep("direction");
      else if (step === "thesis") setStep("risk");
      else setStep("direction");
    } else if (step === "target") setStep("stop");
    else if (step === "risk") setStep("target");
    else if (step === "confirm") setStep("thesis");
  }

  const stepOrder: WizardStep[] =
    direction === "wait"
      ? ["direction", "thesis", "confirm"]
      : ["direction", "stop", "target", "risk", "thesis", "confirm"];
  const stepIndex = stepOrder.indexOf(step);
  const total = stepOrder.length;

  // Whether the current step can advance.
  const canAdvance = (() => {
    if (step === "direction") return true;
    if (step === "stop") return isFinite(parsedStop);
    if (step === "target") return isFinite(parsedTP);
    if (step === "risk") return riskPercent > 0;
    if (step === "thesis") return thesis.trim().length >= 10;
    if (step === "confirm") return true;
    return false;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-1">
          {stepOrder.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${
                i < stepIndex ? "bg-accent" : i === stepIndex ? "bg-accent/70" : "bg-panel2 border border-line"
              }`}
            />
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted shrink-0">
          Guided mode · step {stepIndex + 1} of {total}
        </div>
      </div>

      {step === "direction" && (
        <StepCard
          title="What's your read?"
          body="Look at the chart. Where do you think price goes from here? Pick wait if there's no clean setup."
        >
          <div className="flex gap-2">
            <DirBtn label="Long" value="long" active={direction} setActive={setDirection} hint="Price goes up" />
            <DirBtn label="Short" value="short" active={direction} setActive={setDirection} hint="Price goes down" />
            <DirBtn label="Wait" value="wait" active={direction} setActive={setDirection} hint="No trade" />
          </div>
        </StepCard>
      )}

      {step === "stop" && (
        <StepCard
          title="Where would you exit if you're wrong?"
          body={`That's your stop loss. Set a price where you'd give up on the idea. Current price: ${currentPrice.toLocaleString()}.`}
        >
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Price"
            className="w-full"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            disabled={disabled}
          />
        </StepCard>
      )}

      {step === "target" && (
        <StepCard
          title="Where would you take profit?"
          body={`A pre-decided exit on the winning side. Aim before the next opposing level, not past it.`}
        >
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Price"
            className="w-full"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            disabled={disabled}
          />
          {rr != null && (
            <div className="text-xs text-muted mt-2">
              Reward-to-risk: <span className="font-mono text-text">{rr.toFixed(2)}</span>
              {rr < 1.5 && <span className="text-bad ml-2">(below 1.5 — risky)</span>}
              {rr >= 2 && <span className="text-good ml-2">(healthy)</span>}
            </div>
          )}
        </StepCard>
      )}

      {step === "risk" && (
        <StepCard
          title="How much are you willing to lose?"
          body={`Risk is the % of your $${defaults.accountSize.toLocaleString()} account you'd lose if your stop hits. Stay at 1% while learning.`}
        >
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            className="w-full"
            disabled={disabled}
          />
          <div className="flex justify-between text-xs text-muted">
            <span>0.5%</span>
            <span className="text-text font-mono">
              {riskPercent}% (~${(defaults.accountSize * riskPercent / 100).toFixed(0)} on a stop hit)
            </span>
            <span>3%</span>
          </div>
        </StepCard>
      )}

      {step === "thesis" && (
        <StepCard
          title="Why are you taking this trade?"
          body={
            direction === "wait"
              ? "One sentence: what would make you change your mind and trade?"
              : "One sentence: what setup or level is this trade based on?"
          }
        >
          <textarea
            rows={3}
            className="w-full"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="e.g. Pullback to $58k support inside an uptrend, expecting a bounce."
            disabled={disabled}
          />
          <div className="text-[10px] text-muted mt-1">
            {thesis.trim().length < 10
              ? `${10 - thesis.trim().length} more characters needed`
              : "Looks good"}
          </div>
        </StepCard>
      )}

      {step === "confirm" && (
        <div className="rounded-md border border-good/40 bg-good/5 p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-good">Ready to submit</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Row label="Direction" value={direction.toUpperCase()} />
            {direction !== "wait" && (
              <>
                <Row label="Entry" value={currentPrice.toLocaleString()} />
                <Row label="Stop loss" value={isFinite(parsedStop) ? parsedStop.toLocaleString() : "—"} />
                <Row label="Take profit" value={isFinite(parsedTP) ? parsedTP.toLocaleString() : "—"} />
                <Row label="Leverage" value={`${defaults.leverage}× (auto)`} />
                <Row label="Risk %" value={`${riskPercent}%`} />
                <Row label="R:R" value={rr != null ? rr.toFixed(2) : "—"} />
                {liq != null && (
                  <Row
                    label="Liquidation"
                    value={`~$${liq.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  />
                )}
              </>
            )}
          </div>
          <div className="text-xs text-muted leading-snug border-t border-line pt-3">
            Guided mode uses defaults for entry (current price) and leverage (3×). After your
            first 5 attempts, you'll switch to the full form where you set everything.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0 || disabled}
          className="text-xs border border-line bg-panel text-text px-4 py-2 rounded-md hover:bg-panel2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canAdvance || disabled}
          className="text-sm font-semibold bg-accent text-white px-5 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {step === "confirm" ? "Submit" : "Next →"}
        </button>
      </div>

      {onSkipToFull && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onSkipToFull}
            className="text-xs uppercase tracking-wider text-muted hover:text-text py-2"
          >
            Switch to the full form
          </button>
        </div>
      )}
    </div>
  );
}

function StepCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-panel2 p-4 space-y-3">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-xs text-muted mt-1 leading-snug">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function DirBtn({
  label,
  value,
  active,
  setActive,
  hint,
}: {
  label: string;
  value: Direction;
  active: Direction;
  setActive: (d: Direction) => void;
  hint: string;
}) {
  const on = active === value;
  const tone =
    value === "long"
      ? on
        ? "bg-good/20 border-good text-good"
        : "bg-panel2 border-line text-muted hover:text-text"
      : value === "short"
      ? on
        ? "bg-bad/20 border-bad text-bad"
        : "bg-panel2 border-line text-muted hover:text-text"
      : on
      ? "bg-accent/20 border-accent text-accent"
      : "bg-panel2 border-line text-muted hover:text-text";
  return (
    <button
      type="button"
      onClick={() => setActive(value)}
      className={`flex-1 px-3 py-3 text-sm font-semibold border rounded-md ${tone}`}
    >
      <div>{label}</div>
      <div className="text-[10px] mt-0.5 opacity-80">{hint}</div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted">{label}</span>
      <span className="font-mono text-right">{value}</span>
    </>
  );
}
