"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// Two-way segment control: Challenge (default — title hidden until submit)
// vs Study (title and setup-type visible from load).

import type { PracticeMode } from "@/lib/types";

export default function ModeToggle({
  mode,
  onChange,
}: {
  mode: PracticeMode;
  onChange: (m: PracticeMode) => void;
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="text-[10px] uppercase tracking-wide text-muted mb-1">Mode</div>
      <div className="inline-flex bg-panel2 border border-line rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => onChange("challenge")}
          className={`px-3 py-1.5 text-xs font-semibold ${
            mode === "challenge" ? "bg-accent/20 text-accent" : "text-muted hover:text-text"
          }`}
        >
          Challenge
        </button>
        <button
          type="button"
          onClick={() => onChange("study")}
          className={`px-3 py-1.5 text-xs font-semibold border-l border-line ${
            mode === "study" ? "bg-accent/20 text-accent" : "text-muted hover:text-text"
          }`}
        >
          Study
        </button>
      </div>
    </div>
  );
}
