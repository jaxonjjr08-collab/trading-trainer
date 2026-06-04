"use client";

// v5.9.1 — ⌘K command palette. Custom-built (no cmdk dependency, keeping the
// near-zero dep surface and avoiding the stock vibecoded look). Reuses the
// keyboard-navigation pattern from components/paper-trading/SymbolPicker:
// arrow highlight, Enter select, Esc close, scroll-into-view.
//
// Sourced from lib/command-actions.buildCommands() — routes, actions,
// theme switches, scenarios, and learn terms. Selecting a command either
// navigates (router.push) or fires a side effect (set theme, open changelog).
//
// Rendered only while open (the host in CommandPaletteHost lazy-loads this
// module on first ⌘K, so it stays out of the initial bundle).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCommands,
  filterCommands,
  type Command,
  type CommandGroup,
} from "@/lib/command-actions";
import { setTheme, type ThemeId } from "@/lib/theme";
import { OPEN_CHANGELOG_EVENT } from "@/components/VersionBadge";

type Props = {
  onClose: () => void;
};

const GROUP_ORDER: CommandGroup[] = [
  "Navigate",
  "Actions",
  "Theme",
  "Scenarios",
  "Learn",
];

export default function CommandPalette({ onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Built once on mount — the catalogs are static within a session.
  const all = useMemo(() => buildCommands(), []);
  const results = useMemo(() => filterCommands(all, query), [all, query]);

  // Group the flat result list for display, preserving a flat index for
  // keyboard navigation.
  const grouped = useMemo(() => {
    const byGroup = new Map<CommandGroup, Command[]>();
    for (const c of results) {
      const arr = byGroup.get(c.group) ?? [];
      arr.push(c);
      byGroup.set(c.group, arr);
    }
    const sections: Array<{ group: CommandGroup; items: Command[] }> = [];
    for (const g of GROUP_ORDER) {
      const items = byGroup.get(g);
      if (items && items.length) sections.push({ group: g, items });
    }
    return sections;
  }, [results]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Keep the highlighted row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-idx="${highlight}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function run(cmd: Command) {
    if (cmd.href) {
      router.push(cmd.href);
      onClose();
      return;
    }
    if (cmd.action) {
      if (cmd.action.kind === "set-theme") {
        setTheme(cmd.action.themeId as ThemeId);
      } else if (cmd.action.kind === "open-changelog") {
        window.dispatchEvent(new CustomEvent(OPEN_CHANGELOG_EVENT));
      }
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[highlight];
      if (cmd) run(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  // Flat index counter shared across sections so arrow-nav crosses groups.
  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-line bg-panel shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search row */}
        <div className="flex items-center gap-2 px-4 border-b border-line">
          <span aria-hidden className="text-muted text-sm">
            ⌘
          </span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scenarios, lessons, pages, themes…"
            className="flex-1 bg-transparent border-0 py-3.5 text-[15px] text-text outline-none placeholder:text-muted/60 focus:ring-0"
          />
          <kbd className="text-[10px] font-mono text-muted border border-line rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No matches for “{query}”.
            </div>
          ) : (
            grouped.map((section) => (
              <div key={section.group} className="mb-1">
                <div className="px-4 py-1 text-[10px] uppercase tracking-widest text-muted/70 font-sans">
                  {section.group}
                </div>
                {section.items.map((cmd) => {
                  flatIdx += 1;
                  const idx = flatIdx;
                  const active = idx === highlight;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      data-cmd-idx={idx}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => run(cmd)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        active ? "bg-accent/15" : "hover:bg-panel2"
                      }`}
                    >
                      <span
                        className={`text-sm truncate flex-1 ${
                          active ? "text-accent font-medium" : "text-text"
                        }`}
                      >
                        {cmd.title}
                      </span>
                      {cmd.hint && (
                        <span className="text-[11px] text-muted truncate max-w-[45%] font-sans">
                          {cmd.hint}
                        </span>
                      )}
                      {active && (
                        <kbd className="text-[10px] font-mono text-muted border border-line rounded px-1 py-0.5 shrink-0">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-line text-[10px] text-muted font-sans">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> open
          </span>
          <span>
            <kbd className="font-mono">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
