"use client";

// v5.10.0 — Guided scenario path panel for /practice. Collapsible: the header
// always shows overall progress and a "Continue" button; expanding reveals the
// three stages (Foundations / Building / Mastery) with a node per scenario so
// the learner has a clear easy→hard ladder instead of a random pile. Reads
// attempts from storage; the parent bumps `refreshTrigger` after each save so
// cleared ticks appear immediately.

import { useEffect, useMemo, useState } from "react";
import { listAttempts } from "@/lib/storage";
import { SectionMarks } from "@/components/FeatureCard";
import { getScenarioById, SETUP_TYPE_LABELS } from "@/lib/scenarios";
import {
  SCENARIO_STAGES,
  nextUnclearedScenarioId,
  scenarioNodeStatus,
  scenarioPathProgress,
  type ScenarioNodeStatus,
} from "@/lib/scenario-path";
import type { Attempt } from "@/lib/types";

export default function ScenarioPath({
  activeScenarioId,
  onSelect,
  refreshTrigger = 0,
}: {
  activeScenarioId: string;
  onSelect: (scenarioId: string) => void;
  refreshTrigger?: number;
}) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setAttempts(listAttempts());
    setHydrated(true);
  }, [refreshTrigger]);

  const progress = useMemo(() => scenarioPathProgress(attempts), [attempts]);
  const nextId = useMemo(() => nextUnclearedScenarioId(attempts), [attempts]);
  const nextScenario = nextId ? getScenarioById(nextId) : null;
  const complete = nextId == null;

  if (!hydrated) return null;

  const pct =
    progress.total > 0 ? (progress.cleared / progress.total) * 100 : 0;

  return (
    <div className="rounded-md border border-line bg-panel">
      {/* Header — always visible */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full border-2 border-accent/50 bg-accent/10 flex items-center justify-center text-accent"
            aria-hidden
          >
            {SectionMarks.path}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold">Scenario path</span>
              <span className="text-xs text-muted">
                {progress.cleared}/{progress.total} cleared
              </span>
            </span>
            <span className="mt-1.5 block h-1.5 rounded-full bg-panel2 overflow-hidden border border-line">
              <span
                className="block h-full bg-good transition-all"
                style={{ width: `${pct}%` }}
              />
            </span>
          </span>
          <span
            className="text-muted text-base transition-transform shrink-0"
            aria-hidden
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </button>

        {complete ? (
          <span className="shrink-0 text-xs font-semibold text-good border border-good/40 bg-good/10 px-3 py-2 rounded-md text-center">
            ✓ Path complete
          </span>
        ) : (
          <button
            type="button"
            onClick={() => nextId && onSelect(nextId)}
            title={nextScenario ? `Next: ${nextScenario.title}` : undefined}
            className="shrink-0 text-xs font-semibold bg-accent text-white px-4 py-2 rounded-md hover:opacity-90"
          >
            {progress.cleared === 0 ? "Start path →" : "Continue →"}
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-line p-4 space-y-4">
          {SCENARIO_STAGES.map((stage, si) => {
            const sp = progress.stages.find((x) => x.stage.id === stage.id)!;
            return (
              <div key={stage.id}>
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-panel2 border border-line text-[10px] font-bold flex items-center justify-center">
                      {si + 1}
                    </span>
                    <span className="text-sm font-bold">{stage.title}</span>
                    <span className="text-[11px] text-muted truncate">
                      {stage.blurb}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-mono text-muted">
                    {sp.clearedCount}/{sp.total}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stage.scenarioIds.map((id) => {
                    const sc = getScenarioById(id);
                    if (!sc) return null;
                    const status = scenarioNodeStatus(id, attempts, nextId);
                    const isActive = id === activeScenarioId;
                    return (
                      <ScenarioChip
                        key={id}
                        label={SETUP_TYPE_LABELS[sc.setupType]}
                        symbol={sc.symbol}
                        status={status}
                        active={isActive}
                        onClick={() => onSelect(id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted leading-snug">
            A scenario clears when you score{" "}
            <span className="font-mono">70%+</span> on it. ✓ cleared · ▶ current
            · • attempted (not yet passed) · the rest are still ahead.
          </p>
        </div>
      )}
    </div>
  );
}

function ScenarioChip({
  label,
  symbol,
  status,
  active,
  onClick,
}: {
  label: string;
  symbol: string;
  status: ScenarioNodeStatus;
  active: boolean;
  onClick: () => void;
}) {
  const icon =
    status === "cleared"
      ? "✓"
      : status === "current"
      ? "▶"
      : status === "attempted"
      ? "•"
      : "";
  const tone =
    status === "cleared"
      ? "border-good/50 bg-good/10 text-good"
      : status === "current"
      ? "border-accent/60 bg-accent/15 text-accent"
      : status === "attempted"
      ? "border-warn/40 bg-warn/5 text-warn"
      : "border-line bg-panel2 text-muted hover:text-text";
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${symbol} · ${label}`}
      className={`inline-flex items-center gap-1 max-w-[150px] px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${tone} ${
        active ? "ring-2 ring-accent/50" : ""
      }`}
    >
      {icon && <span aria-hidden>{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
}
