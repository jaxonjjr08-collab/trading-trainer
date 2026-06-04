#!/usr/bin/env node
/**
 * v2.2 — Fetch HTF candles for every scenario and emit one ready-to-paste
 * TypeScript const per scenario, plus the computed decision-index and a
 * machine-readable summary line for the wiring step.
 *
 * Run:
 *   npx tsx scripts/fetch-htf-batch.ts > htf-output.txt
 *
 * Then for each scenario:
 *   1. Splice the const after its source candle const
 *   2. Wire the HTF fields into buildRealScenario via Edit
 */

import * as fs from "fs";
import * as path from "path";

type ManifestRow = {
  id: string;
  constName: string;
  product: string;
  htfGranularity: number;
  start: string;
  end: string;
  visibleCount: number;
  decisionTime: number;
};

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

const SUPPORTED = [60, 300, 900, 3600, 21600, 86400];

async function fetchPage(product: string, granularity: number, startISO: string, endISO: string): Promise<Candle[]> {
  const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}&start=${startISO}&end=${endISO}`;
  const res = await fetch(url, { headers: { "User-Agent": "trading-trainer-fetch-htf" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase ${res.status} for ${product} ${granularity}s ${startISO}..${endISO}: ${text.slice(0, 200)}`);
  }
  const raw = (await res.json()) as Array<[number, number, number, number, number, number]>;
  // Coinbase returns [time, low, high, open, close, volume].
  return raw.map(([time, low, high, open, close, volume]) => ({ time, open, high, low, close, volume }));
}

async function fetchPaged(product: string, granularity: number, startISO: string, endISO: string): Promise<Candle[]> {
  const startMs = Date.parse(startISO + "T00:00:00Z");
  const endMs = Date.parse(endISO + "T00:00:00Z");
  const pageSpanMs = 290 * granularity * 1000;  // Coinbase caps at ~300 candles per page
  const all = new Map<number, Candle>();
  for (let cursor = startMs; cursor < endMs; cursor += pageSpanMs) {
    const pageEnd = Math.min(cursor + pageSpanMs, endMs);
    const pageStartISO = new Date(cursor).toISOString();
    const pageEndISO = new Date(pageEnd).toISOString();
    const page = await fetchPage(product, granularity, pageStartISO, pageEndISO);
    for (const c of page) all.set(c.time, c);
  }
  return [...all.values()].sort((a, b) => a.time - b.time);
}

function priceDecimals(product: string): number {
  if (product.startsWith("SOL")) return 2;
  return 2;  // BTC/ETH at integer-ish but keep 2dp for consistency
}

function fmtCandle(c: Candle, dp: number): string {
  const r = (n: number, p: number) => Math.round(n * Math.pow(10, p)) / Math.pow(10, p);
  return `  { time: ${c.time}, open: ${r(c.open, dp)}, high: ${r(c.high, dp)}, low: ${r(c.low, dp)}, close: ${r(c.close, dp)}, volume: ${r(c.volume, 2)} },`;
}

function findIdx(candles: Candle[], target: number): number {
  if (candles.length === 0) return 0;
  let lo = 0;
  let hi = candles.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time <= target) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function tfLabel(seconds: number): string {
  if (seconds === 86400) return "1d";
  if (seconds === 21600) return "6h";
  if (seconds === 3600) return "1h";
  if (seconds === 900) return "15m";
  return `${seconds}s`;
}

async function main() {
  // Read the manifest from extract output (passed via stdin or read from file).
  // For simplicity we re-run the extractor inline by reading the manifest file.
  const manifestPath = process.argv[2] ?? path.join(__dirname, "..", "htf-manifest.txt");
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const rows: ManifestRow[] = [];
  for (const line of manifestRaw.trim().split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 8) continue;
    rows.push({
      id: parts[0],
      constName: parts[1],
      product: parts[2],
      htfGranularity: parseInt(parts[3], 10),
      start: parts[4],
      end: parts[5],
      visibleCount: parseInt(parts[6], 10),
      decisionTime: parseInt(parts[7], 10),
    });
  }

  // Skip already-done scenarios (where the HTF const already exists in scenarios-real.ts).
  const existing = fs.readFileSync(
    path.join(__dirname, "..", "lib", "scenarios-real.ts"),
    "utf8"
  );
  const todo = rows.filter((r) => !existing.includes(`const ${r.constName}_HTF: Candle[]`));

  process.stderr.write(`Fetching ${todo.length} HTF series in batches of 4...\n`);

  // Run in batches of 4 in parallel to be polite to Coinbase rate limits.
  const results = new Map<string, { const: string; idx: number; tf: string }>();
  for (let i = 0; i < todo.length; i += 4) {
    const batch = todo.slice(i, i + 4);
    process.stderr.write(`Batch ${Math.floor(i / 4) + 1}: ${batch.map((b) => b.id).join(", ")}\n`);
    const settled = await Promise.allSettled(
      batch.map(async (r) => {
        const candles = await fetchPaged(r.product, r.htfGranularity, r.start, r.end);
        const dp = priceDecimals(r.product);
        const lines = candles.map((c) => fmtCandle(c, dp));
        const tf = tfLabel(r.htfGranularity);
        const header = `// ${r.product} · granularity ${r.htfGranularity}s · ${candles.length} candles (HTF context for ${r.constName})`;
        const dateRange = `// ${r.start} → ${r.end}`;
        const constBody = `${header}\n${dateRange}\nconst ${r.constName}_HTF: Candle[] = [\n${lines.join("\n")}\n];`;
        const idx = findIdx(candles, r.decisionTime);
        return { id: r.id, constBody, idx, tf };
      })
    );
    for (let j = 0; j < settled.length; j++) {
      const r = batch[j];
      const s = settled[j];
      if (s.status === "rejected") {
        process.stderr.write(`FAIL ${r.id}: ${s.reason}\n`);
        continue;
      }
      results.set(r.id, { const: s.value.constBody, idx: s.value.idx, tf: s.value.tf });
    }
    // Small pause between batches.
    if (i + 4 < todo.length) await new Promise((res) => setTimeout(res, 500));
  }

  // Emit a JSON manifest of results so the wiring step can splice each one in.
  const out: any[] = [];
  for (const r of todo) {
    const res = results.get(r.id);
    if (!res) continue;
    out.push({
      id: r.id,
      constName: r.constName,
      htfConstBody: res.const,
      htfDecisionIndex: res.idx,
      htfTimeframeLabel: res.tf,
    });
  }
  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e}\n`);
  process.exit(1);
});
