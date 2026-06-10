// v5.12.6 — Pins the export/import snapshot contract. The Settings panel
// promises "back it up / restore on another browser"; before v5.12.6 the
// export silently dropped everything except attempts/quiz/diagnostic/drill,
// so a user who moved browsers lost their streak, defaults, indicator prefs,
// customised Guppy, sessions, etc. These tests lock in three things:
//   1. the snapshot captures a customised setting and round-trips it back,
//   2. API keys are NEVER written into the export payload (security), and
//   3. legacy (pre-v5.12.6) backups still import.
//
// Tests run in node; storage helpers guard on isBrowser(), so we shim a
// minimal localStorage on globalThis (mirrors drawings.test.ts).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  exportAllData,
  importAllData,
  getChrisGuppyParams,
  setChrisGuppyParams,
  setAiKey,
  setOpenAiKey,
  getAiKey,
} from "../storage";
import { CHRIS_GUPPY_DEFAULTS } from "../indicators-chris-guppy";

const GUPPY_KEY = "trainer.chrisGuppy.v1";
const AI_KEY = "trainer.aiKey.v1";
const OPENAI_KEY = "trainer.openAiKey.v1";

let store: Record<string, string>;

function installShim() {
  store = {};
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

describe("exportAllData", () => {
  it("uses the snapshot-v1 format with a data map", () => {
    const payload = exportAllData();
    expect(payload.format).toBe("snapshot-v1");
    expect(typeof payload.data).toBe("object");
    expect(typeof payload.exportedAt).toBe("number");
  });

  it("captures a customised setting", () => {
    setChrisGuppyParams({
      ...CHRIS_GUPPY_DEFAULTS,
      fast: [2, 4, 6, 8, 10, 12],
      source: "hlc3",
    });
    const payload = exportAllData();
    expect(typeof payload.data[GUPPY_KEY]).toBe("string");
    expect(payload.data[GUPPY_KEY]).toContain("hlc3");
  });

  it("NEVER includes the Anthropic or OpenAI API keys", () => {
    setAiKey("sk-ant-supersecret");
    setOpenAiKey("sk-openai-supersecret");
    const payload = exportAllData();
    expect(payload.data[AI_KEY]).toBeUndefined();
    expect(payload.data[OPENAI_KEY]).toBeUndefined();
    // And the serialised blob carries no trace of the secret values.
    const blob = JSON.stringify(payload);
    expect(blob).not.toContain("supersecret");
  });
});

describe("importAllData (snapshot round-trip)", () => {
  it("restores a customised setting onto a fresh store", () => {
    setChrisGuppyParams({
      ...CHRIS_GUPPY_DEFAULTS,
      fast: [3, 6, 9, 12, 15, 18],
      source: "ohlc4",
    });
    const json = JSON.stringify(exportAllData());

    teardownShim();
    installShim(); // pristine browser

    // Fresh store: defaults until we import.
    expect(getChrisGuppyParams().fast).toEqual(CHRIS_GUPPY_DEFAULTS.fast);

    const result = importAllData(json);
    expect(result.ok).toBe(true);
    expect(getChrisGuppyParams().fast).toEqual([3, 6, 9, 12, 15, 18]);
    expect(getChrisGuppyParams().source).toBe("ohlc4");
  });

  it("does not resurrect an API key (it was never exported)", () => {
    setAiKey("sk-ant-secret");
    const json = JSON.stringify(exportAllData());

    teardownShim();
    installShim();

    importAllData(json);
    expect(getAiKey()).toBe("");
  });

  it("leaves keys absent from the file untouched", () => {
    // Seed a Guppy customisation, then import a snapshot that doesn't mention
    // the Guppy key — the existing customisation must survive.
    setChrisGuppyParams({ ...CHRIS_GUPPY_DEFAULTS, fast: [5, 5, 5, 5, 5, 5] });
    const partial = JSON.stringify({
      version: "x",
      exportedAt: Date.now(),
      format: "snapshot-v1",
      data: { "trainer.attempts.v1": "[]" },
    });
    const result = importAllData(partial);
    expect(result.ok).toBe(true);
    expect(getChrisGuppyParams().fast).toEqual([5, 5, 5, 5, 5, 5]);
  });
});

describe("importAllData (legacy + errors)", () => {
  it("still imports a pre-v5.12.6 typed backup", () => {
    const legacy = JSON.stringify({
      version: "3.1.0",
      exportedAt: Date.now(),
      attempts: [{ id: "a" }, { id: "b" }],
      quizAttempts: [{ id: "q" }],
      diagnostic: null,
      activeDrill: null,
    });
    const result = importAllData(legacy);
    expect(result.ok).toBe(true);
    expect(result.imported?.attempts).toBe(2);
    expect(result.imported?.quizAttempts).toBe(1);
  });

  it("rejects non-JSON", () => {
    expect(importAllData("not json {").ok).toBe(false);
  });

  it("rejects an unrecognised object", () => {
    expect(importAllData(JSON.stringify({ hello: "world" })).ok).toBe(false);
  });
});
