// v5.0 — Live Coinbase REST data fetcher for paper trading.
//
// Two entry points:
//   - fetchInitialHistory: pull N most-recent closed candles to seed a session
//   - fetchLatestCandles: pull just-the-new closed candles since a given time
//
// No API key required — public endpoint:
//   https://api.exchange.coinbase.com/products/{product}/candles
//
// Same contract scripts/fetch-candles.ts uses (raw shape: [time, low, high,
// open, close, volume]; we normalize to our Candle).
//
// Coinbase caps each request at ~300 candles. fetchLatestCandles is built to
// never need that much (it asks for "since lastCandle.time"), but we cap
// requests defensively at 300 candles' worth of seconds.

import type { Candle } from "./types";

// Granularity values Coinbase supports. Keep this in sync with the script
// (scripts/fetch-candles.ts) so cross-referencing is easy.
export const SUPPORTED_GRANULARITIES = [60, 300, 900, 3600, 21600, 86400] as const;
export type Granularity = (typeof SUPPORTED_GRANULARITIES)[number];

const COINBASE_BASE = "https://api.exchange.coinbase.com";

type RawCandle = [number, number, number, number, number, number];

function rawToCandle(raw: RawCandle): Candle {
  const [time, low, high, open, close, volume] = raw;
  return { time, open, high, low, close, volume };
}

// Sort ascending by time + drop dupes. Coinbase returns descending and
// paginated requests can overlap; both surfaces here normalize to ascending +
// unique-by-time.
function dedupeAndSort(candles: Candle[]): Candle[] {
  const seen = new Set<number>();
  const unique: Candle[] = [];
  for (const c of candles) {
    if (seen.has(c.time)) continue;
    seen.add(c.time);
    unique.push(c);
  }
  return unique.sort((a, b) => a.time - b.time);
}

export class LiveDataError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "LiveDataError";
    this.status = status;
  }
}

async function fetchPage(
  productId: string,
  granularity: Granularity,
  startSec: number,
  endSec: number
): Promise<Candle[]> {
  const startISO = new Date(startSec * 1000).toISOString();
  const endISO = new Date(endSec * 1000).toISOString();
  const url =
    `${COINBASE_BASE}/products/${productId}/candles` +
    `?granularity=${granularity}` +
    `&start=${startISO}` +
    `&end=${endISO}`;
  const res = await fetch(url, {
    // No User-Agent header in the browser — fetch will set one. The script
    // sets one because Node fetch is stricter.
    headers: {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new LiveDataError(res.status, `Coinbase ${res.status}: ${text.slice(0, 200)}`);
  }
  const raw = (await res.json()) as RawCandle[];
  if (!Array.isArray(raw)) {
    throw new LiveDataError(0, "Unexpected Coinbase response shape");
  }
  return raw.map(rawToCandle);
}

// Pull the most recent N closed candles. Used on session start so the chart
// has visible history immediately. N is capped at 290 (Coinbase's ~300 limit
// minus a safety margin) — for v5.0 we don't paginate; one request is enough
// for the seed window.
//
// v5.0 bug-fix: end at `nowSec`, not `nowSec + granularity`. Coinbase
// rejects requests whose start is in the future, and including `+ granularity`
// in the upper bound pushes the entire window forward — which only manifested
// when the call window happened to land right at a bar boundary. The actual
// "include the just-closed bar" guarantee comes from Coinbase's half-open
// semantics, not from inflating the end timestamp.
export async function fetchInitialHistory(
  productId: string,
  granularity: Granularity,
  count: number
): Promise<Candle[]> {
  const safeCount = Math.max(1, Math.min(290, Math.floor(count)));
  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = nowSec;
  const startSec = endSec - safeCount * granularity;
  const page = await fetchPage(productId, granularity, startSec, endSec);
  return dedupeAndSort(page);
}

// Pull candles strictly NEWER than sinceTime. Used by the polling loop to
// append the latest closed bar(s). Returns [] when no new candle has closed
// yet (the common case between ticks) — without hitting the network. The
// polling hook checks length before calling advanceTo.
//
// v5.0 bug-fix: gate on "has at least one new closed bar finished" before
// making the request. A bar starting at time T is closed when wall-clock
// ≥ T + granularity. So a NEW bar after `sinceTime` (which is the start of
// the last bar we have) is closed when `nowSec ≥ sinceTime + 2*granularity`.
// Polling fires every ~5s on 1m granularity, so most ticks land inside the
// current still-in-progress bar and previously got back a 400 from Coinbase.
// Now they just return [] cheaply.
//
// Defensive cap: never asks for more than 290 candles' worth of data in one
// request, even if sinceTime is very old (e.g. tab was hidden for hours).
// Polling will catch up over multiple cycles in that case.
export async function fetchLatestCandles(
  productId: string,
  granularity: Granularity,
  sinceTime: number
): Promise<Candle[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  // No new closed bar exists yet — fast bail, no network call.
  if (nowSec - sinceTime < 2 * granularity) return [];
  const wantedStart = sinceTime + granularity; // first candle AFTER the last we have
  const cappedStart = Math.max(wantedStart, nowSec - 290 * granularity);
  if (cappedStart >= nowSec) return [];
  const page = await fetchPage(productId, granularity, cappedStart, nowSec);
  // Drop anything that's <= sinceTime defensively (Coinbase is half-open but
  // we'd rather be safe than insert a duplicate).
  return dedupeAndSort(page.filter((c) => c.time > sinceTime));
}

// v5.6.2 — Pull older history before a given timestamp. Used by the "Load
// older" button on /paper-trading to walk back through history one page at
// a time. Returns the newest-to-oldest run of up-to-`count` candles strictly
// before `beforeTime` (exclusive). Empty array means Coinbase has no more
// data going back from that point — the chart has reached the listing date.
//
// Same 290-candle defensive cap as fetchInitialHistory; the cap is one
// network call, so callers can loop to paginate further back if they want.
export async function fetchHistoryBefore(
  productId: string,
  granularity: Granularity,
  beforeTime: number,
  count: number
): Promise<Candle[]> {
  const safeCount = Math.max(1, Math.min(290, Math.floor(count)));
  // End at `beforeTime` (exclusive). Coinbase is half-open on (start, end];
  // we shift end down by one granularity tick so the last bar we already
  // have isn't re-fetched and we don't fight the dedup pass.
  const endSec = beforeTime - granularity;
  const startSec = endSec - safeCount * granularity;
  if (startSec >= endSec || startSec < 0) return [];
  try {
    const page = await fetchPage(productId, granularity, startSec, endSec);
    // Defensive: drop anything >= beforeTime even though the upper bound
    // already excludes it.
    return dedupeAndSort(page.filter((c) => c.time < beforeTime));
  } catch (err) {
    // 400 from Coinbase typically means we've passed the listing date.
    // Surface as "no more data" rather than throwing — the UI treats an
    // empty array as "you've reached the start."
    if (err instanceof LiveDataError && err.status === 400) return [];
    throw err;
  }
}

// v5.7.0 — Coinbase products catalog. Used by the symbol picker on the
// /paper-trading start screen. Fetches every product Coinbase exposes,
// filters to USD-quoted spot pairs (the only ones the trainer supports —
// the candles endpoint is the same for all), and caches the result for
// the lifetime of the page mount so the picker stays snappy when the
// user opens it.
//
// Coinbase's /products endpoint returns ~200 items; the response is
// modest in size and rarely changes. We don't bother with persistent
// caching — it's an in-memory cache via a module-scope var that resets
// on hard reload.
export type CoinbaseProduct = {
  id: string;            // e.g. "BTC-USD"
  baseCurrency: string;  // e.g. "BTC"
  quoteCurrency: string; // e.g. "USD"
  displayName: string;   // e.g. "BTC/USD"
  status: string;        // "online" / "delisted" / "post_only"
};

let productsCache: CoinbaseProduct[] | null = null;

// v5.8.4 — Coinbase currency-name catalog. The /products endpoint only
// gives the base-currency CODE ("BTC"); the symbol picker wants the full
// human name ("Bitcoin") the way TradingView shows it, so the list is
// scannable by name and not just ticker. /currencies returns { id, name }
// per currency. Cached in-memory like the products list.
let currencyNamesCache: Map<string, string> | null = null;

export async function fetchCurrencyNames(): Promise<Map<string, string>> {
  if (currencyNamesCache) return currencyNamesCache;
  const url = `${COINBASE_BASE}/currencies`;
  const res = await fetch(url, { headers: {} });
  if (!res.ok) {
    // Non-fatal: the picker still works with ticker-only rows. Return an
    // empty map rather than throwing so a /currencies hiccup doesn't break
    // the whole symbol search.
    return new Map();
  }
  const raw = (await res.json()) as Array<{ id?: string; name?: string }>;
  const map = new Map<string, string>();
  if (Array.isArray(raw)) {
    for (const c of raw) {
      if (c.id && c.name) map.set(c.id, c.name);
    }
  }
  currencyNamesCache = map;
  return map;
}

export async function fetchProducts(): Promise<CoinbaseProduct[]> {
  if (productsCache) return productsCache;
  const url = `${COINBASE_BASE}/products`;
  const res = await fetch(url, { headers: {} });
  if (!res.ok) {
    const text = await res.text();
    throw new LiveDataError(
      res.status,
      `Coinbase products ${res.status}: ${text.slice(0, 200)}`
    );
  }
  const raw = (await res.json()) as Array<{
    id?: string;
    base_currency?: string;
    quote_currency?: string;
    display_name?: string;
    status?: string;
    trading_disabled?: boolean;
  }>;
  if (!Array.isArray(raw)) {
    throw new LiveDataError(0, "Unexpected Coinbase products response shape");
  }
  // Filter to USD-quoted spot pairs that are actually tradeable (online +
  // not trading_disabled). Coinbase exposes thousands of stablecoin pairs
  // (USDT, USDC, EUR, GBP) we don't need; USD only keeps the picker
  // legible.
  const out: CoinbaseProduct[] = [];
  for (const p of raw) {
    if (
      !p.id ||
      !p.base_currency ||
      !p.quote_currency ||
      p.quote_currency !== "USD" ||
      p.status !== "online" ||
      p.trading_disabled === true
    ) {
      continue;
    }
    out.push({
      id: p.id,
      baseCurrency: p.base_currency,
      quoteCurrency: p.quote_currency,
      displayName: p.display_name ?? p.id,
      status: p.status,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  productsCache = out;
  return out;
}

// v5.0.2 — Lightweight ticker fetch. Coinbase's /ticker endpoint returns the
// last trade price, updated continuously. We use this for intra-candle chart
// updates so the chart "ticks" smoothly between bar closes instead of
// freezing for the ~60s a 1m bar is in progress.
//
// Shape from Coinbase:
//   { trade_id, price, size, time, bid, ask, volume }
// We only need price + time.
export type LiveTicker = {
  productId: string;
  price: number;
  time: number; // ms epoch
};

export async function fetchTicker(productId: string): Promise<LiveTicker> {
  const url = `${COINBASE_BASE}/products/${productId}/ticker`;
  const res = await fetch(url, { headers: {} });
  if (!res.ok) {
    const text = await res.text();
    throw new LiveDataError(res.status, `Coinbase ticker ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { price?: string; time?: string };
  const price = data.price != null ? parseFloat(data.price) : NaN;
  if (!isFinite(price)) {
    throw new LiveDataError(0, `Coinbase ticker returned no usable price for ${productId}`);
  }
  const time =
    data.time && !Number.isNaN(Date.parse(data.time))
      ? Date.parse(data.time)
      : Date.now();
  return { productId, price, time };
}

// Convenience: human label for a granularity. Used by UI surfaces.
export function granularityLabel(g: Granularity): string {
  switch (g) {
    case 60:
      return "1m";
    case 300:
      return "5m";
    case 900:
      return "15m";
    case 3600:
      return "1h";
    case 21600:
      return "6h";
    case 86400:
      return "1d";
  }
}

// Recommended poll cadence (ms) per granularity. We poll faster than the
// granularity itself so we catch new candles within a few seconds of close.
export function pollIntervalMs(g: Granularity): number {
  switch (g) {
    case 60:
      return 5_000;     // 1m candles → check every 5s
    case 300:
      return 15_000;    // 5m → 15s
    case 900:
      return 30_000;    // 15m → 30s
    case 3600:
      return 60_000;    // 1h → 60s
    case 21600:
      return 5 * 60_000; // 6h → 5min
    case 86400:
      return 30 * 60_000; // 1d → 30min
  }
}
