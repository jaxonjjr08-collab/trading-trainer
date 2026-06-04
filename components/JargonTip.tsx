"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { termById } from "@/lib/learn";

// Two ways to use JargonTip:
//   <JargonTip termId="stop_loss" />                          — pulls definition from LEARN_TERMS
//   <JargonTip term="Long" definition="..." learnTermId="…" /> — inline definition (for concepts
//                                                               that aren't a discrete Learn term)
type FromTerm = { termId: string };
type Inline = { term: string; definition: string; learnTermId?: string };
type Props = (FromTerm | Inline) & { className?: string };

export default function JargonTip(props: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Resolve term / definition / link.
  let term: string;
  let definition: string;
  let learnTermId: string | null = null;
  if ("termId" in props) {
    const t = termById(props.termId);
    if (!t) return null;
    term = t.term;
    definition = t.simpleDefinition;
    learnTermId = t.id;
  } else {
    term = props.term;
    definition = props.definition;
    learnTermId = props.learnTermId ?? null;
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault(); // prevent containing <label> from focusing the input
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full border border-line text-muted bg-panel2 hover:bg-panel hover:text-text focus:outline-none focus:ring-1 focus:ring-line ${
          props.className ?? ""
        }`}
        aria-label={`What does ${term} mean?`}
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`${term} definition`}
          className="absolute z-30 left-0 top-full mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-accent/40 bg-panel shadow-lg p-3 text-left"
        >
          <div className="text-xs uppercase tracking-wider text-accent mb-1">{term}</div>
          <p className="text-sm text-text leading-snug whitespace-pre-wrap">{definition}</p>
          {learnTermId && (
            <Link
              href={`/learn?term=${learnTermId}`}
              className="inline-block mt-2 text-xs font-semibold text-accent hover:underline"
              onClick={() => setOpen(false)}
            >
              Open lesson →
            </Link>
          )}
        </div>
      )}
    </span>
  );
}
