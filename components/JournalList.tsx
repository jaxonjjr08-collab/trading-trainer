"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listAttempts, deleteAttempt as deleteAttemptFromStorage, clearAll } from "@/lib/storage";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import { SETUP_TYPE_LABELS, getScenarioById } from "@/lib/scenarios";
import { pickPrincipleForScore } from "@/lib/principles";
import { recommendLesson } from "@/lib/lessons";
import { primaryMistakeTag, primaryTermForTags, SEVERITY_CLASS, tagSeverity, termForTag } from "@/lib/learn";
import LessonCard from "./LessonCard";
import MascotBubble from "./MascotBubble";
import SkillTrendChart from "./SkillTrendChart";
import type { Attempt, Direction, MistakeTag } from "@/lib/types";

const DIRECTIONS: (Direction | "all")[] = ["all", "long", "short", "wait"];

export default function JournalList() {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirFilter, setDirFilter] = useState<Direction | "all">("all");
  const [tagFilter, setTagFilter] = useState<MistakeTag | "all">("all");

  useEffect(() => {
    setAttempts(listAttempts());
  }, []);

  const allTags = useMemo(() => {
    if (!attempts) return [] as MistakeTag[];
    const set = new Set<MistakeTag>();
    for (const a of attempts) for (const t of a.score.tags) set.add(t);
    return [...set];
  }, [attempts]);

  const filtered = useMemo(() => {
    if (!attempts) return [];
    return [...attempts]
      .filter((a) => dirFilter === "all" || a.decision.direction === dirFilter)
      .filter((a) => tagFilter === "all" || a.score.tags.includes(tagFilter))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [attempts, dirFilter, tagFilter]);

  function handleDelete(id: string) {
    deleteAttemptFromStorage(id);
    setAttempts(listAttempts());
  }
  function handleClearAll() {
    if (!confirm("Delete every saved attempt? This cannot be undone.")) return;
    clearAll();
    setAttempts([]);
  }

  if (attempts == null) return <div className="text-muted text-sm">Loading…</div>;

  if (attempts.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <MascotBubble mood="confused" size="xl" layout="stack">
          <p className="font-semibold">No attempts yet.</p>
          <p className="mt-1 text-muted">
            Every saved attempt lands here so you can come back, re-read your reasoning, and add notes about what you now
            see differently.
          </p>
          <Link
            href="/practice"
            className="mt-3 inline-block text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
          >
            Take your first attempt →
          </Link>
        </MascotBubble>
      </div>
    );
  }

  // v2.0.1 — total count + cumulative PnL across all closed trades.
  // "Process > P&L" is the philosophy, but the number should still be visible.
  const closed = attempts.filter(
    (a) => a.decision.direction !== "wait" && a.outcome.hit !== "neither"
  );
  const totalPnl = closed.reduce((s, a) => s + (a.outcome.pnlPercent ?? 0), 0);
  const wins = closed.filter((a) => (a.outcome.pnlPercent ?? 0) > 0).length;
  const oldest = attempts.reduce((m, a) => Math.min(m, a.createdAt), Date.now());
  const oldestStr = new Date(oldest).toLocaleDateString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-4">
        {attempts.length >= 1 && (
          <Link
            href="/journal/growth"
            className="text-xs font-semibold text-accent hover:underline"
          >
            ↗ Growth →
          </Link>
        )}
        {attempts.length >= 2 && (
          <Link
            href="/journal/compare"
            className="text-xs font-semibold text-accent hover:underline"
          >
            ⇄ Compare →
          </Link>
        )}
        <Link
          href="/journal/bookmarks"
          className="text-xs font-semibold text-accent hover:underline"
        >
          ★ Bookmarks →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-xs text-muted">Total attempts</div>
          <div className="text-2xl font-bold">{attempts.length}</div>
          <div className="text-[10px] text-muted">since {oldestStr}</div>
        </div>
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-xs text-muted">Closed trades</div>
          <div className="text-2xl font-bold">{closed.length}</div>
          <div className="text-[10px] text-muted">
            {wins}W / {closed.length - wins}L
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-xs text-muted">Cumulative PnL</div>
          <div
            className={`text-2xl font-bold ${totalPnl > 0 ? "text-good" : totalPnl < 0 ? "text-bad" : "text-text"}`}
          >
            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted">across closed trades</div>
        </div>
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="text-xs text-muted">Avg score</div>
          <div className="text-2xl font-bold">
            {Math.round(attempts.reduce((s, a) => s + a.score.total, 0) / attempts.length)}
            <span className="text-muted text-sm">/100</span>
          </div>
          <div className="text-[10px] text-muted">process quality</div>
        </div>
      </div>

      <SkillTrendChart attempts={attempts} />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-muted text-xs">Direction:</span>
          {DIRECTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className={`px-3 py-1.5 text-xs border ${
                dirFilter === d ? "bg-accent/20 border-accent text-accent" : "bg-panel2 border-line text-muted"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-muted text-xs">Tag:</span>
            <button
              onClick={() => setTagFilter("all")}
              className={`px-3 py-1.5 text-xs border ${
                tagFilter === "all" ? "bg-accent/20 border-accent text-accent" : "bg-panel2 border-line text-muted"
              }`}
            >
              all
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                className={`px-3 py-1.5 text-xs border ${
                  tagFilter === t ? "bg-accent/20 border-accent text-accent" : "bg-panel2 border-line text-muted"
                }`}
              >
                {MISTAKE_TAGS[t].label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleClearAll}
          className="ml-auto text-xs text-bad hover:underline"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-2">
        {filtered.map((a) => {
          const scenario = getScenarioById(a.scenarioId);
          const open = openId === a.id;
          return (
            <li key={a.id} className="bg-panel border border-line rounded-md">
              <div className="flex items-center gap-3 px-3 py-2 text-sm">
                <button
                  onClick={() => setOpenId(open ? null : a.id)}
                  className="flex-1 flex items-center gap-3 text-left hover:opacity-80"
                >
                  <span className="text-xs text-muted w-32">{new Date(a.createdAt).toLocaleString()}</span>
                  <span className="uppercase font-semibold text-xs w-14">{a.decision.direction}</span>
                  <span className="flex-1 text-xs">
                    {scenario ? (
                      scenario.title
                    ) : a.scenarioId.startsWith("proc-") ? (
                      <span className="text-muted italic">
                        Procedural scenario <span className="font-mono">({a.scenarioId})</span>
                      </span>
                    ) : (
                      <span className="text-muted italic">
                        Removed scenario <span className="font-mono">({a.scenarioId})</span>
                      </span>
                    )}
                  </span>
                  <span className={`font-mono font-semibold w-10 text-right ${a.score.total >= 70 ? "text-good" : a.score.total >= 50 ? "text-warn" : "text-bad"}`}>
                    {a.score.total}
                  </span>
                  <span className="text-xs text-muted w-10 text-right">
                    {a.outcome.hit === "tp" ? "TP" : a.outcome.hit === "sl" ? "SL" : a.outcome.hit === "liq" ? "LIQ" : "—"}
                  </span>
                  <span
                    className={`font-mono text-xs w-16 text-right ${
                      a.decision.direction === "wait" || a.outcome.hit === "neither"
                        ? "text-muted"
                        : (a.outcome.pnlPercent ?? 0) > 0
                        ? "text-good"
                        : (a.outcome.pnlPercent ?? 0) < 0
                        ? "text-bad"
                        : "text-muted"
                    }`}
                    title="PnL %"
                  >
                    {a.decision.direction === "wait" || a.outcome.hit === "neither"
                      ? "—"
                      : `${(a.outcome.pnlPercent ?? 0) >= 0 ? "+" : ""}${(a.outcome.pnlPercent ?? 0).toFixed(2)}%`}
                  </span>
                </button>
                <Link
                  href={`/journal/${a.id}`}
                  className="text-xs uppercase tracking-wider text-accent hover:underline shrink-0"
                >
                  Open →
                </Link>
              </div>

              {open && (
                <div className="border-t border-line p-3 space-y-3 text-sm">
                  {scenario && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span><span className="text-text">Setup:</span> {SETUP_TYPE_LABELS[scenario.setupType]}</span>
                      <span><span className="text-text">Difficulty:</span> {scenario.difficulty}</span>
                      <span><span className="text-text">Symbol:</span> {scenario.symbol}</span>
                      <span><span className="text-text">Timeframe:</span> {scenario.timeframe}</span>
                    </div>
                  )}

                  {/* Score breakdown bars */}
                  <div className="space-y-1">
                    {a.score.breakdown.map((b) => {
                      const p = b.points / b.max;
                      return (
                        <div key={b.id} className="flex items-center gap-2 text-xs">
                          <div className="w-36 shrink-0 text-muted">{b.label}</div>
                          <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${p >= 0.8 ? "bg-good" : p >= 0.5 ? "bg-warn" : "bg-bad"}`}
                              style={{ width: `${Math.max(0, p) * 100}%` }}
                            />
                          </div>
                          <div className="w-10 text-right font-mono">{b.points}/{b.max}</div>
                        </div>
                      );
                    })}
                  </div>

                  {a.score.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {a.score.tags.map((t) => {
                        const learn = termForTag(t);
                        const info = MISTAKE_TAGS[t];
                        const sevClass = info.positive
                          ? "border border-good/40 bg-good/10 text-good"
                          : SEVERITY_CLASS[tagSeverity(t)];
                        return (
                          <span
                            key={t}
                            className={`inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded-md ${sevClass}`}
                          >
                            <span title={info.description}>{info.label}</span>
                            {learn && (
                              <Link
                                href={`/learn?term=${learn.id}`}
                                className="text-xs uppercase tracking-wider underline opacity-70 hover:opacity-100"
                              >
                                Learn
                              </Link>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {a.decision.direction !== "wait" && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <Row label="Entry" value={a.decision.entry?.toLocaleString()} />
                      <Row label="Stop" value={a.decision.stopLoss?.toLocaleString()} />
                      <Row label="TP" value={a.decision.takeProfit?.toLocaleString()} />
                      <Row label="Leverage" value={a.decision.leverage != null ? `${a.decision.leverage}×` : undefined} />
                      <Row label="Risk %" value={a.decision.riskPercent != null ? `${a.decision.riskPercent}%` : undefined} />
                      <Row label="Outcome" value={a.outcome.hit === "neither" ? "No exit" : a.outcome.hit.toUpperCase()} />
                      <Row label="PnL %" value={a.decision.entry != null ? `${a.outcome.pnlPercent >= 0 ? "+" : ""}${a.outcome.pnlPercent.toFixed(2)}%` : undefined} />
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-muted uppercase mb-1">Thesis</div>
                    <div className="text-sm whitespace-pre-wrap">{a.decision.thesis || <span className="text-muted">—</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted uppercase mb-1">Invalidation</div>
                    <div className="text-sm whitespace-pre-wrap">{a.decision.invalidation || <span className="text-muted">—</span>}</div>
                  </div>

                  {a.reflection && (
                    <div className="rounded-md border border-accent/30 bg-accent/5 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-accent mb-1">
                        Your reflection
                      </div>
                      <div className="text-xs text-text leading-snug line-clamp-2">
                        {a.reflection}
                      </div>
                    </div>
                  )}

                  {a.score.weaknesses.length > 0 && (
                    <div>
                      <div className="text-xs text-bad uppercase mb-1">What to improve</div>
                      <ul className="space-y-0.5">
                        {a.score.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-muted">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scenario && (
                    <div className="rounded-md border border-line bg-panel2 p-3 space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted">What actually happened</div>
                      <p className="text-sm">{scenario.outcome.description}</p>
                      <p className="text-xs text-muted leading-snug">{scenario.outcome.takeaway}</p>
                    </div>
                  )}

                  <LessonCard
                    lesson={recommendLesson(a.score)}
                    term={primaryTermForTags(a.score.tags)}
                    primaryTag={primaryMistakeTag(a.score.tags)}
                  />

                  {(() => {
                    const principle = pickPrincipleForScore(a.score);
                    if (!principle) return null;
                    return (
                      <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
                        <div className="text-xs uppercase tracking-wide text-accent mb-1">Why this matters</div>
                        <div className="text-sm font-semibold mb-1">{principle.title}</div>
                        <p className="text-xs text-muted leading-snug">{principle.body}</p>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end pt-2 border-t border-line">
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-bad hover:underline">
                      Delete attempt
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-0.5">
      <span className="text-muted">{label}</span>
      <span className="font-mono">{value ?? "—"}</span>
    </div>
  );
}
