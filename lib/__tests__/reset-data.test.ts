// v5.12.5 — Pins resetAllLocalData() coverage. "Reset all data" in Settings
// loops over a private ALL_KEYS list; any localStorage-backed setting that
// isn't in that list silently survives a reset, which is a quiet data-hygiene
// bug (the user thinks they wiped the app but a stale config lingers).
//
// This regression test caught CHRIS_GUPPY_KEY being absent from ALL_KEYS:
// a user who customised Chris's Super Guppy kept those params through a reset.
// We exercise the public API (set → reset → expect defaults) rather than the
// private key string, so the test stays meaningful through a future rename.
//
// Tests run in node; storage helpers guard on isBrowser(), so we shim a
// minimal localStorage on globalThis (mirrors drawings.test.ts).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getChrisGuppyParams,
  setChrisGuppyParams,
  resetAllLocalData,
} from "../storage";
import { CHRIS_GUPPY_DEFAULTS } from "../indicators-chris-guppy";

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
    // setChrisGuppyParams broadcasts via dispatchEvent / CustomEvent for
    // same-tab repaint; stub them so the helper doesn't throw under node.
    dispatchEvent: () => true,
  };
  (globalThis as any).CustomEvent = class {
    constructor(public type: string, public init?: unknown) {}
  };
}

function teardownShim() {
  delete (globalThis as any).window;
  delete (globalThis as any).CustomEvent;
}

beforeEach(installShim);
afterEach(teardownShim);

describe("resetAllLocalData", () => {
  it("clears customised Chris's Super Guppy params (regression: was missing from ALL_KEYS)", () => {
    const custom = {
      ...CHRIS_GUPPY_DEFAULTS,
      fast: [2, 4, 6, 8, 10, 12],
      source: "hlc3" as const,
      show200: !CHRIS_GUPPY_DEFAULTS.show200,
    };
    setChrisGuppyParams(custom);
    // Sanity: it persisted before the reset.
    expect(getChrisGuppyParams().fast).toEqual([2, 4, 6, 8, 10, 12]);
    expect(getChrisGuppyParams().source).toBe("hlc3");

    resetAllLocalData();

    // After reset the customisation is gone and defaults come back.
    expect(getChrisGuppyParams().fast).toEqual(CHRIS_GUPPY_DEFAULTS.fast);
    expect(getChrisGuppyParams().source).toBe(CHRIS_GUPPY_DEFAULTS.source);
    expect(getChrisGuppyParams().show200).toBe(CHRIS_GUPPY_DEFAULTS.show200);
  });
});
