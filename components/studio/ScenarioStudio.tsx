"use client";

// v3.4 — Scenario authoring tool. The maintainer's surface for hand-building
// scenarios without writing JSON. State shape:
//
//   - meta: id, title, symbol, timeframe, difficulty, setupType, basePrice
//   - visibleMoves[] / hiddenMoves[]: drift + vol per candle, fed into the
//     existing buildSeries helper. Live chart preview updates on every edit.
//   - keyLevels[]: editable price + label rows
//   - plan: full IdealDecisionPlan inputs
//   - notes: marketContext, neutralScenarioNotes, learningFocus, outcome
//     description + takeaway
//
// Output: a TypeScript literal calling buildRealScenario({...}), formatted
// to match the rest of lib/scenarios-real.ts so it pastes cleanly.

import { useEffect, useMemo, useState } from "react";
import Chart from "../Chart";
import HTFChart from "../HTFChart";
import { buildSeries, type Move } from "@/lib/scenarios";
import {
  findHTFDecisionIndex,
  htfBucketSize,
  htfFor,
  synthesizeHTF,
} from "@/lib/htf";
import type { Candle, Difficulty, Direction, SetupType } from "@/lib/types";

const DEFAULT_VISIBLE: Move[] = [
  { drift: 0.012, vol: 0.01 },
  { drift: 0.018, vol: 0.012 },
  { drift: -0.005, vol: 0.009 },
  { drift: 0.022, vol: 0.014 },
  { drift: 0.008, vol: 0.011 },
  { drift: -0.012, vol: 0.013 },
  { drift: -0.016, vol: 0.014 },
  { drift: -0.008, vol: 0.011 },
  { drift: 0.003, vol: 0.010 },
  { drift: 0.006, vol: 0.009 },
];

const DEFAULT_HIDDEN: Move[] = [
  { drift: 0.014, vol: 0.011 },
  { drift: 0.020, vol: 0.013 },
  { drift: 0.011, vol: 0.010 },
  { drift: -0.004, vol: 0.009 },
  { drift: 0.015, vol: 0.012 },
  { drift: 0.018, vol: 0.013 },
];

const SETUP_TYPES: SetupType[] = [
  "trend_continuation",
  "failed_breakout",
  "range_chop",
  "support_breakdown",
  "overextended",
  "liquidity_sweep",
  "clean_retest",
  "leverage_trap",
  "news_volatility",
  "no_setup",
];

type KeyLevelEdit = { price: string; label: string };

export default function ScenarioStudio() {
  // Metadata
  const [id, setId] = useState("new-scenario-2026");
  const [title, setTitle] = useState("New scenario");
  const [symbol, setSymbol] = useState("BTC/USD");
  const [timeframe, setTimeframe] = useState("6h");
  const [intervalSec, setIntervalSec] = useState(21600);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [setupType, setSetupType] = useState<SetupType>("trend_continuation");
  const [basePrice, setBasePrice] = useState(60000);
  const [seed, setSeed] = useState(42);

  // Candles
  const [visibleMoves, setVisibleMoves] = useState<Move[]>(DEFAULT_VISIBLE);
  const [hiddenMoves, setHiddenMoves] = useState<Move[]>(DEFAULT_HIDDEN);

  // v4.1.4 — HTF state. When non-null, the literal includes
  // higherTimeframe/higherTimeframeCandles/higherTimeframeDecisionIndex.
  // Authored as a button click instead of always-on so authors can leave it
  // off when the scenario doesn't need HTF (or wants the page to synthesise
  // at runtime instead of freezing the HTF into the scenario).
  const [htf, setHtf] = useState<{
    candles: Candle[];
    decisionIndex: number;
    label: string;
  } | null>(null);

  // Decision plan + key levels
  const [preferredDecision, setPreferredDecision] = useState<Direction>("long");
  const [keyLevels, setKeyLevels] = useState<KeyLevelEdit[]>([
    { price: "61500", label: "near-term resistance" },
    { price: "58000", label: "pullback support" },
  ]);
  const [planEntry, setPlanEntry] = useState("");
  const [planStop, setPlanStop] = useState("");
  const [planTP, setPlanTP] = useState("");
  const [planLeverage, setPlanLeverage] = useState("3");
  const [planRisk, setPlanRisk] = useState("1");
  const [planThesis, setPlanThesis] = useState("Pullback to support inside an uptrend with higher lows.");
  const [planInvalidation, setPlanInvalidation] = useState("Close below the pullback support breaks the higher-low structure.");

  // Notes
  const [marketContext, setMarketContext] = useState("Asset pulled back inside an established uptrend after a multi-week run-up.");
  const [neutralNotes, setNeutralNotes] = useState("Price ran from a recent low to the current resistance, paused, and is now retracing toward prior support.");
  const [learningFocus, setLearningFocus] = useState("Trend continuation: pullbacks inside an uptrend to a defined level are the highest-quality long entries with tight invalidation.");
  const [outcomeDescription, setOutcomeDescription] = useState("Price held the pullback support and resumed higher, reaching the resistance band over the following sessions.");
  const [outcomeTakeaway, setOutcomeTakeaway] = useState("Buying the pullback at the level (not chasing the breakout) gave the best entry with the tightest stop.");

  // Live chart
  const series = useMemo(() => {
    const startTime = Math.floor(Date.now() / 1000) - visibleMoves.length * intervalSec;
    return buildSeries(basePrice, visibleMoves, hiddenMoves, startTime, intervalSec, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePrice, visibleMoves, hiddenMoves, intervalSec, seed]);

  const lastVisibleClose = series.visible[series.visible.length - 1]?.close ?? basePrice;

  // v4.1.4 — derived: can the current timeframe step up to an HTF at all?
  // Some timeframes (1d) have no Coinbase-supported parent, so the button
  // would produce nothing useful.
  const bucket = htfBucketSize(timeframe);
  const htfStep = htfFor(timeframe);
  const canSynthesizeHtf = bucket > 1 && htfStep != null;

  function generateHtf() {
    if (!canSynthesizeHtf) return;
    const all = [...series.visible, ...series.hidden];
    const synth = synthesizeHTF(all, bucket);
    if (synth.length === 0) return;
    const decisionCandle = series.visible[series.visible.length - 1];
    const decisionIndex = decisionCandle
      ? findHTFDecisionIndex(synth, decisionCandle.time)
      : synth.length - 1;
    setHtf({ candles: synth, decisionIndex, label: htfStep! });
  }

  function clearHtf() {
    setHtf(null);
  }

  // Stale-HTF guard: when the LTF candles change after HTF was generated, the
  // saved HTF is now derived from old data. Clear it so the author can't paste
  // a literal whose HTF doesn't match the LTF.
  useEffect(() => {
    if (htf == null) return;
    setHtf(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMoves, hiddenMoves, basePrice, intervalSec, seed, timeframe]);

  // Auto-fill entry once when it's blank and the chart has a close. Effect
  // (not render) so we don't kick off setState during render.
  useEffect(() => {
    if (planEntry === "" && Number.isFinite(lastVisibleClose)) {
      setPlanEntry(lastVisibleClose.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVisibleClose]);

  // ── Output ───────────────────────────────────────────────────────────────

  const tsLiteral = useMemo(() => {
    const indent = "  ";
    const candlesLiteral = JSON.stringify(
      [...series.visible, ...series.hidden],
      null,
      2
    )
      .split("\n")
      .map((l) => indent + indent + l)
      .join("\n")
      .trimStart();

    const htfBlock = htf
      ? `${indent}higherTimeframe: ${JSON.stringify(htf.label)},
${indent}higherTimeframeCandles: ${JSON.stringify(htf.candles, null, 2)
          .split("\n")
          .map((l) => indent + indent + l)
          .join("\n")
          .trimStart()},
${indent}higherTimeframeDecisionIndex: ${htf.decisionIndex},
`
      : "";

    const levelsLiteral = keyLevels
      .filter((k) => k.price.trim() !== "")
      .map(
        (k) =>
          `${indent}${indent}{ price: ${Number(k.price)}, label: ${JSON.stringify(k.label)} },`
      )
      .join("\n");

    const planFields: string[] = [`${indent}${indent}direction: ${JSON.stringify(preferredDecision)},`];
    if (preferredDecision !== "wait") {
      if (planEntry) planFields.push(`${indent}${indent}entry: ${Number(planEntry)},`);
      if (planStop) planFields.push(`${indent}${indent}stopLoss: ${Number(planStop)},`);
      if (planTP) planFields.push(`${indent}${indent}takeProfit: ${Number(planTP)},`);
      if (planLeverage) planFields.push(`${indent}${indent}leverage: ${Number(planLeverage)},`);
      if (planRisk) planFields.push(`${indent}${indent}riskPercent: ${Number(planRisk)},`);
    }
    planFields.push(`${indent}${indent}thesis: ${JSON.stringify(planThesis)},`);
    planFields.push(`${indent}${indent}invalidation: ${JSON.stringify(planInvalidation)},`);

    return `buildRealScenario({
${indent}id: ${JSON.stringify(id)},
${indent}title: ${JSON.stringify(title)},
${indent}symbol: ${JSON.stringify(symbol)},
${indent}timeframe: ${JSON.stringify(timeframe)},
${indent}difficulty: ${JSON.stringify(difficulty)},
${indent}setupType: ${JSON.stringify(setupType)},
${indent}candles: ${candlesLiteral},
${indent}visibleCount: ${series.visible.length},
${indent}keyLevels: [
${levelsLiteral}
${indent}],
${indent}preferredDecision: ${JSON.stringify(preferredDecision)},
${indent}marketContext: ${JSON.stringify(marketContext)},
${indent}neutralScenarioNotes: ${JSON.stringify(neutralNotes)},
${indent}learningFocus: ${JSON.stringify(learningFocus)},
${indent}outcome: {
${indent}${indent}description: ${JSON.stringify(outcomeDescription)},
${indent}${indent}takeaway: ${JSON.stringify(outcomeTakeaway)},
${indent}},
${indent}lessonRecommendation: "entry_timing",
${indent}context: {
${indent}${indent}trend: ${JSON.stringify(setupType === "range_chop" ? "range" : preferredDecision === "short" ? "down" : "up")},
${indent}${indent}support: [${keyLevels.filter((k) => /support|low/i.test(k.label)).map((k) => Number(k.price)).join(", ")}],
${indent}${indent}resistance: [${keyLevels.filter((k) => /resistance|high|breakout/i.test(k.label)).map((k) => Number(k.price)).join(", ")}],
${indent}${indent}currentPrice: ${lastVisibleClose},
${indent}${indent}bestDirection: ${JSON.stringify(preferredDecision)},
${indent}${indent}notes: ${JSON.stringify(neutralNotes)},
${indent}},
${htfBlock}${indent}idealDecisionPlan: {
${planFields.join("\n")}
${indent}},
}),`;
  }, [
    id, title, symbol, timeframe, difficulty, setupType,
    series, keyLevels, htf,
    preferredDecision, planEntry, planStop, planTP, planLeverage, planRisk, planThesis, planInvalidation,
    marketContext, neutralNotes, learningFocus, outcomeDescription, outcomeTakeaway, lastVisibleClose,
  ]);

  function copy() {
    try {
      navigator.clipboard.writeText(tsLiteral);
    } catch {
      // Browsers without clipboard permission — user can still select & copy.
    }
  }

  return (
    <div className="space-y-5">
      {/* Live chart preview, sticky-ish at top so it's always visible while editing below. */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Live preview
          </h2>
          <span className="text-[10px] text-muted">
            {series.visible.length} visible · {series.hidden.length} hidden ·{" "}
            seed {seed}
          </span>
        </div>
        <Chart visible={series.visible} hidden={series.hidden} revealHidden={false} height={360} />
      </section>

      {/* Metadata + base candle params */}
      <Section title="Metadata">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldText label="id (URL-safe)" value={id} onChange={setId} />
          <FieldText label="title" value={title} onChange={setTitle} />
          <FieldText label="symbol" value={symbol} onChange={setSymbol} />
          <FieldText label="timeframe (display)" value={timeframe} onChange={setTimeframe} />
          <FieldNumber label="interval (seconds)" value={intervalSec} onChange={setIntervalSec} />
          <FieldSelect
            label="difficulty"
            value={difficulty}
            options={["easy", "medium", "hard"]}
            onChange={(v) => setDifficulty(v as Difficulty)}
          />
          <FieldSelect
            label="setup type"
            value={setupType}
            options={SETUP_TYPES}
            onChange={(v) => setSetupType(v as SetupType)}
          />
          <FieldNumber label="base price" value={basePrice} onChange={setBasePrice} />
          <FieldNumber label="seed" value={seed} onChange={setSeed} />
        </div>
      </Section>

      {/* Candle move editors */}
      <Section title="Visible candles (decision-point window)">
        <MoveList moves={visibleMoves} onChange={setVisibleMoves} />
      </Section>

      <Section title="Hidden candles (what happens after the decision)">
        <MoveList moves={hiddenMoves} onChange={setHiddenMoves} />
      </Section>

      {/* v4.1.4 — auto-generate HTF from the LTF candles via the existing
          synthesizeHTF/findHTFDecisionIndex helpers. Saves authors from
          either fetching real HTF data or hand-bucketing candles. */}
      <Section title="Higher timeframe (optional)">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {canSynthesizeHtf ? (
            <button
              type="button"
              onClick={generateHtf}
              className="bg-accent text-white font-semibold px-3 py-1.5 rounded-md hover:opacity-90"
            >
              Auto-generate HTF from LTF{htfStep ? ` (→ ${htfStep})` : ""}
            </button>
          ) : (
            <span className="text-muted italic">
              No HTF step for timeframe <code>{timeframe}</code> — set the
              Metadata timeframe to one of 15m / 1h / 4h / 6h to enable HTF
              synthesis.
            </span>
          )}
          {htf && (
            <>
              <span className="text-muted">
                {htf.candles.length} {htf.label} candles · decision at index{" "}
                {htf.decisionIndex}
              </span>
              <button
                type="button"
                onClick={clearHtf}
                className="text-muted hover:text-text underline"
              >
                Clear
              </button>
            </>
          )}
        </div>
        {htf && (
          <div className="rounded-md border border-line bg-panel2 p-2">
            <HTFChart
              candles={htf.candles}
              decisionIndex={htf.decisionIndex}
              timeframe={htf.label}
              height={140}
            />
          </div>
        )}
        {!htf && (
          <p className="text-[10px] text-muted">
            Leaving this off is fine — the Practice page auto-synthesises HTF
            at runtime for scenarios without one. Generating here freezes the
            HTF into the literal so the same chart shows across builds.
          </p>
        )}
      </Section>

      {/* Key levels */}
      <Section title="Key levels (price overlays + labels)">
        <KeyLevelList levels={keyLevels} onChange={setKeyLevels} />
      </Section>

      {/* Preferred decision + plan */}
      <Section title="Preferred decision + ideal plan">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldSelect
            label="preferredDecision"
            value={preferredDecision}
            options={["long", "short", "wait"]}
            onChange={(v) => setPreferredDecision(v as Direction)}
          />
          <FieldText label={`entry (auto: ${lastVisibleClose})`} value={planEntry} onChange={setPlanEntry} />
          <FieldText label="stop loss" value={planStop} onChange={setPlanStop} />
          <FieldText label="take profit" value={planTP} onChange={setPlanTP} />
          <FieldText label="leverage" value={planLeverage} onChange={setPlanLeverage} />
          <FieldText label="risk %" value={planRisk} onChange={setPlanRisk} />
        </div>
        <FieldTextarea label="plan thesis" value={planThesis} onChange={setPlanThesis} rows={2} />
        <FieldTextarea label="plan invalidation" value={planInvalidation} onChange={setPlanInvalidation} rows={2} />
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <FieldTextarea label="marketContext" value={marketContext} onChange={setMarketContext} rows={2} />
        <FieldTextarea label="neutralScenarioNotes" value={neutralNotes} onChange={setNeutralNotes} rows={2} />
        <FieldTextarea label="learningFocus" value={learningFocus} onChange={setLearningFocus} rows={2} />
        <FieldTextarea label="outcome.description" value={outcomeDescription} onChange={setOutcomeDescription} rows={2} />
        <FieldTextarea label="outcome.takeaway" value={outcomeTakeaway} onChange={setOutcomeTakeaway} rows={2} />
      </Section>

      {/* Output */}
      <Section title="Generated buildRealScenario literal">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted">
            Paste into <code className="text-text">lib/scenarios-real.ts</code> inside the REAL_SCENARIOS array.
          </span>
          <button
            type="button"
            onClick={copy}
            className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
          >
            Copy to clipboard
          </button>
        </div>
        <pre className="text-[11px] font-mono bg-panel2 border border-line rounded-md p-3 max-h-96 overflow-auto whitespace-pre-wrap">
          {tsLiteral}
        </pre>
      </Section>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="rounded-md border border-line bg-panel p-3 space-y-3">
        {children}
      </div>
    </section>
  );
}

function FieldText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-panel2 border border-line text-text text-sm px-2 py-1 rounded font-mono"
      />
    </label>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full bg-panel2 border border-line text-text text-sm px-2 py-1 rounded font-mono"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-panel2 border border-line text-text text-sm px-2 py-1 rounded font-mono"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-panel2 border border-line text-text text-sm px-2 py-1 rounded"
      />
    </label>
  );
}

function MoveList({ moves, onChange }: { moves: Move[]; onChange: (next: Move[]) => void }) {
  function setRow(idx: number, patch: Partial<Move>) {
    onChange(moves.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }
  function addRow() {
    onChange([...moves, { drift: 0, vol: 0.01 }]);
  }
  function removeRow(idx: number) {
    onChange(moves.filter((_, i) => i !== idx));
  }
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wider text-muted px-1">
        <span>#</span>
        <span>drift (e.g. 0.012 = +1.2%)</span>
        <span>vol (e.g. 0.01 = 1%)</span>
        <span aria-hidden></span>
      </div>
      {moves.map((m, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
          <span className="text-[10px] text-muted font-mono">{i + 1}</span>
          <input
            type="number"
            step="0.001"
            value={m.drift}
            onChange={(e) => setRow(i, { drift: Number(e.target.value) })}
            className="bg-panel2 border border-line text-text text-xs px-2 py-1 rounded font-mono"
          />
          <input
            type="number"
            step="0.001"
            value={m.vol}
            onChange={(e) => setRow(i, { vol: Number(e.target.value) })}
            className="bg-panel2 border border-line text-text text-xs px-2 py-1 rounded font-mono"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-xs text-muted hover:text-bad"
            aria-label={`Remove candle ${i + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-accent hover:underline mt-2"
      >
        + Add candle
      </button>
    </div>
  );
}

function KeyLevelList({
  levels,
  onChange,
}: {
  levels: KeyLevelEdit[];
  onChange: (next: KeyLevelEdit[]) => void;
}) {
  function setRow(idx: number, patch: Partial<KeyLevelEdit>) {
    onChange(levels.map((k, i) => (i === idx ? { ...k, ...patch } : k)));
  }
  function addRow() {
    onChange([...levels, { price: "", label: "" }]);
  }
  function removeRow(idx: number) {
    onChange(levels.filter((_, i) => i !== idx));
  }
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_2fr_2rem] gap-2 text-[10px] uppercase tracking-wider text-muted px-1">
        <span>price</span>
        <span>label</span>
        <span aria-hidden></span>
      </div>
      {levels.map((k, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr_2rem] gap-2 items-center">
          <input
            type="number"
            value={k.price}
            onChange={(e) => setRow(i, { price: e.target.value })}
            className="bg-panel2 border border-line text-text text-xs px-2 py-1 rounded font-mono"
            placeholder="60000"
          />
          <input
            type="text"
            value={k.label}
            onChange={(e) => setRow(i, { label: e.target.value })}
            className="bg-panel2 border border-line text-text text-xs px-2 py-1 rounded"
            placeholder="e.g. pullback support"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-xs text-muted hover:text-bad"
            aria-label={`Remove level ${i + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-accent hover:underline mt-2"
      >
        + Add level
      </button>
    </div>
  );
}
