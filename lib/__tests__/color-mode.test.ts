// v5.1.1 — Pins the color-mode palette resolution + cluster-color
// interpolation used by the Super Guppy ribbon. Visual correctness lives in
// the UI; this file is here so a refactor of the palette structure can't
// silently break either palette, and so the colorblind-friendly defaults
// stay sacrosanct.

import { describe, it, expect } from "vitest";
import {
  COLOR_MODE_LABELS,
  COLOR_MODES,
  clusterColors,
  interpolateColor,
  paletteFor,
  STATE_LABEL,
  STATE_MEANING,
} from "../color-mode";

describe("COLOR_MODES", () => {
  it("exposes both modes with labels", () => {
    expect(COLOR_MODES).toEqual(["colorblind", "standard"]);
    expect(COLOR_MODE_LABELS.colorblind).toMatch(/blue/i);
    expect(COLOR_MODE_LABELS.standard).toMatch(/green/i);
  });
});

describe("paletteFor", () => {
  it("returns blue family for colorblind bull", () => {
    const p = paletteFor("colorblind", "bull");
    // v5.1.2 — representative bumped from blue-500 to blue-600 for higher
    // contrast against the dark panel background; both are blue family.
    expect(p.representative).toBe("#2563eb");
  });

  it("returns red family for colorblind bear (v5.9.10 — was orange)", () => {
    const p = paletteFor("colorblind", "bear");
    expect(p.representative).toBe("#dc2626");
  });

  it("returns green family for standard bull", () => {
    const p = paletteFor("standard", "bull");
    expect(p.representative).toBe("#16a34a");
  });

  it("returns red family for standard bear", () => {
    const p = paletteFor("standard", "bear");
    expect(p.representative).toBe("#dc2626");
  });

  it("returns gray neutral in both modes (v5.1.2 unified)", () => {
    // Standard neutral was amber/orange before v5.1.2; users were
    // confusing it with the bear-orange of colorblind mode after a
    // palette switch. Gray reads unambiguously as 'no clear trend' in
    // either mode.
    const cn = paletteFor("colorblind", "neutral").representative;
    const sn = paletteFor("standard", "neutral").representative;
    expect(cn).toBe("#94a3b8");
    expect(sn).toBe("#94a3b8");
  });

  it("gives every state a representative color", () => {
    for (const mode of COLOR_MODES) {
      for (const state of ["bull", "bear", "neutral"] as const) {
        const p = paletteFor(mode, state);
        expect(p.representative).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});

describe("interpolateColor", () => {
  it("returns the start color at t=0", () => {
    expect(interpolateColor("#000000", "#ffffff", 0)).toBe("rgb(0,0,0)");
  });

  it("returns the end color at t=1", () => {
    expect(interpolateColor("#000000", "#ffffff", 1)).toBe("rgb(255,255,255)");
  });

  it("returns the midpoint at t=0.5", () => {
    // Even round-half-to-up; we Math.round so 127.5 → 128.
    const mid = interpolateColor("#000000", "#ffffff", 0.5);
    // Either 127 or 128 depending on rounding; pin to 128.
    expect(mid).toBe("rgb(128,128,128)");
  });

  it("falls back gracefully on invalid hex", () => {
    // No throw; gray fallback.
    expect(() => interpolateColor("notahex", "#ffffff", 0.5)).not.toThrow();
  });
});

describe("clusterColors", () => {
  it("returns count colors spanning start to end", () => {
    const colors = clusterColors("#000000", "#ffffff", 5);
    expect(colors).toHaveLength(5);
    expect(colors[0]).toBe("rgb(0,0,0)");
    expect(colors[colors.length - 1]).toBe("rgb(255,255,255)");
  });

  it("returns a single start color for count=1", () => {
    expect(clusterColors("#abcdef", "#fedcba", 1)).toEqual(["#abcdef"]);
  });

  it("emits rgba() strings when an opacity below 1 is provided", () => {
    // v5.1.2 — Super Guppy ribbon uses opacity < 1 so overlapping lines
    // compound into a visible band. Default behaviour (opacity omitted or
    // 1) stays rgb() for backwards compatibility.
    const colors = clusterColors("#000000", "#ffffff", 3, 0.5);
    expect(colors[0]).toBe("rgba(0,0,0,0.5)");
    expect(colors[2]).toBe("rgba(255,255,255,0.5)");
  });
});

describe("interpolateColor opacity", () => {
  it("emits rgba() when opacity < 1", () => {
    expect(interpolateColor("#000000", "#ffffff", 0.5, 0.75)).toBe(
      "rgba(128,128,128,0.75)"
    );
  });

  it("falls back to rgb() when opacity is omitted", () => {
    expect(interpolateColor("#000000", "#ffffff", 0.5)).toBe("rgb(128,128,128)");
  });

  it("falls back to rgb() when opacity is exactly 1", () => {
    expect(interpolateColor("#000000", "#ffffff", 0.5, 1)).toBe(
      "rgb(128,128,128)"
    );
  });
});

describe("STATE_LABEL + STATE_MEANING", () => {
  it("labels every state", () => {
    expect(STATE_LABEL.bull).toBe("BULL");
    expect(STATE_LABEL.bear).toBe("BEAR");
    expect(STATE_LABEL.neutral).toBe("MIXED");
  });

  it("provides a meaning string for every state", () => {
    for (const k of ["bull", "bear", "neutral"] as const) {
      expect(typeof STATE_MEANING[k]).toBe("string");
      expect(STATE_MEANING[k].length).toBeGreaterThan(10);
    }
  });
});
