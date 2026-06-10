"use client";

// v5.12.3 — Return keyboard focus to whatever was focused before a modal /
// popover opened, once it closes. Without this, dismissing a dialog drops
// focus to <body> and a keyboard or screen-reader user loses their place.
//
// Usage: call useFocusRestore(open) inside the modal component. When `open`
// flips true the active element is captured; when it flips false (or the
// component unmounts) focus is restored. Null-safe: if the trigger was
// removed from the DOM, .focus() is a harmless no-op.

import { useEffect, useRef } from "react";

export function useFocusRestore(open: boolean): void {
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const el = triggerRef.current;
      // Defer to the next frame so React has finished unmounting the dialog
      // before we move focus — otherwise the focus can land mid-teardown.
      if (el && typeof el.focus === "function") {
        requestAnimationFrame(() => el.focus());
      }
    };
  }, [open]);
}
