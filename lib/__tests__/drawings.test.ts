// v5.2.0 — Pins the drawings storage contract. The Chart component reads
// from getDrawings on scope changes; a regression in the round-trip would
// silently lose user-drawn trendlines, which is the kind of bug that erodes
// trust in the trainer.
//
// Tests run in node without a real localStorage; the storage helpers guard
// on isBrowser() and short-circuit to empty in that case. We test the
// in-memory path by shimming a minimal localStorage on globalThis.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addDrawing,
  clearDrawings,
  getDrawings,
  newDrawingId,
  removeDrawing,
  type Drawing,
} from "../drawings";

// In-memory localStorage shim — drawings.ts only uses getItem/setItem.
function installShim() {
  const store: Record<string, string> = {};
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  };
}

function teardownShim() {
  delete (globalThis as any).window;
}

function trendline(): Drawing {
  return {
    id: newDrawingId(),
    type: "trendline",
    start: { time: 1000, price: 100 },
    end: { time: 2000, price: 110 },
    createdAt: Date.now(),
  };
}

// v5.2.3 — horizontal lines persist alongside trendlines in the same
// scope's array. Round-trips and removals must work identically across
// the discriminated-union types.
function horizontal(price = 105): Drawing {
  return {
    id: newDrawingId(),
    type: "horizontal",
    price,
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  installShim();
});

afterEach(() => {
  teardownShim();
});

describe("getDrawings / addDrawing", () => {
  it("returns empty array for an unknown scope", () => {
    expect(getDrawings("nonexistent")).toEqual([]);
  });

  it("round-trips a single trendline", () => {
    const d = trendline();
    addDrawing("scope-a", d);
    const out = getDrawings("scope-a");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(d.id);
  });

  it("appends to the same scope, isolated from other scopes", () => {
    addDrawing("scope-a", trendline());
    addDrawing("scope-a", trendline());
    addDrawing("scope-b", trendline());
    expect(getDrawings("scope-a")).toHaveLength(2);
    expect(getDrawings("scope-b")).toHaveLength(1);
  });
});

describe("clearDrawings", () => {
  it("removes all drawings under a scope", () => {
    addDrawing("scope-c", trendline());
    addDrawing("scope-c", trendline());
    expect(getDrawings("scope-c")).toHaveLength(2);
    clearDrawings("scope-c");
    expect(getDrawings("scope-c")).toEqual([]);
  });

  it("does not touch other scopes", () => {
    addDrawing("scope-x", trendline());
    addDrawing("scope-y", trendline());
    clearDrawings("scope-x");
    expect(getDrawings("scope-x")).toEqual([]);
    expect(getDrawings("scope-y")).toHaveLength(1);
  });
});

describe("removeDrawing", () => {
  it("removes a single drawing by id", () => {
    const a = trendline();
    const b = trendline();
    addDrawing("scope-r", a);
    addDrawing("scope-r", b);
    removeDrawing("scope-r", a.id);
    const out = getDrawings("scope-r");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(b.id);
  });

  it("is a no-op on unknown id", () => {
    const a = trendline();
    addDrawing("scope-r2", a);
    removeDrawing("scope-r2", "not-a-real-id");
    expect(getDrawings("scope-r2")).toHaveLength(1);
  });
});

describe("horizontal drawings (v5.2.3)", () => {
  it("round-trips a horizontal line", () => {
    const h = horizontal(101.5);
    addDrawing("scope-h", h);
    const out = getDrawings("scope-h");
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("horizontal");
    if (out[0].type === "horizontal") {
      expect(out[0].price).toBe(101.5);
    }
  });

  it("coexists with trendlines in the same scope", () => {
    addDrawing("scope-mix", trendline());
    addDrawing("scope-mix", horizontal());
    addDrawing("scope-mix", trendline());
    const out = getDrawings("scope-mix");
    expect(out).toHaveLength(3);
    expect(out.filter((d) => d.type === "trendline")).toHaveLength(2);
    expect(out.filter((d) => d.type === "horizontal")).toHaveLength(1);
  });

  it("removeDrawing targets a horizontal by id without disturbing trendlines", () => {
    const t = trendline();
    const h = horizontal();
    addDrawing("scope-rm", t);
    addDrawing("scope-rm", h);
    removeDrawing("scope-rm", h.id);
    const out = getDrawings("scope-rm");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(t.id);
  });
});

describe("newDrawingId", () => {
  it("returns a unique id on each call", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newDrawingId());
    expect(ids.size).toBe(50);
  });

  it("uses a 'dr_' prefix so debug logs are scannable", () => {
    expect(newDrawingId().startsWith("dr_")).toBe(true);
  });
});
