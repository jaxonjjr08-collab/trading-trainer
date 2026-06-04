"use client";

// v2.7 — Bookmarks page. Lists every scenario the user has starred, with a
// one-click "Open in Practice" and inline unbookmark. Empty state explains
// where bookmarks come from (the star button on the Practice page header).
//
// Source of truth: trainer.bookmarks.v1 in localStorage, accessed through
// listBookmarks/toggleBookmark in lib/storage. Re-reads on every mount so
// navigating away and back reflects the latest state.

import Link from "next/link";
import { useEffect, useState } from "react";
import { listBookmarks, toggleBookmark, listAttempts } from "@/lib/storage";
import { getScenarioById, SETUP_TYPE_LABELS } from "@/lib/scenarios";
import MascotBubble from "./MascotBubble";
import type { Attempt, Scenario } from "@/lib/types";

type BookmarkRow = {
  scenario: Scenario;
  attemptCount: number;
  avgScore: number | null;
  lastAttemptAt: number | null;
};

export default function BookmarksList() {
  const [rows, setRows] = useState<BookmarkRow[] | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    const ids = listBookmarks();
    const attempts = listAttempts();
    const next: BookmarkRow[] = [];
    for (const id of ids) {
      const scenario = getScenarioById(id);
      if (!scenario) continue;
      const mine = attempts.filter((a) => a.scenarioId === id);
      const avg =
        mine.length === 0
          ? null
          : Math.round(mine.reduce((s, a) => s + a.score.total, 0) / mine.length);
      const last = mine.length === 0 ? null : Math.max(...mine.map((a) => a.createdAt));
      next.push({ scenario, attemptCount: mine.length, avgScore: avg, lastAttemptAt: last });
    }
    // Most-recently-practiced first, then unpracticed by scenario id.
    next.sort((a, b) => (b.lastAttemptAt ?? 0) - (a.lastAttemptAt ?? 0));
    setRows(next);
  }

  function handleUnbookmark(id: string) {
    toggleBookmark(id);
    refresh();
  }

  if (rows == null) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <MascotBubble mood="confused" size="xl" layout="stack">
          <p className="font-semibold">No bookmarks yet.</p>
          <p className="mt-1 text-muted">
            On the Practice page, click the ☆ next to a scenario title to bookmark it. Anything you bookmark shows up here so you can revisit the ones that surprised you.
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

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <BookmarkItem key={row.scenario.id} row={row} onUnbookmark={handleUnbookmark} />
      ))}
    </ul>
  );
}

function BookmarkItem({
  row,
  onUnbookmark,
}: {
  row: BookmarkRow;
  onUnbookmark: (id: string) => void;
}) {
  const { scenario, attemptCount, avgScore, lastAttemptAt } = row;
  return (
    <li className="bg-panel border border-line rounded-md p-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold text-sm">{scenario.title}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {SETUP_TYPE_LABELS[scenario.setupType]}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-1">
          <span>{scenario.symbol}</span>
          <span>{scenario.timeframe}</span>
          <span>{scenario.difficulty}</span>
          {attemptCount > 0 ? (
            <>
              <span>
                {attemptCount} attempt{attemptCount === 1 ? "" : "s"}
              </span>
              {avgScore != null && (
                <span>
                  avg{" "}
                  <span
                    className={`font-mono font-semibold ${
                      avgScore >= 70 ? "text-good" : avgScore >= 50 ? "text-warn" : "text-bad"
                    }`}
                  >
                    {avgScore}
                  </span>
                </span>
              )}
              {lastAttemptAt && (
                <span>last {new Date(lastAttemptAt).toLocaleDateString()}</span>
              )}
            </>
          ) : (
            <span className="italic">never practiced</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/practice?scenarioId=${scenario.id}`}
          className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
        >
          Open in Practice →
        </Link>
        <button
          type="button"
          onClick={() => onUnbookmark(scenario.id)}
          className="text-xs text-muted hover:text-bad px-2 py-1.5"
          aria-label={`Remove bookmark for ${scenario.title}`}
          title="Remove bookmark"
        >
          ★ Unbookmark
        </button>
      </div>
    </li>
  );
}
