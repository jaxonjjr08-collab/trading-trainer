"use client";

// v3.3 — Extracted from app/practice/page.tsx. Logic unchanged.
// Tiny collapsible block used for scenario notes / market context blocks.

import { useState } from "react";

export default function CollapsibleNotes({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-line bg-panel2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-panel"
      >
        <span className="uppercase tracking-wide text-muted">{title}</span>
        <span className="text-muted">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-line px-3 py-2 text-sm">{body}</div>
      )}
    </div>
  );
}
