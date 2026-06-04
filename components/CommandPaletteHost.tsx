"use client";

// v5.9.1 — Thin always-mounted host for the ⌘K command palette. Owns the
// open state + the global keyboard listener, and lazy-loads the heavier
// palette UI (CommandPalette) only on first open so it stays out of the
// initial bundle. Mounted once in app/layout.tsx.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(() => import("./CommandPalette"), {
  ssr: false,
});

export default function CommandPaletteHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ⌘K (mac) / Ctrl+K (win/linux). Also support the bare "/" focus
      // gesture when not typing in a field, à la many keyboard-first apps.
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (
        e.key === "/" &&
        !meta &&
        !(e.target instanceof HTMLElement &&
          (e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.isContentEditable))
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    // Let any surface open the palette by dispatching this event (e.g. the
    // header ⌘K chip on touch devices with no keyboard).
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("trainer:open-command-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("trainer:open-command-palette", onOpenRequest);
    };
  }, []);

  if (!open) return null;
  return <CommandPalette onClose={() => setOpen(false)} />;
}

// Dispatch helper for click-to-open (header chip, mobile).
export const OPEN_COMMAND_PALETTE_EVENT = "trainer:open-command-palette";
