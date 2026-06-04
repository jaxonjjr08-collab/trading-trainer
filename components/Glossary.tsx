"use client";

// v2.8 — Dedicated glossary surface, lifted from the old LearnBrowser
// "All terms" tab. Promoted to its own /glossary route so it's discoverable
// from the top nav (and during practice — "wait, what's a fakeout?").
//
// Renders only the LIST view. When ?term=X is set on /glossary, the parent
// page renders TermDetail instead (same split as LearnPath).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_THEME,
  LEARN_CATEGORIES,
  LEARN_CATEGORY_LABELS,
  LEARN_TERMS,
  type LearnCategory,
  type LearnTerm,
} from "@/lib/learn";
import {
  MASTERY_LABEL,
  latestQuizByTerm,
  masteryFromPercent,
  type Mastery,
  type QuizAttempt,
} from "@/lib/storage";

type CategoryFilter = "all" | LearnCategory;
type MasteryFilter = "all" | Mastery;

const MASTERY_FILTERS: { id: MasteryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "needs_work", label: "Needs work" },
  { id: "improving", label: "Improving" },
  { id: "strong", label: "Strong" },
];

const MASTERY_BADGE: Record<Mastery, string> = {
  not_started: "border-line bg-panel2 text-muted",
  needs_work: "border-bad/40 bg-bad/10 text-bad",
  improving: "border-warn/40 bg-warn/10 text-warn",
  strong: "border-good/40 bg-good/10 text-good",
};

export default function Glossary() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("all");
  const [masteryByTerm, setMasteryByTerm] = useState<Record<string, Mastery>>({});
  const [latestQuiz, setLatestQuiz] = useState<Record<string, QuizAttempt>>({});

  useEffect(() => {
    const latest = latestQuizByTerm();
    const out: Record<string, Mastery> = {};
    for (const t of LEARN_TERMS) {
      const a = latest[t.id];
      out[t.id] = a ? masteryFromPercent(a.scorePercent) : "not_started";
    }
    setMasteryByTerm(out);
    setLatestQuiz(latest);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: LEARN_TERMS.length,
      risk_management: 0,
      chart_reading: 0,
      chart_tools: 0,
      trade_planning: 0,
      crypto_specific: 0,
    };
    for (const t of LEARN_TERMS) counts[t.category]++;
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEARN_TERMS.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (masteryFilter !== "all" && (masteryByTerm[t.id] ?? "not_started") !== masteryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.simpleDefinition.toLowerCase().includes(q) ||
        t.whyItMatters.toLowerCase().includes(q) ||
        t.example.toLowerCase().includes(q)
      );
    });
  }, [query, category, masteryFilter, masteryByTerm]);

  function openTerm(id: string) {
    router.replace(`/glossary?term=${id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-bg/95 backdrop-blur border-b border-line space-y-3">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms, definitions, examples…"
            className="w-full pl-9"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-text"
            >
              clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <CategoryChip
            label="All"
            count={categoryCounts.all}
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {LEARN_CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.label}
              count={categoryCounts[c.id]}
              active={category === c.id}
              theme={CATEGORY_THEME[c.id]}
              onClick={() => setCategory(c.id)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-muted mr-1">Mastery</span>
          {MASTERY_FILTERS.map((m) => {
            const count =
              m.id === "all"
                ? LEARN_TERMS.length
                : LEARN_TERMS.filter(
                    (t) => (masteryByTerm[t.id] ?? "not_started") === m.id
                  ).length;
            const active = masteryFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMasteryFilter(m.id)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-accent/15 border-accent/60 text-accent"
                    : "bg-panel border-line text-muted hover:text-text"
                }`}
              >
                <span>{m.label}</span>
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted">
        Showing {filtered.length} of {LEARN_TERMS.length} terms
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-line bg-panel p-8 text-center">
          <div className="text-sm text-muted mb-3">No terms match your search.</div>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setMasteryFilter("all");
            }}
            className="text-xs text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : category === "all" && !query && masteryFilter === "all" ? (
        <div className="space-y-3">
          {LEARN_CATEGORIES.map((cat) => {
            const inCat = filtered.filter((t) => t.category === cat.id);
            if (inCat.length === 0) return null;
            return (
              <details key={cat.id} open className="group rounded-md border border-line bg-panel">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-panel2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{cat.label}</span>
                    <span className="text-xs text-muted">{inCat.length}</span>
                  </div>
                  <span className="text-muted text-xs group-open:rotate-180 transition-transform" aria-hidden>▾</span>
                </summary>
                <div className="border-t border-line p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inCat.map((t) => (
                    <TermCard
                      key={t.id}
                      term={t}
                      query={query}
                      mastery={masteryByTerm[t.id] ?? "not_started"}
                      quizAttempt={latestQuiz[t.id] ?? null}
                      onOpen={() => openTerm(t.id)}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <TermCard
              key={t.id}
              term={t}
              query={query}
              mastery={masteryByTerm[t.id] ?? "not_started"}
              quizAttempt={latestQuiz[t.id] ?? null}
              onOpen={() => openTerm(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
  theme,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  theme?: { chip: string; chipActive: string };
}) {
  const base =
    "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors";
  const styles = theme
    ? active
      ? theme.chipActive
      : `bg-panel ${theme.chip}`
    : active
    ? "bg-accent/15 border-accent/60 text-accent"
    : "bg-panel border-line text-muted hover:text-text";
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      <span>{label}</span>
      <span className="text-[10px] opacity-70">{count}</span>
    </button>
  );
}

function TermCard({
  term,
  query,
  mastery,
  quizAttempt,
  onOpen,
}: {
  term: LearnTerm;
  query: string;
  mastery: Mastery;
  quizAttempt: QuizAttempt | null;
  onOpen: () => void;
}) {
  const theme = CATEGORY_THEME[term.category];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left group relative overflow-hidden rounded-md border border-line bg-panel hover:bg-panel2 hover:border-line/80 transition-all p-4 pl-5"
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bar}`} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}
        >
          {LEARN_CATEGORY_LABELS[term.category]}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${MASTERY_BADGE[mastery]}`}
        >
          {MASTERY_LABEL[mastery]}
        </span>
      </div>
      <div className="text-base font-semibold mb-1">
        <Highlight text={term.term} query={query} />
      </div>
      <p className="text-sm text-muted leading-snug line-clamp-3">
        <Highlight text={term.simpleDefinition} query={query} />
      </p>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted">
        Quiz:{" "}
        {quizAttempt ? (
          <span className="text-text">
            {quizAttempt.correctCount}/{quizAttempt.totalQuestions} correct
          </span>
        ) : (
          <span className="opacity-70">Not started</span>
        )}
      </div>
    </button>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-text rounded-sm px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
