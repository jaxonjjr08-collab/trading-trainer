"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// v2.4 — mirror-mode toggle. Display-only flip of the chart around its
// price midpoint. Forces directional-bias-free reading of the same structure.

export default function MirrorToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-end">
      <div
        className="text-[10px] uppercase tracking-wide text-muted mb-1"
        title="Flip the chart vertically to break directional bias"
      >
        Mirror
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
          on
            ? "bg-warn/20 border-warn/60 text-warn"
            : "bg-panel2 border-line text-muted hover:text-text"
        }`}
        title={on ? "Mirror on — flip off to submit" : "Flip the chart vertically"}
      >
        {on ? "On ⇅" : "Off"}
      </button>
    </div>
  );
}
