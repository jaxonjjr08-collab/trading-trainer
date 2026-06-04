"use client";

// v2.1 Phase 5 — generic horizontal tabs. Used on Dashboard to split a long
// vertical scroll into 3 focused viewports (Overview / Performance / History).
//
// State is kept in the URL hash (`/#performance`) so:
//   - direct links to a tab work (`/#performance`, `/#history`)
//   - browser back can restore the prior tab (we pushState for non-default,
//     replaceState for the default so we don't pollute history with the bare
//     base URL on first tab open)
//   - SSR is safe — `useEffect` only reads `location.hash` on the client
//
// Keyboard:
//   - ←/→ cycle within the tablist when focus is on a tab
//   - 1/2/3/… jump directly when focus is on a tab
//
// A11y (audit fix #X2): every tab's `aria-controls` resolves to a real
// tabpanel node. Inactive panels are still rendered (with the `hidden` attr)
// so screen readers can find them. Per the WAI-ARIA tablist pattern.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TabDef = {
  id: string;       // becomes the URL hash (lowercase, no spaces)
  label: string;    // human-readable
  badge?: number | string; // optional small count next to the label
};

type Props = {
  tabs: TabDef[];
  /**
   * Render function: invoked with the active tab id. Caller decides what
   * content to render per tab. We invoke it only for the active panel; the
   * inactive panels are rendered as empty (but present) nodes so every
   * aria-controls target resolves.
   */
  children: (activeId: string) => React.ReactNode;
  /**
   * Default tab id when no hash is present. Defaults to the first tab.
   */
  defaultId?: string;
};

export default function Tabs({ tabs, children, defaultId }: Props) {
  const initialId = defaultId ?? tabs[0]?.id ?? "";
  const [activeId, setActiveId] = useState<string>(initialId);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Audit fix #X1: derive a stable comma-joined key from the tab ids so the
  // hash-sync effect doesn't re-subscribe on every parent render (parents
  // commonly pass a fresh array literal each render).
  const tabIdsKey = useMemo(() => tabs.map((t) => t.id).join(","), [tabs]);

  // Read the hash on mount + on popstate / hashchange. Skip the leading '#'.
  // If the hash points to an unknown tab, fall back to the default.
  useEffect(() => {
    const ids = tabIdsKey.split(",");
    function syncFromHash() {
      const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      setActiveId(h && ids.includes(h) ? h : initialId);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [tabIdsKey, initialId]);

  // Audit fix #X3: switch to pushState for non-default tabs so browser back
  // restores the prior tab (matches the docs). The default tab still uses
  // replaceState (and clears the hash) so the first click on the default
  // doesn't pollute history with a bare `/` entry.
  const activate = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window === "undefined") return;
    if (id === initialId) {
      // Clearing the hash on return to default.
      const url = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", url);
    } else if (window.location.hash !== `#${id}`) {
      // pushState only when target hash differs from current — avoids a
      // double-push when the user clicks the already-active non-default tab.
      window.history.pushState(null, "", `#${id}`);
    }
  }, [initialId]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.id === activeId);
    if (idx === -1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      activate(tabs[(idx + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      activate(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    } else if (/^[1-9]$/.test(e.key)) {
      const n = Number(e.key) - 1;
      if (n < tabs.length) {
        e.preventDefault();
        activate(tabs[n].id);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={listRef}
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex gap-1 border-b border-line"
      >
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => activate(t.id)}
              className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? "text-text font-semibold"
                  : "text-muted hover:text-text"
              }`}
            >
              <span>{t.label}</span>
              {t.badge != null && (
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    active ? "bg-accent/20 text-accent" : "bg-panel2 text-muted"
                  }`}
                >
                  {t.badge}
                </span>
              )}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Audit fix #X2: render one tabpanel per tab so every aria-controls
          target resolves. Inactive panels carry the `hidden` attribute (which
          removes them from layout) but stay in the DOM. The children
          render-prop is only invoked for the active panel; inactive panels
          render as empty placeholders so the tree stays cheap. */}
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <div
            key={t.id}
            role="tabpanel"
            id={`panel-${t.id}`}
            aria-labelledby={`tab-${t.id}`}
            hidden={!active}
          >
            {active ? children(activeId) : null}
          </div>
        );
      })}
    </div>
  );
}
