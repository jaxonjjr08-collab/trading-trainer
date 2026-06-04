"use client";

// v4.1.8 — Learn as a focused path. Only the CURRENT module is expanded into
// a vertical node-path; completed and upcoming modules collapse into compact
// section cards. This keeps the page short (one section's worth of terms at
// a time) rather than dumping 57 nodes in a single 6000px column.
//
// URL behaviour preserved: this component renders the LIST view; the parent
// (app/learn/page.tsx) renders TermDetail when ?term=X is set.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CURRICULUM,
  currentModule,
  nextUnreadInModule,
  getCurriculumState,
  type CurriculumModule,
} from "@/lib/curriculum";
import { LEARN_TERMS, type LearnTerm } from "@/lib/learn";
import {
  latestQuizByTerm,
  listAttempts,
  masteryFromPercent,
  type Mastery,
} from "@/lib/storage";
import { SKILL_BY_ID, computeSkillScores, weakestSkill } from "@/lib/skills";

type NodeStatus = "mastered" | "read" | "current" | "locked";

type ModuleProgress = {
  module: CurriculumModule;
  index: number;
  readCount: number;
  masteredCount: number;
  total: number;
  status: "done" | "current" | "upcoming";
};

export default function LearnPath() {
  const router = useRouter();
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [masteryByTerm, setMasteryByTerm] = useState<Record<string, Mastery>>({});
  const [hydrated, setHydrated] = useState(false);
  const [refresherTermId, setRefresherTermId] = useState<string | null>(null);
  // Which modules the user has explicitly expanded beyond the default. The
  // current module is always expanded; past/future modules collapse unless
  // the user clicks them open for browsing.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const reads = new Set(getCurriculumState().readTermIds);
    const latest = latestQuizByTerm();
    const m: Record<string, Mastery> = {};
    for (const t of LEARN_TERMS) {
      const a = latest[t.id];
      m[t.id] = a ? masteryFromPercent(a.scorePercent) : "not_started";
    }
    setReadSet(reads);
    setMasteryByTerm(m);

    const allRead = CURRICULUM.every((mod) =>
      mod.termIds.every((id) => reads.has(id))
    );
    if (allRead) {
      const attempts = listAttempts();
      const weak = weakestSkill(computeSkillScores(attempts));
      const skill = weak ? SKILL_BY_ID[weak.id] : null;
      setRefresherTermId(skill?.termId ?? CURRICULUM[0]?.termIds[0] ?? null);
    } else {
      setRefresherTermId(null);
    }
    setHydrated(true);
  }, []);

  const progress: ModuleProgress[] = useMemo(() => {
    const current = currentModule(readSet);
    return CURRICULUM.map((mod, index) => {
      const readCount = mod.termIds.filter((id) => readSet.has(id)).length;
      const masteredCount = mod.termIds.filter(
        (id) => masteryByTerm[id] === "strong"
      ).length;
      const total = mod.termIds.length;
      const status: ModuleProgress["status"] =
        current == null
          ? "done"
          : mod.id === current.id
          ? "current"
          : readCount >= total
          ? "done"
          : "upcoming";
      return { module: mod, index, readCount, masteredCount, total, status };
    });
  }, [readSet, masteryByTerm]);

  const totalTerms = LEARN_TERMS.length;
  const totalRead = readSet.size;
  const totalMastered = LEARN_TERMS.filter(
    (t) => masteryByTerm[t.id] === "strong"
  ).length;
  const current = useMemo(() => currentModule(readSet), [readSet]);
  const nextTermId = current ? nextUnreadInModule(current, readSet) : null;
  const nextTerm = nextTermId
    ? LEARN_TERMS.find((t) => t.id === nextTermId) ?? null
    : null;
  const refresherTerm = refresherTermId
    ? LEARN_TERMS.find((t) => t.id === refresherTermId) ?? null
    : null;

  function openTerm(id: string) {
    router.replace(`/learn?term=${id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleModule(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!hydrated) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <OverallProgress
        readCount={totalRead}
        masteredCount={totalMastered}
        total={totalTerms}
      />

      {current && nextTerm ? (
        <PathHero
          moduleIndex={
            CURRICULUM.findIndex((m) => m.id === current.id) + 1
          }
          totalModules={CURRICULUM.length}
          module={current}
          nextTerm={nextTerm}
          onOpen={() => openTerm(nextTerm.id)}
        />
      ) : refresherTerm ? (
        <RefresherHero term={refresherTerm} onOpen={() => openTerm(refresherTerm.id)} />
      ) : null}

      <ol className="space-y-3 list-none">
        {progress.map((p) => {
          const expanded = p.status === "current" || openIds.has(p.module.id);
          return (
            <li key={p.module.id}>
              <ModuleCard
                progress={p}
                expanded={expanded}
                onToggle={() => toggleModule(p.module.id)}
                readSet={readSet}
                masteryByTerm={masteryByTerm}
                nextUnreadInThisModule={
                  p.status === "current" && current
                    ? nextUnreadInModule(p.module, readSet)
                    : null
                }
                onOpenTerm={openTerm}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Overall + hero (unchanged from v4.1.7) ─────────────────────────────────

function OverallProgress({
  readCount,
  masteredCount,
  total,
}: {
  readCount: number;
  masteredCount: number;
  total: number;
}) {
  const readPct = total > 0 ? (readCount / total) * 100 : 0;
  const masteredPct = total > 0 ? (masteredCount / total) * 100 : 0;
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-xs uppercase tracking-wider text-muted">
          Path progress
        </span>
        <span className="text-xs">
          <span className="text-text font-semibold">
            {readCount}/{total}
          </span>
          <span className="text-muted"> read</span>
          {masteredCount > 0 && (
            <>
              {" · "}
              <span className="text-good font-semibold">{masteredCount}</span>
              <span className="text-muted"> mastered</span>
            </>
          )}
        </span>
      </div>
      <div
        className="relative h-2 bg-panel2 rounded-full overflow-hidden border border-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={readCount}
        aria-label="Path progress"
      >
        <div
          className="absolute inset-y-0 left-0 bg-accent/40 transition-all"
          style={{ width: `${readPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-good transition-all"
          style={{ width: `${masteredPct}%` }}
        />
      </div>
    </div>
  );
}

function PathHero({
  moduleIndex,
  totalModules,
  module: mod,
  nextTerm,
  onOpen,
}: {
  moduleIndex: number;
  totalModules: number;
  module: CurriculumModule;
  nextTerm: LearnTerm;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-md border-2 border-accent/50 bg-accent/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-accent">
          Module {moduleIndex} of {totalModules} — {mod.title}
        </div>
        <div className="text-xl md:text-2xl font-bold mt-1">
          Next up: {nextTerm.term}
        </div>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-snug">
          {nextTerm.simpleDefinition}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 text-sm font-semibold bg-accent text-white px-5 py-2.5 rounded-md hover:opacity-90"
      >
        Continue →
      </button>
    </div>
  );
}

function RefresherHero({ term, onOpen }: { term: LearnTerm; onOpen: () => void }) {
  return (
    <div className="rounded-md border-2 border-good/50 bg-good/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-good">
          Refresher mode
        </div>
        <div className="text-xl md:text-2xl font-bold mt-1">
          You've read everything once. Re-open: {term.term}
        </div>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-snug">
          Picked from your weakest skill area. Re-reading after practice is when
          concepts actually stick.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 text-sm font-semibold bg-good text-bg px-5 py-2.5 rounded-md hover:opacity-90"
      >
        Open lesson →
      </button>
    </div>
  );
}

// ── Module card: collapsed header + (when expanded) inner path ─────────────

function ModuleCard({
  progress,
  expanded,
  onToggle,
  readSet,
  masteryByTerm,
  nextUnreadInThisModule,
  onOpenTerm,
}: {
  progress: ModuleProgress;
  expanded: boolean;
  onToggle: () => void;
  readSet: Set<string>;
  masteryByTerm: Record<string, Mastery>;
  nextUnreadInThisModule: string | null;
  onOpenTerm: (id: string) => void;
}) {
  const { module: mod, index, readCount, masteredCount, total, status } = progress;
  const isCurrent = status === "current";
  const isDone = status === "done";
  const isUpcoming = status === "upcoming";

  const headerClass = isCurrent
    ? "border-accent/60 bg-accent/5"
    : isDone
    ? "border-good/40 bg-good/5"
    : "border-line bg-panel";

  const StatusBadge = (
    <span
      className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base font-bold ${
        isDone
          ? "bg-good border-good text-bg"
          : isCurrent
          ? "bg-accent border-accent text-white"
          : "bg-panel2 border-line text-muted"
      }`}
      aria-hidden
    >
      {isDone ? "✓" : index + 1}
    </span>
  );

  return (
    <div className={`rounded-md border-2 ${headerClass} transition-all`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        {StatusBadge}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-bold">
              Module {index + 1} — {mod.title}
            </span>
            {mod.steps && mod.steps.length > 0 && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent border border-accent/40 bg-accent/10 px-1.5 py-0.5 rounded">
                ★ Course
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1 leading-snug">{mod.summary}</p>
          <div className="text-[11px] mt-1.5 flex items-center gap-2">
            <span className="text-muted">
              {readCount}/{total} read
            </span>
            {masteredCount > 0 && (
              <>
                <span className="text-muted">·</span>
                <span className="text-good font-semibold">
                  {masteredCount} mastered
                </span>
              </>
            )}
            {isUpcoming && (
              <>
                <span className="text-muted">·</span>
                <span className="text-muted italic">Click to open</span>
              </>
            )}
          </div>
        </div>
        <span
          className="text-muted text-base transition-transform shrink-0"
          aria-hidden
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line/70 p-4">
          {mod.steps && mod.steps.length > 0 && (
            <Link
              href={`/learn/course/${mod.id}`}
              className="block mb-4 rounded-md border border-accent/50 bg-accent/10 p-3 hover:bg-accent/15 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                    Take the course
                  </div>
                  <div className="text-sm font-semibold mt-0.5">
                    {mod.steps.length} guided steps — Teach → Practice → Test
                  </div>
                </div>
                <span className="text-xs font-semibold text-accent shrink-0">
                  Start →
                </span>
              </div>
            </Link>
          )}
          <ModulePath
            module={mod}
            readSet={readSet}
            masteryByTerm={masteryByTerm}
            nextUnreadInThisModule={nextUnreadInThisModule}
            onOpenTerm={onOpenTerm}
          />
        </div>
      )}
    </div>
  );
}

// ── Inner path: the nodes for a single (expanded) module ───────────────────

// Mild zigzag amplitude. -5/0/+5 reads as a path without feeling drunk.
// 4-cycle so the path returns smoothly instead of jumping back to the far
// left after the far right.
const NODE_OFFSETS_PX = [-40, 0, 40, 0] as const;

function statusForTerm(
  termId: string,
  readSet: Set<string>,
  masteryByTerm: Record<string, Mastery>,
  nextUnreadInThisModule: string | null
): NodeStatus {
  if (masteryByTerm[termId] === "strong") return "mastered";
  if (readSet.has(termId)) return "read";
  if (termId === nextUnreadInThisModule) return "current";
  return "locked";
}

function ModulePath({
  module: mod,
  readSet,
  masteryByTerm,
  nextUnreadInThisModule,
  onOpenTerm,
}: {
  module: CurriculumModule;
  readSet: Set<string>;
  masteryByTerm: Record<string, Mastery>;
  nextUnreadInThisModule: string | null;
  onOpenTerm: (id: string) => void;
}) {
  // v4.1.8 — clicking a node opens a preview card right under it instead of
  // navigating straight to the full term page. Lets the user shop the path
  // and decide what to actually read without losing context. Toggling the
  // same node again closes the card.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <ol className="list-none space-y-6">
      {mod.termIds.map((termId, i) => {
        const term = LEARN_TERMS.find((t) => t.id === termId);
        if (!term) return null;
        const status = statusForTerm(
          termId,
          readSet,
          masteryByTerm,
          nextUnreadInThisModule
        );
        const offset = NODE_OFFSETS_PX[i % NODE_OFFSETS_PX.length];
        const isSelected = selectedId === termId;
        const mastery = masteryByTerm[termId];
        return (
          <li key={termId}>
            <PathNode
              term={term}
              status={status}
              offsetPx={offset}
              selected={isSelected}
              onOpen={() => toggleSelect(termId)}
            />
            {isSelected && (
              <TermPreviewCard
                term={term}
                status={status}
                mastery={mastery}
                onRead={() => {
                  setSelectedId(null);
                  onOpenTerm(termId);
                }}
                onClose={() => setSelectedId(null)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TermPreviewCard({
  term,
  status,
  mastery,
  onRead,
  onClose,
}: {
  term: LearnTerm;
  status: NodeStatus;
  mastery: Mastery | undefined;
  onRead: () => void;
  onClose: () => void;
}) {
  const statusLabel =
    status === "mastered"
      ? "Mastered"
      : status === "read"
      ? "Read"
      : status === "current"
      ? "Next up"
      : "Not started yet";
  const statusTone =
    status === "mastered"
      ? "text-good"
      : status === "current"
      ? "text-accent"
      : status === "read"
      ? "text-accent"
      : "text-muted";

  return (
    <div className="mt-4 mx-auto max-w-md rounded-xl border-2 border-accent/60 bg-panel p-4 shadow-lg shadow-accent/10 relative">
      {/* Pointer triangle so the card visually reads as connected to the node. */}
      <div
        aria-hidden
        className="absolute -top-2 left-1/2 -ml-2 w-4 h-4 rotate-45 bg-panel border-l-2 border-t-2 border-accent/60"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-2 right-2 text-muted hover:text-text text-sm w-6 h-6 rounded-full border border-line bg-panel2 leading-none flex items-center justify-center"
      >
        ×
      </button>
      <div className="space-y-2.5">
        <div>
          <div
            className={`text-[10px] uppercase tracking-wider font-semibold ${statusTone}`}
          >
            {statusLabel}
            {mastery && mastery !== "not_started" && status !== "mastered" && (
              <span className="ml-2 text-muted normal-case tracking-normal">
                · last quiz: {mastery.replace("_", " ")}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold mt-0.5 leading-tight pr-6">
            {term.term}
          </h3>
        </div>
        <p className="text-sm text-text leading-snug">
          {term.simpleDefinition}
        </p>
        <div className="rounded-md border border-line bg-panel2 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            Why it matters
          </div>
          <p className="text-xs text-text mt-1 leading-snug">
            {term.whyItMatters}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onRead}
            className="flex-1 min-w-[140px] bg-accent text-white font-semibold text-sm py-2 rounded-md hover:opacity-90"
          >
            {status === "read" || status === "mastered"
              ? "Re-read full lesson →"
              : "Read full lesson →"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-text px-3 py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PathNode({
  term,
  status,
  offsetPx,
  selected,
  onOpen,
}: {
  term: LearnTerm;
  status: NodeStatus;
  offsetPx: number;
  selected: boolean;
  onOpen: () => void;
}) {
  const isCurrent = status === "current";
  const isMastered = status === "mastered";
  const isRead = status === "read";
  const isLocked = status === "locked";

  const ringClass = isMastered
    ? "bg-good border-good text-bg shadow-md shadow-good/30"
    : isCurrent
    ? "bg-accent border-accent text-white shadow-md shadow-accent/40 ring-4 ring-accent/30 animate-pulse"
    : isRead
    ? "bg-accent/20 border-accent text-accent"
    : "bg-panel2 border-line text-muted";

  const selectedClass = selected ? "ring-4 ring-accent/50 scale-105" : "";

  const icon = isMastered ? "✓" : isCurrent ? "▶" : isRead ? "✓" : "📘";

  return (
    <div className="flex items-center justify-center">
      <div
        className="flex flex-col items-center"
        style={{ transform: `translateX(${offsetPx}px)` }}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Preview ${term.term}`}
          aria-pressed={selected}
          className={`flex items-center justify-center w-20 h-20 rounded-full border-4 text-2xl font-bold transition-all hover:scale-105 ${ringClass} ${selectedClass}`}
        >
          {icon}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={`mt-2 max-w-[200px] text-center text-sm leading-tight font-semibold ${
            isLocked ? "text-muted" : "text-text"
          } hover:text-accent`}
        >
          {term.term}
        </button>
        {isCurrent && !selected && (
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-accent font-semibold">
            Next up
          </span>
        )}
      </div>
    </div>
  );
}
