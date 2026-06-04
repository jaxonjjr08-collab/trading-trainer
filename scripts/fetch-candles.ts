#!/usr/bin/env node
/**
 * Pull OHLCV candles from Coinbase's public exchange API and print them as a
 * ready-to-paste TypeScript `Candle[]` literal.
 *
 * Usage:
 *   npx tsx scripts/fetch-candles.ts <product> <granularity> <start> <end>
 *
 * Example (BTC-USD 6h candles, 2 weeks):
 *   npx tsx scripts/fetch-candles.ts BTC-USD 21600 2024-10-15 2024-10-29
 *
 * Granularity (seconds, must be one Coinbase supports):
 *   60       1 minute
 *   300      5 minutes
 *   900      15 minutes
 *   3600     1 hour
 *   21600    6 hours
 *   86400    1 day
 *
 * No API key required — this hits the public endpoint:
 *   https://api.exchange.coinbase.com/products/{product}/candles
 *
 * Coinbase caps each call to ~300 candles. The script auto-pages over wider date
 * ranges and sorts the result ascending before printing.
 */

const SUPPORTED_GRANULARITIES = [60, 300, 900, 3600, 21600, 86400] as const;
type Granularity = (typeof SUPPORTED_GRANULARITIES)[number];

type RawCandle = [number, number, number, number, number, number];
// Coinbase returns [time, low, high, open, close, volume].

type OutCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

async function fetchPage(
  product: string,
  granularity: Granularity,
  startISO: string,
  endISO: string
): Promise<OutCandle[]> {
  const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}&start=${startISO}&end=${endISO}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "trading-trainer-fetch-candles" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase ${res.status}: ${text.slice(0, 200)}`);
  }
  const raw = (await res.json()) as RawCandle[];
  return raw.map(([time, low, high, open, close, volume]) => ({
    time,
    open,
    high,
    low,
    close,
    volume,
  }));
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function format(c: OutCandle, priceDecimals: number): string {
  return `  { time: ${c.time}, open: ${round(c.open, priceDecimals)}, high: ${round(
    c.high,
    priceDecimals
  )}, low: ${round(c.low, priceDecimals)}, close: ${round(c.close, priceDecimals)}, volume: ${round(
    c.volume,
    2
  )} },`;
}

async function main(): Promise<void> {
  const [product, granRaw, startRaw, endRaw] = process.argv.slice(2);
  if (!product || !granRaw || !startRaw || !endRaw) {
    console.error(
      "Usage: npx tsx scripts/fetch-candles.ts <product> <granularity> <start> <end>"
    );
    console.error(
      "Example: npx tsx scripts/fetch-candles.ts BTC-USD 21600 2024-10-15 2024-10-29"
    );
    process.exit(1);
  }
  const granularity = Number(granRaw) as Granularity;
  if (!SUPPORTED_GRANULARITIES.includes(granularity)) {
    console.error(
      `Granularity ${granRaw} not supported. Use one of: ${SUPPORTED_GRANULARITIES.join(", ")}`
    );
    process.exit(1);
  }

  const startSec = Math.floor(new Date(startRaw).getTime() / 1000);
  const endSec = Math.floor(new Date(endRaw).getTime() / 1000);
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || startSec >= endSec) {
    console.error(`Bad date range: ${startRaw} -> ${endRaw}`);
    process.exit(1);
  }

  // Coinbase caps at ~300 candles per page; chunk by 290 to be safe.
  const chunkSize = 290 * granularity;
  const all: OutCandle[] = [];
  let cursor = startSec;
  while (cursor < endSec) {
    const chunkEnd = Math.min(cursor + chunkSize, endSec);
    const startISO = new Date(cursor * 1000).toISOString();
    const endISO = new Date(chunkEnd * 1000).toISOString();
    const page = await fetchPage(product, granularity, startISO, endISO);
    all.push(...page);
    cursor = chunkEnd;
  }

  // Dedupe + sort ascending by time.
  const seen = new Set<number>();
  const sorted = all
    .filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    })
    .sort((a, b) => a.time - b.time);

  // Heuristic: BTC/ETH need 2 decimals; smaller-priced symbols (SOL, etc.) need 4.
  const sample = sorted[0]?.close ?? 1;
  const priceDecimals = sample > 1000 ? 2 : 4;

  console.log(`// ${product} · granularity ${granularity}s · ${sorted.length} candles`);
  console.log(`// ${startRaw} → ${endRaw}`);
  console.log(`const CANDLES: Candle[] = [`);
  for (const c of sorted) console.log(format(c, priceDecimals));
  console.log(`];`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
