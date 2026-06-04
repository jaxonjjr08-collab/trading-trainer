"use client";

import { useState } from "react";
import {
  ALL_DIFFICULTIES,
  ALL_SETUP_TYPES,
  ALL_SYMBOLS,
  ALL_TIMEFRAMES,
  SCENARIOS,
  SETUP_TYPE_BLURBS,
  SETUP_TYPE_LABELS,
} from "@/lib/scenarios";
import type { Difficulty, SetupType } from "@/lib/types";

// Setup types with at least one scenario in the library. Hides "no_setup",
// "news_volatility", or any other type that's declared in the enum but
// hasn't had any content authored yet — selecting an empty filter returns
// zero matches and frustrates the user. Filter is recomputed at module load.
const POPULATED_SETUP_TYPES: SetupType[] = ALL_SETUP_TYPES.filter((s) =>
  SCENARIOS.some((x) => x.setupType === s)
);
const POPULATED_SYMBOLS: string[] = ALL_SYMBOLS.filter((sym) =>
  SCENARIOS.some((x) => x.symbol === sym)
);
const POPULATED_TIMEFRAMES: string[] = ALL_TIMEFRAMES.filter((tf) =>
  SCENARIOS.some((x) => x.timeframe === tf)
);

export type FilterState = {
  difficulty: Difficulty | "all";
  setupType: SetupType | "all";
  symbol: string | "all";
  timeframe: string | "all";
  // v2.0.1 — restrict the pool to bookmarked scenarios.
  bookmarkedOnly?: boolean;
};

type Props = {
  state: FilterState;
  matchCount: number;
  onChange: (next: FilterState) => void;
  onRandom: () => void;
  onNext: () => void;
  // v3.0 — generate a fresh procedural scenario (when supported). Optional so
  // older callers continue to work; when omitted the button is hidden.
  onGenerate?: () => void;
  // v2.3 — Practice page passes true when the user has fewer than 10 attempts.
  // The setup-type filter contains trader jargon (liquidity sweep, leverage
  // trap, clean retest) that a beginner can't filter by yet. Hidden by default
  // until 10 attempts, with a "show anyway" override for the curious.
  hideSetupType?: boolean;
};

export default function PracticeFilters({
  state,
  matchCount,
  onChange,
  onRandom,
  onNext,
  onGenerate,
  hideSetupType = false,
}: Props) {
  // Per-session override: when hideSetupType is true the user can still opt in
  // by clicking "show anyway." Resets on page navigation; the gate re-applies
  // until the user crosses the 10-attempt threshold.
  const [overrideShow, setOverrideShow] = useState(false);
  const showSetupSelect = !hideSetupType || overrideShow;

  return (
    <div className="rounded-md border border-line bg-panel2 p-3 space-y-3 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Difficulty"
          value={state.difficulty}
          onChange={(v) => onChange({ ...state, difficulty: v as FilterState["difficulty"] })}
          options={[{ value: "all", label: "All" }, ...ALL_DIFFICULTIES.map((d) => ({ value: d, label: d }))]}
        />
        {showSetupSelect ? (
          <Select
            label="Setup"
            value={state.setupType}
            onChange={(v) => onChange({ ...state, setupType: v as FilterState["setupType"] })}
            options={[
              { value: "all", label: "All" },
              ...POPULATED_SETUP_TYPES.map((s) => ({
                value: s,
                label: SETUP_TYPE_LABELS[s],
                title: SETUP_TYPE_BLURBS[s],
              })),
            ]}
          />
        ) : (
          <SetupGated onShowAnyway={() => setOverrideShow(true)} />
        )}
        <Select
          label="Symbol"
          value={state.symbol}
          onChange={(v) => onChange({ ...state, symbol: v })}
          options={[{ value: "all", label: "All" }, ...POPULATED_SYMBOLS.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          label="Timeframe"
          value={state.timeframe}
          onChange={(v) => onChange({ ...state, timeframe: v })}
          options={[{ value: "all", label: "All" }, ...POPULATED_TIMEFRAMES.map((t) => ({ value: t, label: t }))]}
        />

        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!state.bookmarkedOnly}
            onChange={(e) => onChange({ ...state, bookmarkedOnly: e.target.checked })}
            className="cursor-pointer"
          />
          <span>★ Bookmarked only</span>
        </label>

        <div className="ml-auto flex gap-2">
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              title="Generate a fresh procedural scenario (v3.0)"
              className="text-xs bg-accent/10 border border-accent/40 text-accent px-3 py-1.5 hover:bg-accent/20"
            >
              ✦ Generate
            </button>
          )}
          <button
            type="button"
            onClick={onRandom}
            disabled={matchCount === 0}
            className="text-xs bg-panel border border-line px-3 py-1.5 hover:bg-panel2 disabled:opacity-50"
          >
            Random
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0}
            className="text-xs bg-panel border border-line px-3 py-1.5 hover:bg-panel2 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
      <div className="text-xs text-muted">
        {matchCount === 0 ? (
          <span className="text-warn">No scenarios match these filters.</span>
        ) : (
          <span>
            {matchCount} to choose from. Click <span className="text-text font-semibold">Random</span> or{" "}
            <span className="text-text font-semibold">Next</span> to start.
          </span>
        )}
      </div>
    </div>
  );
}

// v2.3 — Placeholder shown in place of the setup-type filter for users with
// fewer than 10 attempts. "Show anyway" lets curious users override without
// having to wait for the attempt count to roll over.
function SetupGated({ onShowAnyway }: { onShowAnyway: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted">Setup</span>
      <div className="flex items-center gap-2 text-xs text-muted bg-panel border border-line px-2 py-1.5 min-w-[8rem] rounded-md">
        <span title="The setup-type filter unlocks after 10 attempts so you've seen the patterns at least once.">
          Unlocks after 10 attempts ⓘ
        </span>
        <button
          type="button"
          onClick={onShowAnyway}
          className="text-[10px] text-accent hover:underline ml-auto shrink-0"
        >
          Show anyway
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; title?: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel border border-line text-text text-xs px-2 py-1.5 min-w-[8rem]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} title={o.title}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
