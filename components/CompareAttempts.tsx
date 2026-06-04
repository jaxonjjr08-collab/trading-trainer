"use client";

// v2.7 — Compare two attempts side-by-side. Default pairing: when called with
// ?left=<id>, the right side auto-fills with the most recent OTHER attempt on
// the same scenario (the most teaching-worthy comparison — same chart, two
// snapshots of the user). Both sides can be reassigned via dropdown.
//
// Sections rendered, in order of evidentiary value:
//   - Header band (date, scenario, direction, total score, outcome)
//   - Decision fields (entry, stop, TP, leverage, risk%, R:R)
//   - Score breakdown (per category, with deltas)
//   - Tags (set difference highlighted)
//   - Outcome (TP/SL/LIQ + PnL%)
//   - Thesis + invalidation (text diff is overkill — show both, let the eye work)

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listAttempts } from "@/lib/storage";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import { getScenarioById, SETUP_TYPE_LABELS } from "@/lib/scenarios";
import { SEVERITY_CLASS, tagSeverity } from "@/lib/learn";
import MascotBubble from "./MascotBubble";
import type { Attempt, MistakeTag } from "@/lib/types";

export default function CompareAttempts() {
  const searchParams = useSearchParams();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  useEffect(() => {
    const all = listAttempts().sort((a, b) => b.createdAt - a.createdAt);
    setAttempts(all);

    // Param convention: ?left=<id> pins one side (the attempt the user clicked
    // "Compare" on). We always render the OLDER attempt on the left and the
    // NEWER on the right so improvement reads left-to-right.
    const pinned =
      searchParams.get("left") ?? searchParams.get("right") ?? all[0]?.id ?? null;
    const pinnedAttempt = all.find((a) => a.id === pinned);
    if (!pinnedAttempt) return;

    // Best partner: most recent OTHER attempt on the same scenario, else most
    // recent OTHER attempt overall.
    const partner =
      all.find((a) => a.id !== pinnedAttempt.id && a.scenarioId === pinnedAttempt.scenarioId) ??
      all.find((a) => a.id !== pinnedAttempt.id);

    if (!partner) {
      setLeftId(pinnedAttempt.id);
      setRightId(null);
      return;
    }
    if (pinnedAttempt.createdAt <= partner.createdAt) {
      setLeftId(pinnedAttempt.id);
      setRightId(partner.id);
    } else {
      setLeftId(partner.id);
      setRightId(pinnedAttempt.id);
    }
  }, [searchParams]);

  if (attempts == null) return <div className="text-muted text-sm">Loading…</div>;

  if (attempts.length < 2) {
    return (
      <div className="py-8 flex justify-center">
        <MascotBubble mood="confused" size="xl" layout="stack">
          <p className="font-semibold">Need at least two attempts to compare.</p>
          <p className="mt-1 text-muted">
            Save another attempt — ideally on a scenario you've already practiced — and the comparison view will give you a real read on what changed.
          </p>
          <Link
            href="/practice"
            className="mt-3 inline-block text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
          >
            Open Practice →
          </Link>
        </MascotBubble>
      </div>
    );
  }

  const left = attempts.find((a) => a.id === leftId) ?? null;
  const right = attempts.find((a) => a.id === rightId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PickerColumn
          label="Older attempt"
          attempts={attempts}
          selectedId={leftId}
          otherId={rightId}
          onChange={setLeftId}
        />
        <PickerColumn
          label="Newer attempt"
          attempts={attempts}
          selectedId={rightId}
          otherId={leftId}
          onChange={setRightId}
        />
      </div>

      {left && right ? (
        <ComparisonGrid left={left} right={right} />
      ) : (
        <div className="text-sm text-muted italic">Pick two attempts above.</div>
      )}
    </div>
  );
}

function PickerColumn({
  label,
  attempts,
  selectedId,
  otherId,
  onChange,
}: {
  label: string;
  attempts: Attempt[];
  selectedId: string | null;
  otherId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-panel border border-line rounded-md px-2 py-1.5 text-sm"
      >
        <option value="" disabled>
          Pick an attempt
        </option>
        {attempts.map((a) => {
          const scenario = getScenarioById(a.scenarioId);
          const disabled = a.id === otherId;
          return (
            <option key={a.id} value={a.id} disabled={disabled}>
              {new Date(a.createdAt).toLocaleString()} · {a.decision.direction.toUpperCase()} ·{" "}
              {scenario?.title ?? a.scenarioId} · score {a.score.total}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function ComparisonGrid({ left, right }: { left: Attempt; right: Attempt }) {
  const sameScenario = left.scenarioId === right.scenarioId;
  const leftScenario = getScenarioById(left.scenarioId);
  const rightScenario = getScenarioById(right.scenarioId);

  return (
    <div className="space-y-4">
      {!sameScenario && (
        <div className="text-xs text-warn bg-warn/5 border border-warn/30 rounded-md px-3 py-2">
          These attempts are on <strong>different scenarios</strong>. Field-level deltas (entry, stop, TP) won't be apples-to-apples — only the score and process tags are directly comparable.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="text-xs uppercase tracking-wider text-muted self-end pb-1">
          Header
        </div>
        <Cell>
          <div className="text-xs text-muted">{new Date(left.createdAt).toLocaleString()}</div>
          <div className="font-semibold mt-1">{leftScenario?.title ?? left.scenarioId}</div>
          {leftScenario && (
            <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5">
              {SETUP_TYPE_LABELS[leftScenario.setupType]} · {leftScenario.symbol} · {leftScenario.timeframe}
            </div>
          )}
        </Cell>
        <Cell>
          <div className="text-xs text-muted">{new Date(right.createdAt).toLocaleString()}</div>
          <div className="font-semibold mt-1">{rightScenario?.title ?? right.scenarioId}</div>
          {rightScenario && (
            <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5">
              {SETUP_TYPE_LABELS[rightScenario.setupType]} · {rightScenario.symbol} · {rightScenario.timeframe}
            </div>
          )}
        </Cell>
      </div>

      <Section title="Total score">
        <ScoreCell value={left.score.total} />
        <ScoreCell value={right.score.total} delta={right.score.total - left.score.total} />
      </Section>

      <Section title="Direction">
        <Cell><DirectionPill dir={left.decision.direction} /></Cell>
        <Cell><DirectionPill dir={right.decision.direction} /></Cell>
      </Section>

      <Section title="Decision fields">
        <FieldGrid attempt={left} />
        <FieldGrid attempt={right} other={left} />
      </Section>

      <Section title="Score breakdown">
        <BreakdownColumn attempt={left} />
        <BreakdownColumn attempt={right} other={left} />
      </Section>

      <Section title="Tags">
        <TagsColumn attempt={left} other={right} />
        <TagsColumn attempt={right} other={left} />
      </Section>

      <Section title="Outcome">
        <OutcomeCell attempt={left} />
        <OutcomeCell attempt={right} />
      </Section>

      <Section title="Thesis">
        <Cell>
          <p className="text-sm whitespace-pre-wrap">
            {left.decision.thesis || <span className="text-muted italic">—</span>}
          </p>
        </Cell>
        <Cell>
          <p className="text-sm whitespace-pre-wrap">
            {right.decision.thesis || <span className="text-muted italic">—</span>}
          </p>
        </Cell>
      </Section>

      <Section title="Invalidation">
        <Cell>
          <p className="text-sm whitespace-pre-wrap">
            {left.decision.invalidation || <span className="text-muted italic">—</span>}
          </p>
        </Cell>
        <Cell>
          <p className="text-sm whitespace-pre-wrap">
            {right.decision.invalidation || <span className="text-muted italic">—</span>}
          </p>
        </Cell>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
        <Link href={`/journal/${left.id}`} className="text-xs text-accent hover:underline">
          Open older →
        </Link>
        <Link href={`/journal/${right.id}`} className="text-xs text-accent hover:underline">
          Open newer →
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-xs uppercase tracking-wider text-muted self-start pt-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">{children}</div>
  );
}

function ScoreCell({ value, delta }: { value: number; delta?: number }) {
  const color = value >= 70 ? "text-good" : value >= 50 ? "text-warn" : "text-bad";
  const deltaColor =
    delta == null || delta === 0
      ? "text-muted"
      : delta > 0
      ? "text-good"
      : "text-bad";
  return (
    <Cell>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono tab-nums ${color}`}>{value}</span>
        <span className="text-xs text-muted">/100</span>
        {delta != null && (
          <span className={`text-xs font-mono ${deltaColor}`}>
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
    </Cell>
  );
}

function DirectionPill({ dir }: { dir: Attempt["decision"]["direction"] }) {
  const color =
    dir === "long" ? "text-good" : dir === "short" ? "text-bad" : "text-muted";
  return (
    <span className={`text-sm font-semibold uppercase tracking-wide ${color}`}>{dir}</span>
  );
}

function FieldGrid({ attempt, other }: { attempt: Attempt; other?: Attempt }) {
  const d = attempt.decision;
  const o = other?.decision;
  const rr = computeRR(d.entry, d.stopLoss, d.takeProfit);
  const rrOther = o ? computeRR(o.entry, o.stopLoss, o.takeProfit) : null;
  return (
    <Cell>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Field label="Entry" value={fmt(d.entry)} otherValue={o ? fmt(o.entry) : undefined} />
        <Field label="Stop" value={fmt(d.stopLoss)} otherValue={o ? fmt(o.stopLoss) : undefined} />
        <Field label="TP" value={fmt(d.takeProfit)} otherValue={o ? fmt(o.takeProfit) : undefined} />
        <Field
          label="Leverage"
          value={d.leverage != null ? `${d.leverage}×` : "—"}
          otherValue={o && o.leverage != null ? `${o.leverage}×` : undefined}
        />
        <Field
          label="Risk %"
          value={d.riskPercent != null ? `${d.riskPercent}%` : "—"}
          otherValue={o && o.riskPercent != null ? `${o.riskPercent}%` : undefined}
        />
        <Field label="R:R" value={rr} otherValue={rrOther ?? undefined} />
      </dl>
    </Cell>
  );
}

function Field({
  label,
  value,
  otherValue,
}: {
  label: string;
  value: string;
  otherValue?: string;
}) {
  const differs = otherValue != null && otherValue !== value;
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd
        className={`text-right font-mono tab-nums ${
          differs ? "text-accent font-semibold" : "text-text"
        }`}
      >
        {value}
      </dd>
    </>
  );
}

function BreakdownColumn({ attempt, other }: { attempt: Attempt; other?: Attempt }) {
  const otherById: Record<string, number> = {};
  if (other) {
    for (const b of other.score.breakdown) otherById[b.id] = b.points;
  }
  return (
    <Cell>
      <div className="space-y-1">
        {attempt.score.breakdown.length === 0 ? (
          <div className="text-xs text-muted italic">No breakdown.</div>
        ) : (
          attempt.score.breakdown.map((b) => {
            const pct = b.points / b.max;
            const delta = other && b.id in otherById ? b.points - otherById[b.id] : null;
            const deltaColor =
              delta == null || delta === 0
                ? "text-muted"
                : delta > 0
                ? "text-good"
                : "text-bad";
            return (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <div className="w-28 shrink-0 text-muted truncate">{b.label}</div>
                <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pct >= 0.8 ? "bg-good" : pct >= 0.5 ? "bg-warn" : "bg-bad"}`}
                    style={{ width: `${Math.max(0, pct) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right font-mono tab-nums">
                  {b.points}/{b.max}
                </div>
                {delta != null && (
                  <div className={`w-8 text-right text-[10px] font-mono ${deltaColor}`}>
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Cell>
  );
}

function TagsColumn({ attempt, other }: { attempt: Attempt; other: Attempt }) {
  const otherSet = new Set<MistakeTag>(other.score.tags);
  return (
    <Cell>
      {attempt.score.tags.length === 0 ? (
        <div className="text-xs text-muted italic">No tags.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {attempt.score.tags.map((t) => {
            const info = MISTAKE_TAGS[t];
            const isNew = !otherSet.has(t);
            const baseClass = info.positive
              ? "border border-good/40 bg-good/10 text-good"
              : SEVERITY_CLASS[tagSeverity(t)];
            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md ${baseClass}`}
                title={info.description}
              >
                {info.label}
                {isNew && (
                  <span className="text-[9px] uppercase opacity-70">only here</span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </Cell>
  );
}

function OutcomeCell({ attempt }: { attempt: Attempt }) {
  const o = attempt.outcome;
  const isWait = attempt.decision.direction === "wait";
  const closed = !isWait && o.hit !== "neither";
  const pnl = o.pnlPercent ?? 0;
  const pnlColor =
    !closed ? "text-muted" : pnl > 0 ? "text-good" : pnl < 0 ? "text-bad" : "text-muted";
  return (
    <Cell>
      <div className="flex items-baseline gap-3 text-sm">
        <span className="font-semibold uppercase tracking-wide">
          {isWait ? "WAIT" : o.hit === "neither" ? "No exit" : o.hit.toUpperCase()}
        </span>
        {closed && (
          <span className={`font-mono tab-nums ${pnlColor}`}>
            {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(2)}%
          </span>
        )}
        {o.liquidated && (
          <span className="text-xs text-bad font-semibold uppercase">Liquidated</span>
        )}
      </div>
    </Cell>
  );
}

function computeRR(
  entry: number | null | undefined,
  stop: number | null | undefined,
  tp: number | null | undefined
): string {
  if (entry == null || stop == null || tp == null) return "—";
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(tp - entry);
  if (risk <= 0) return "—";
  return (reward / risk).toFixed(2);
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
