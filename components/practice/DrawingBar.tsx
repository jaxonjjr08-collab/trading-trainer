"use client";

// v5.2.0 — Drawing tool bar. Sits alongside the Indicators bar; controls the
// chart's drawing mode and lets the user clear drawn lines. Designed to be
// dropped next to ChartOverlayBar on any surface that wants drawing
// (Practice, Paper Trading, Portfolio).
//
// Owns:
// - drawingMode state (which tool is armed)
// - drawings count (read from localStorage at mount + after each change)
// - "Clear all" action
// - drawingsRefreshKey signal to make the parent's Chart sync
//
// Doesn't own: the drawing render itself — Chart.tsx subscribes to clicks
// and persists/draws.

import { useEffect, useState } from "react";
import {
  clearDrawings,
  getDrawings,
  type Drawing,
} from "@/lib/drawings";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcut";

// v5.2.1 — "measure" joins the trendline mode. Measure is ephemeral (no
// persistence) and renders an inline stats overlay instead of a line, so
// from the user's POV it's a different kind of tool than "draw a line";
// from the wiring's POV it's identical (two-click handshake, Escape
// cancels, mode flips back to null on completion).
// v5.2.3 — "horizontal" is single-click: one click sets the price and the
// line spans the chart automatically (lightweight-charts createPriceLine).
export type DrawingMode = "trendline" | "measure" | "horizontal" | null;

type Props = {
  scopeId: string;
  mode: DrawingMode;
  onModeChange: (next: DrawingMode) => void;
  // Counter the parent passes to Chart so Chart re-syncs after a clear.
  refreshKey: number;
  onRefresh: () => void;
  // Drawings list, kept in the parent so external surfaces can react too
  // (e.g. a count badge somewhere else). Optional; if omitted the bar reads
  // from localStorage on mount and after refreshes.
  drawings?: Drawing[];
  // v5.6.5 — Visibility toggle. When true, drawings are persisted but
  // hidden on the chart — useful for a clean view without destroying the
  // user's annotations. Parent owns the boolean so it can also pass it
  // through to Chart's drawingsHidden prop.
  hidden?: boolean;
  onToggleHidden?: () => void;
};

export default function DrawingBar({
  scopeId,
  mode,
  onModeChange,
  onRefresh,
  drawings,
  hidden = false,
  onToggleHidden,
}: Props) {
  const [internalCount, setInternalCount] = useState(0);

  useEffect(() => {
    // Fall back to a localStorage read when the parent didn't pass drawings.
    if (drawings) {
      setInternalCount(drawings.length);
    } else {
      setInternalCount(getDrawings(scopeId).length);
    }
  }, [scopeId, drawings]);

  const count = drawings ? drawings.length : internalCount;

  function toggleTrendline() {
    onModeChange(mode === "trendline" ? null : "trendline");
  }

  function toggleMeasure() {
    onModeChange(mode === "measure" ? null : "measure");
  }

  function toggleHorizontal() {
    onModeChange(mode === "horizontal" ? null : "horizontal");
  }

  // v5.3.0 — Keyboard shortcuts: T for trendline, H for horizontal,
  // M for measure. Skipped when the user is typing or holding modifiers.
  useKeyboardShortcuts([
    { key: "t", handler: toggleTrendline, description: "Trendline drawing" },
    { key: "h", handler: toggleHorizontal, description: "Horizontal line drawing" },
    { key: "m", handler: toggleMeasure, description: "Measure tool" },
  ]);

  function clearAll() {
    if (count === 0) return;
    const confirmed = window.confirm(
      `Clear all ${count} drawn line${count > 1 ? "s" : ""} on this chart?`
    );
    if (!confirmed) return;
    clearDrawings(scopeId);
    onModeChange(null);
    onRefresh();
    setInternalCount(0);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted uppercase tracking-wide text-[10px] mr-1">
        Drawings
      </span>
      <button
        type="button"
        onClick={toggleTrendline}
        title="Click two points to draw a trendline · shortcut: T · Esc cancels"
        aria-pressed={mode === "trendline"}
        className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
          mode === "trendline"
            ? "bg-warn/20 border-warn/60 text-warn"
            : "bg-panel2 border-line text-muted hover:text-text"
        }`}
      >
        📏 Trendline
        <kbd className="ml-0.5 px-1 text-[9px] font-mono border border-line rounded">
          T
        </kbd>
      </button>
      <button
        type="button"
        onClick={toggleHorizontal}
        title="Click a price to drop a horizontal line · shortcut: H"
        aria-pressed={mode === "horizontal"}
        className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
          mode === "horizontal"
            ? "bg-warn/20 border-warn/60 text-warn"
            : "bg-panel2 border-line text-muted hover:text-text"
        }`}
      >
        ➖ Horizontal
        <kbd className="ml-0.5 px-1 text-[9px] font-mono border border-line rounded">
          H
        </kbd>
      </button>
      <button
        type="button"
        onClick={toggleMeasure}
        title="Click two points to measure · shortcut: M · Esc cancels"
        aria-pressed={mode === "measure"}
        className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
          mode === "measure"
            ? "bg-accent/20 border-accent/60 text-accent"
            : "bg-panel2 border-line text-muted hover:text-text"
        }`}
      >
        📐 Measure
        <kbd className="ml-0.5 px-1 text-[9px] font-mono border border-line rounded">
          M
        </kbd>
      </button>
      {count > 0 && onToggleHidden && (
        <button
          type="button"
          onClick={onToggleHidden}
          aria-pressed={hidden}
          title={
            hidden
              ? "Show all drawings on the chart again"
              : "Hide drawings without deleting them — toggle off to restore"
          }
          className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${
            hidden
              ? "bg-muted/20 border-muted/60 text-muted"
              : "bg-panel2 border-line text-muted hover:text-text"
          }`}
        >
          {hidden ? "👁‍🗨 Show" : "👁 Hide"}
        </button>
      )}
      {count > 0 && (
        <button
          type="button"
          onClick={clearAll}
          title="Remove every drawn line on this chart"
          className="px-2 py-1 rounded-md border text-[11px] text-muted bg-panel2 border-line hover:border-bad/60 hover:text-bad"
        >
          Clear ({count})
        </button>
      )}
      {mode === "trendline" && (
        <span className="text-[10px] text-muted">
          Click two points on the chart  ·  Esc to cancel
        </span>
      )}
      {mode === "measure" && (
        <span className="text-[10px] text-muted">
          Click two points to measure  ·  Esc to cancel
        </span>
      )}
      {mode === "horizontal" && (
        <span className="text-[10px] text-muted">
          Click a price to drop a horizontal line  ·  Esc to cancel
        </span>
      )}
    </div>
  );
}
