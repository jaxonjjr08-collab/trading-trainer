// v5.1.0 — pins the shape of the indicator-meta registry. The hover tooltip
// and chart legend look up every drawn series here; a row missing prose or
// pointing at a non-existent Learn term would silently degrade the UX. These
// tests catch all of that at build time.

import { describe, it, expect } from "vitest";
import {
  INDICATOR_COLORS,
  INDICATOR_META,
  LINES_BY_TOOL,
  shortNameFor,
  type IndicatorLineId,
} from "../indicator-meta";
import { CHART_TOOL_LABELS, type ChartToolId } from "../types";
import { LEARN_TERMS } from "../learn";

const ALL_LINE_IDS: IndicatorLineId[] = [
  "ema20",
  "ema50",
  "ema200",
  "bb_upper",
  "bb_middle",
  "bb_lower",
  "vwap",
  "rsi",
  "macd_line",
  "macd_signal",
  "macd_hist",
  // v5.1.1 — Super Guppy is registered as one id even though 24 line series
  // share it; the registry treats the ribbon as a single semantic indicator
  // (one legend row, one tooltip card). The hover proximity check still walks
  // all 24 series — see Chart.tsx's dedup-by-id logic.
  "super_guppy",
  // v5.9.4 — Chris's Super Guppy is the user-editable variant of the GMMA;
  // shares the same one-row legend convention as super_guppy.
  "chris_guppy",
  // v5.2.0 — Keltner Channels (3 lines) + Pivot Points (5 horizontal levels).
  "keltner_upper",
  "keltner_middle",
  "keltner_lower",
  "pivot_p",
  "pivot_r1",
  "pivot_r2",
  "pivot_s1",
  "pivot_s2",
];

describe("INDICATOR_META", () => {
  it("has an entry for every IndicatorLineId", () => {
    for (const id of ALL_LINE_IDS) {
      expect(INDICATOR_META[id]).toBeDefined();
    }
  });

  it("every entry has non-empty name and one-line meaning", () => {
    for (const id of ALL_LINE_IDS) {
      const meta = INDICATOR_META[id];
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.oneLine.length).toBeGreaterThan(10);
    }
  });

  it("every entry's parentToolId is a real ChartToolId in CHART_TOOL_LABELS", () => {
    for (const id of ALL_LINE_IDS) {
      const meta = INDICATOR_META[id];
      expect(CHART_TOOL_LABELS[meta.parentToolId]).toBeDefined();
    }
  });

  it("every learnTermId resolves to an existing Learn term", () => {
    const validIds = new Set(LEARN_TERMS.map((t) => t.id));
    for (const id of ALL_LINE_IDS) {
      const meta = INDICATOR_META[id];
      expect(validIds.has(meta.learnTermId)).toBe(true);
    }
  });

  it("format() returns a non-empty string for both positive and negative values", () => {
    // v5.1.1 — super_guppy is excluded: its "value" is a state chip, not a
    // number, so its format() is intentionally a no-op string that the
    // legend and tooltip never read (they branch on the super_guppy id and
    // render the chip instead). v5.9.4 — chris_guppy is the same kind of
    // ribbon and is excluded for the same reason.
    const RIBBON_IDS = new Set(["super_guppy", "chris_guppy"]);
    const numericLineIds = ALL_LINE_IDS.filter((id) => !RIBBON_IDS.has(id));
    for (const id of numericLineIds) {
      const meta = INDICATOR_META[id];
      expect(meta.format(42).length).toBeGreaterThan(0);
      expect(meta.format(-0.5).length).toBeGreaterThan(0);
      expect(meta.format(12345.67).length).toBeGreaterThan(0);
    }
  });

  it("MACD signed format prefixes positive values with +", () => {
    expect(INDICATOR_META.macd_line.format(0.5)).toMatch(/^\+/);
    expect(INDICATOR_META.macd_line.format(-0.5)).toMatch(/^-/);
  });

  it("price-scale format omits the + prefix even for positive values", () => {
    expect(INDICATOR_META.ema20.format(28431.25)).not.toMatch(/^\+/);
    expect(INDICATOR_META.bb_upper.format(99.5)).not.toMatch(/^\+/);
  });
});

describe("LINES_BY_TOOL", () => {
  it("covers every line-bearing ChartToolId", () => {
    // v5.2.2 — "patterns" is intentionally excluded from LINES_BY_TOOL:
    // it renders as candle markers, not as IndicatorLineId-keyed series,
    // so the legend/tooltip system doesn't need a row for it.
    const tools: ChartToolId[] = [
      "ema",
      "rsi",
      "macd",
      "bb",
      "vwap",
      "super_guppy",
      "chris_guppy",
      "keltner",
      "pivots",
    ];
    for (const t of tools) {
      expect(LINES_BY_TOOL[t]).toBeDefined();
      expect(LINES_BY_TOOL[t].length).toBeGreaterThan(0);
    }
  });

  it("groups all lines under their declared parentToolId", () => {
    for (const id of ALL_LINE_IDS) {
      const parent = INDICATOR_META[id].parentToolId;
      expect(LINES_BY_TOOL[parent]).toContain(id);
    }
  });

  it("does not double-count a line across tools", () => {
    const seen = new Set<IndicatorLineId>();
    for (const lines of Object.values(LINES_BY_TOOL)) {
      for (const id of lines) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
    expect(seen.size).toBe(ALL_LINE_IDS.length);
  });
});

describe("INDICATOR_COLORS", () => {
  it("supplies a color string for every line that needs one", () => {
    // The registry's color field reads from this map; if a value were
    // undefined a downstream <span style={{ background: color }} /> would
    // render as transparent. Spot-check that the strings are present.
    expect(INDICATOR_COLORS.ema20).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.ema50).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.ema200).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.bb_band).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.bb_mid).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.vwap).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.rsi).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.macd_line).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.macd_signal).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.macd_hist_up).toMatch(/^#|^rgba?\(/);
    expect(INDICATOR_COLORS.macd_hist_down).toMatch(/^#|^rgba?\(/);
  });
});

describe("shortNameFor", () => {
  it("returns the registry name", () => {
    expect(shortNameFor("ema20")).toBe(INDICATOR_META.ema20.name);
    expect(shortNameFor("macd_hist")).toBe(INDICATOR_META.macd_hist.name);
  });
});
