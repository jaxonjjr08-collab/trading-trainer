"use client";

import { useEffect, useMemo, useState } from "react";
import type { Decision, Direction, Scenario } from "@/lib/types";
import { estimateLiquidationPrice } from "@/lib/scoring";
import { getDecisionDefaults, DEFAULT_DECISION_DEFAULTS } from "@/lib/storage";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcut";
import JargonTip from "./JargonTip";

export type DecisionDraft = {
  direction: Direction;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  riskPercent?: number;
  thesis: string;
  invalidation: string;
};

type Props = {
  scenario: Scenario;
  onSubmit: (decision: Decision) => void;
  onDraftChange?: (draft: DecisionDraft) => void;
  disabled?: boolean;
};

export default function DecisionForm({ scenario, onSubmit, onDraftChange, disabled }: Props) {
  const cp = scenario.context.currentPrice;
  // v2.9 — defaults seeded from getDecisionDefaults(). SSR-safe: returns the
  // historical 1% / 3× / $1,000 when localStorage isn't available, then the
  // useEffect below re-hydrates with the user's saved values on mount.
  const [defaults, setDefaults] = useState(() => DEFAULT_DECISION_DEFAULTS);
  const [direction, setDirection] = useState<Direction>("long");
  const [entry, setEntry] = useState<string>(cp.toFixed(2));
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [leverage, setLeverage] = useState<string>(String(DEFAULT_DECISION_DEFAULTS.leverage));
  const [riskPercent, setRiskPercent] = useState<string>(String(DEFAULT_DECISION_DEFAULTS.riskPercent));
  const [thesis, setThesis] = useState<string>("");
  const [invalidation, setInvalidation] = useState<string>("");

  useEffect(() => {
    const d = getDecisionDefaults();
    setDefaults(d);
    setLeverage(String(d.leverage));
    setRiskPercent(String(d.riskPercent));
  }, []);

  const parsedEntry = parseFloat(entry);
  const parsedStop = parseFloat(stopLoss);
  const parsedTP = parseFloat(takeProfit);
  const parsedLev = parseFloat(leverage);
  const parsedRisk = parseFloat(riskPercent);

  const liq = useMemo(() => {
    if (direction === "wait") return null;
    if (!isFinite(parsedEntry) || !isFinite(parsedLev)) return null;
    return estimateLiquidationPrice(direction, parsedEntry, parsedLev);
  }, [direction, parsedEntry, parsedLev]);

  const rr = useMemo(() => {
    if (direction === "wait") return null;
    if (!isFinite(parsedEntry) || !isFinite(parsedStop) || !isFinite(parsedTP)) return null;
    const risk = Math.abs(parsedEntry - parsedStop);
    const reward = Math.abs(parsedTP - parsedEntry);
    if (risk <= 0) return null;
    return reward / risk;
  }, [parsedEntry, parsedStop, parsedTP, direction]);

  // Missing numeric fields are passed through as undefined so scoring can flag them.
  const num = (s: string): number | undefined => {
    const n = parseFloat(s);
    return isFinite(n) ? n : undefined;
  };

  useEffect(() => {
    onDraftChange?.({
      direction,
      entry: direction === "wait" ? undefined : num(entry),
      stopLoss: direction === "wait" ? undefined : num(stopLoss),
      takeProfit: direction === "wait" ? undefined : num(takeProfit),
      leverage: direction === "wait" ? undefined : num(leverage),
      riskPercent: direction === "wait" ? undefined : num(riskPercent),
      thesis: thesis.trim(),
      invalidation: invalidation.trim(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, entry, stopLoss, takeProfit, leverage, riskPercent, thesis, invalidation]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const decision: Decision = {
      direction,
      entry: direction === "wait" ? undefined : num(entry),
      stopLoss: direction === "wait" ? undefined : num(stopLoss),
      takeProfit: direction === "wait" ? undefined : num(takeProfit),
      leverage: direction === "wait" ? undefined : num(leverage),
      riskPercent: direction === "wait" ? undefined : num(riskPercent),
      accountSize: defaults.accountSize,
      thesis: thesis.trim(),
      invalidation: invalidation.trim(),
    };
    onSubmit(decision);
  }

  const dirBtnCls = (d: Direction) =>
    `flex-1 px-3 py-2 text-sm font-semibold border ${
      direction === d
        ? d === "long"
          ? "bg-good/20 border-good text-good"
          : d === "short"
            ? "bg-bad/20 border-bad text-bad"
            : "bg-accent/20 border-accent text-accent"
        : "bg-panel2 border-line text-muted hover:text-text"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-text">Direction</span>
          <JargonTip
            term="Long / Short / Wait"
            definition={
              "Long = you think price will go up. Short = you think price will go down. Wait = conditions don't justify a trade — sitting out is a real decision, not a missed opportunity. In the trainer, 'wait' is rewarded when the setup is genuinely poor."
            }
            learnTermId="wait_decision"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" className={dirBtnCls("long")} onClick={() => setDirection("long")} disabled={disabled}>
            Long
          </button>
          <button type="button" className={dirBtnCls("short")} onClick={() => setDirection("short")} disabled={disabled}>
            Short
          </button>
          <button type="button" className={dirBtnCls("wait")} onClick={() => setDirection("wait")} disabled={disabled}>
            Wait
          </button>
        </div>
      </div>

      {direction !== "wait" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry" termId="entry" hint={`current ${cp.toLocaleString()}`}>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="w-full"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Leverage" termId="leverage" hint="1–125×">
              <input
                type="number"
                step="1"
                min="1"
                inputMode="decimal"
                className="w-full"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Stop loss" termId="stop_loss">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="w-full"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Take profit" termId="take_profit">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="w-full"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Risk %" termId="risk_percent" hint={`of $${defaults.accountSize.toLocaleString()} account`}>
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                className="w-full"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="R:R" termId="risk_reward" hint="auto-computed">
              <div className="w-full bg-panel2 border border-line rounded-md px-2 py-1 text-sm">
                {rr != null ? rr.toFixed(2) : "—"}
              </div>
            </Field>
          </div>

          <div className="rounded-md border border-warn/40 bg-warn/5 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Estimated liquidation risk</span>
              <span className="font-mono text-warn">
                {liq != null ? `~$${liq.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
              </span>
            </div>
            <p className="mt-1 text-muted leading-snug">
              Simplified estimate only. Real exchanges liquidate sooner due to maintenance margin, fees, funding, and
              mark price. Use this to feel the relationship between leverage and stop distance — not as an exact number.
            </p>
          </div>
        </>
      )}

      <Field label="Thesis" termId="thesis" hint="why this trade — reference a level, structure, or trend">
        <textarea
          rows={3}
          className="w-full"
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Pullback to $58k support inside an uptrend. Bullish rejection on the last candle suggests buyers are defending the level."
        />
      </Field>

      <Field label="Invalidation" termId="invalidation" hint="what proves the trade wrong">
        <textarea
          rows={2}
          className="w-full"
          value={invalidation}
          onChange={(e) => setInvalidation(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Close below $57.5k on the 6h timeframe."
        />
      </Field>

      <button
        type="submit"
        disabled={disabled}
        className="w-full bg-accent text-white font-semibold py-2 disabled:opacity-50"
      >
        Submit decision
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  termId,
  children,
}: {
  label: string;
  hint?: string;
  termId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-1 gap-2">
        <span className="text-xs font-semibold text-text inline-flex items-center gap-1.5">
          {label}
          {termId && <JargonTip termId={termId} />}
        </span>
        {hint && <span className="text-[10px] text-muted text-right">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
