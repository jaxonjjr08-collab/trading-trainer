// v5.2.0 — User-drawn chart annotations. First mode: trendline (two clicks,
// straight line). Persists per "scope" (a scenario id, a live symbol, etc.)
// so the user's work survives a refresh and follows the chart they drew on.
//
// Storage shape (under trainer.drawings.v1 in localStorage):
//   { [scopeId: string]: Drawing[] }
//
// Scope ids are the caller's responsibility. Practice passes the active
// scenario id; /paper-trading and /portfolio pass a symbol-anchored id
// (e.g. "live:BTC-USD:3600" so a 1h chart's drawings don't bleed onto the
// same symbol's 5m chart).

import { isBrowser } from "./storage";

export type DrawingPoint = {
  time: number; // UTC seconds (matches Candle.time)
  price: number;
};

export type TrendlineDrawing = {
  id: string;
  type: "trendline";
  start: DrawingPoint;
  end: DrawingPoint;
  createdAt: number;
};

// v5.2.3 — Horizontal price line. One click sets the price; the line spans
// the full chart automatically via lightweight-charts' createPriceLine.
// Stores only price (no time) since the line extends across all candles.
export type HorizontalDrawing = {
  id: string;
  type: "horizontal";
  price: number;
  createdAt: number;
};

// Discriminated union so adding "channel" / etc. later stays type-safe
// across the renderer + persistence + UI.
export type Drawing = TrendlineDrawing | HorizontalDrawing;

const DRAWINGS_KEY = "trainer.drawings.v1";

type StorageShape = Record<string, Drawing[]>;

function readAll(): StorageShape {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(DRAWINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as StorageShape;
    return {};
  } catch {
    return {};
  }
}

function writeAll(next: StorageShape): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DRAWINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function getDrawings(scopeId: string): Drawing[] {
  const all = readAll();
  return all[scopeId] ?? [];
}

export function addDrawing(scopeId: string, drawing: Drawing): Drawing[] {
  const all = readAll();
  const next = [...(all[scopeId] ?? []), drawing];
  all[scopeId] = next;
  writeAll(all);
  return next;
}

export function clearDrawings(scopeId: string): void {
  const all = readAll();
  if (all[scopeId]) {
    delete all[scopeId];
    writeAll(all);
  }
}

export function removeDrawing(scopeId: string, id: string): Drawing[] {
  const all = readAll();
  const current = all[scopeId] ?? [];
  const next = current.filter((d) => d.id !== id);
  if (next.length === 0) delete all[scopeId];
  else all[scopeId] = next;
  writeAll(all);
  return next;
}

// Convenience id generator. Mirrors lib/storage.generateId but kept local so
// drawings can be added without taking on a broader storage dependency.
export function newDrawingId(): string {
  return `dr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Re-exported storage-key string so the export/import round-trip
// (lib/storage.ALL_KEYS) can include drawings without circular imports.
export const DRAWINGS_KEY_NAME = DRAWINGS_KEY;
