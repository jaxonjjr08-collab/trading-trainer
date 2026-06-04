"use client";

// v5.3.0 — Reusable keyboard-shortcut hook with the right safety net:
// shortcuts NEVER fire while the user is typing in an input, textarea,
// contenteditable element, or while modifier keys (Ctrl, Cmd, Alt) are
// held (those are reserved for browser/OS bindings).
//
// Pass an array of { key, handler } pairs. The handler runs with no
// arguments. Keys are compared case-insensitively, so "L" matches both
// lowercase and uppercase keypresses.
//
// Usage:
//   useKeyboardShortcuts([
//     { key: "L", handler: () => setDirection("long") },
//     { key: "S", handler: () => setDirection("short") },
//   ]);
//
// The handler array is recaptured on every render — so closures over
// component state work as expected without needing useCallback wrapping.

import { useEffect, useRef } from "react";

export type Shortcut = {
  key: string;
  handler: () => void;
  // Optional human description used by the help surface (planned for a
  // future "?" overlay listing all active shortcuts).
  description?: string;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  // Stash the latest array in a ref so the document listener can read
  // up-to-date handlers without we have to subscribe/unsubscribe on every
  // re-render.
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Reserved keystrokes — never hijack them.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      for (const s of shortcutsRef.current) {
        if (s.key.toLowerCase() === key) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
