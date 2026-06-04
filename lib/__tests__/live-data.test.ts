// v5.0 — Tests for the Coinbase REST fetcher. Mocks global.fetch so they run
// fast and don't hit the network. Pins the request URL contract, OHLCV
// parsing, dedupe, sort, and the "since" filter.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchInitialHistory,
  fetchLatestCandles,
  fetchProducts,
  fetchTicker,
  granularityLabel,
  pollIntervalMs,
} from "../live-data";

// Coinbase returns descending order, with each row as:
// [time, low, high, open, close, volume]
function rawCandle(
  time: number,
  low: number,
  high: number,
  open: number,
  close: number,
  volume: number
): [number, number, number, number, number, number] {
  return [time, low, high, open, close, volume];
}

let fetchSpy: ReturnType<typeof vi.fn>;
let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = global.fetch;
  fetchSpy = vi.fn();
  global.fetch = fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockOkJson(body: unknown) {
  fetchSpy.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

function mockErr(status: number, text: string) {
  fetchSpy.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => text,
    json: async () => ({ error: text }),
  } as Response);
}

describe("granularityLabel + pollIntervalMs", () => {
  it("maps every supported granularity to a label", () => {
    expect(granularityLabel(60)).toBe("1m");
    expect(granularityLabel(300)).toBe("5m");
    expect(granularityLabel(900)).toBe("15m");
    expect(granularityLabel(3600)).toBe("1h");
    expect(granularityLabel(21600)).toBe("6h");
    expect(granularityLabel(86400)).toBe("1d");
  });

  it("returns a positive poll interval for every granularity", () => {
    expect(pollIntervalMs(60)).toBeGreaterThan(0);
    expect(pollIntervalMs(300)).toBeGreaterThan(0);
    expect(pollIntervalMs(86400)).toBeGreaterThan(0);
  });

  it("polls faster than the candle width itself", () => {
    // Otherwise we'd miss candles between ticks.
    expect(pollIntervalMs(60)).toBeLessThan(60_000);
    expect(pollIntervalMs(300)).toBeLessThan(300_000);
  });
});

describe("fetchInitialHistory", () => {
  it("hits the expected Coinbase candles endpoint", async () => {
    mockOkJson([
      rawCandle(1_700_000_060, 100, 105, 101, 104, 1000),
      rawCandle(1_700_000_000, 99, 103, 100, 102, 900),
    ]);
    await fetchInitialHistory("BTC-USD", 60, 10);
    const callArgs = fetchSpy.mock.calls[0];
    const url = String(callArgs[0]);
    expect(url).toContain("https://api.exchange.coinbase.com/products/BTC-USD/candles");
    expect(url).toContain("granularity=60");
    expect(url).toContain("start=");
    expect(url).toContain("end=");
  });

  it("converts Coinbase rows to Candles with the right field order", async () => {
    mockOkJson([
      rawCandle(1_700_000_060, 100, 105, 101, 104, 1000),
    ]);
    const candles = await fetchInitialHistory("BTC-USD", 60, 1);
    expect(candles.length).toBe(1);
    const c = candles[0];
    expect(c).toEqual({
      time: 1_700_000_060,
      open: 101,
      high: 105,
      low: 100,
      close: 104,
      volume: 1000,
    });
  });

  it("sorts ascending by time", async () => {
    mockOkJson([
      rawCandle(1_700_000_120, 100, 110, 105, 108, 1),
      rawCandle(1_700_000_060, 100, 110, 105, 108, 1),
      rawCandle(1_700_000_000, 100, 110, 105, 108, 1),
    ]);
    const candles = await fetchInitialHistory("BTC-USD", 60, 5);
    expect(candles.map((c) => c.time)).toEqual([
      1_700_000_000,
      1_700_000_060,
      1_700_000_120,
    ]);
  });

  it("dedupes by time", async () => {
    mockOkJson([
      rawCandle(1_700_000_000, 100, 110, 105, 108, 1),
      rawCandle(1_700_000_000, 100, 110, 105, 108, 1), // duplicate
      rawCandle(1_700_000_060, 100, 110, 105, 108, 1),
    ]);
    const candles = await fetchInitialHistory("BTC-USD", 60, 5);
    expect(candles.length).toBe(2);
  });

  it("throws LiveDataError on non-OK status", async () => {
    mockErr(429, "Rate limited");
    await expect(fetchInitialHistory("BTC-USD", 60, 10)).rejects.toThrow(
      /Coinbase 429/
    );
  });

  it("caps count at ~290 (Coinbase per-request limit)", async () => {
    mockOkJson([]);
    await fetchInitialHistory("BTC-USD", 60, 999_999);
    const url = String(fetchSpy.mock.calls[0][0]);
    // Extract start/end and check the time window is roughly 290 candles wide.
    const startMatch = url.match(/start=([^&]+)/);
    const endMatch = url.match(/end=([^&]+)/);
    expect(startMatch).not.toBeNull();
    expect(endMatch).not.toBeNull();
    const start = new Date(decodeURIComponent(startMatch![1])).getTime() / 1000;
    const end = new Date(decodeURIComponent(endMatch![1])).getTime() / 1000;
    const widthCandles = (end - start) / 60;
    expect(widthCandles).toBeLessThanOrEqual(295);
  });
});

describe("fetchLatestCandles", () => {
  it("returns [] without fetching when no new closed bar exists yet", async () => {
    // v5.0 bug-fix gate: when nowSec - sinceTime < 2*granularity, no new
    // closed bar has finished, so we bail without hitting Coinbase. Previously
    // we'd build a future-window request and get a 400 back.
    const sinceTime = Math.floor(Date.now() / 1000) - 30; // 30s ago, granularity 60
    const result = await fetchLatestCandles("BTC-USD", 60, sinceTime);
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("filters out candles whose time <= sinceTime", async () => {
    const sinceTime = 1_700_000_000;
    mockOkJson([
      rawCandle(sinceTime, 100, 110, 105, 108, 1),       // should drop
      rawCandle(sinceTime - 60, 100, 110, 105, 108, 1),  // should drop
      rawCandle(sinceTime + 60, 100, 110, 105, 108, 1),  // keep
      rawCandle(sinceTime + 120, 100, 110, 105, 108, 1), // keep
    ]);
    const result = await fetchLatestCandles("BTC-USD", 60, sinceTime);
    expect(result.map((c) => c.time)).toEqual([
      sinceTime + 60,
      sinceTime + 120,
    ]);
  });

  it("returns empty when sinceTime is already in the future", async () => {
    // No fetch should fire because cappedStart >= endSec.
    const sinceTime = Math.floor(Date.now() / 1000) + 3600;
    const result = await fetchLatestCandles("BTC-USD", 60, sinceTime);
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("caps lookback at 290 candles when sinceTime is very old", async () => {
    mockOkJson([]);
    const veryOld = Math.floor(Date.now() / 1000) - 10_000 * 60; // 10000 candles ago
    await fetchLatestCandles("BTC-USD", 60, veryOld);
    const url = String(fetchSpy.mock.calls[0][0]);
    const startMatch = url.match(/start=([^&]+)/);
    const endMatch = url.match(/end=([^&]+)/);
    const start = new Date(decodeURIComponent(startMatch![1])).getTime() / 1000;
    const end = new Date(decodeURIComponent(endMatch![1])).getTime() / 1000;
    const widthCandles = (end - start) / 60;
    expect(widthCandles).toBeLessThanOrEqual(295);
  });
});

describe("fetchTicker (v5.0.2)", () => {
  it("hits the ticker endpoint and parses price + time", async () => {
    mockOkJson({
      trade_id: 12345,
      price: "73850.42",
      size: "0.01",
      time: "2026-05-31T23:30:15.000Z",
      bid: "73850.00",
      ask: "73850.42",
      volume: "1234.5",
    });
    const t = await fetchTicker("BTC-USD");
    expect(String(fetchSpy.mock.calls[0][0])).toContain(
      "https://api.exchange.coinbase.com/products/BTC-USD/ticker"
    );
    expect(t.productId).toBe("BTC-USD");
    expect(t.price).toBeCloseTo(73850.42, 2);
    expect(t.time).toBe(Date.parse("2026-05-31T23:30:15.000Z"));
  });

  it("throws on non-OK status", async () => {
    mockErr(503, "Service unavailable");
    await expect(fetchTicker("BTC-USD")).rejects.toThrow(/Coinbase ticker 503/);
  });

  it("throws when price is missing or unparseable", async () => {
    mockOkJson({ trade_id: 1, price: "not-a-number", time: "2026-01-01T00:00:00Z" });
    await expect(fetchTicker("BTC-USD")).rejects.toThrow(/no usable price/);
  });

  it("falls back to Date.now() when time is missing", async () => {
    mockOkJson({ price: "100.5" });
    const before = Date.now();
    const t = await fetchTicker("BTC-USD");
    const after = Date.now();
    expect(t.price).toBeCloseTo(100.5, 2);
    expect(t.time).toBeGreaterThanOrEqual(before);
    expect(t.time).toBeLessThanOrEqual(after);
  });
});

describe("fetchProducts (v5.7.0)", () => {
  // v5.7.0 added an in-memory cache that's process-local. Vitest resets
  // modules between test files but NOT between cases in the same file —
  // so we use a different mock payload here and accept that the cache may
  // already be populated from an earlier case. The asserts are about the
  // FILTERING contract, not "exactly N items returned across runs."
  it("filters out non-USD quote pairs", async () => {
    mockOkJson([
      { id: "BTC-USD", base_currency: "BTC", quote_currency: "USD", status: "online" },
      { id: "BTC-EUR", base_currency: "BTC", quote_currency: "EUR", status: "online" },
      { id: "ETH-USDT", base_currency: "ETH", quote_currency: "USDT", status: "online" },
      { id: "ETH-USD", base_currency: "ETH", quote_currency: "USD", status: "online" },
    ]);
    // First call sets the cache.
    const out = await fetchProducts();
    expect(out.every((p) => p.quoteCurrency === "USD")).toBe(true);
  });

  it("returns the cached payload on subsequent calls without re-fetching", async () => {
    // No mockOkJson — if the implementation calls fetch we'd get an
    // undefined response and the test would fail loudly.
    const out = await fetchProducts();
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
});
