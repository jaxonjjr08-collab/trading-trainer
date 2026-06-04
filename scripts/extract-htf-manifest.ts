#!/usr/bin/env node
/**
 * v2.2 — One-shot helper for the HTF backfill. Parses lib/scenarios-real.ts
 * and emits a manifest line per scenario:
 *   <constName>\t<symbol>\t<sourceGranularitySeconds>\t<startISO>\t<endISO>\t<visibleCount>\t<decisionTime>\t<htfGranularitySeconds>
 *
 * Run with:
 *   npx tsx scripts/extract-htf-manifest.ts
 *
 * The HTF granularity is mapped from the source: 6h (21600s) → 1d (86400s),
 * 1h (3600s) → 6h (21600s). We widen the source window by 3× on each side to
 * give the HTF chart enough context.
 */

import * as fs from "fs";
import * as path from "path";

type ConstBlock = {
  name: string;
  candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>;
};

type ScenarioBlock = {
  id: string;
  symbol: string;
  timeframe: string;
  candlesConst: string;
  visibleCount: number;
};

const file = fs.readFileSync(path.join(__dirname, "..", "lib", "scenarios-real.ts"), "utf8");

// Parse candle const declarations.
const consts: ConstBlock[] = [];
const constRe = /^const (\w+): Candle\[\] = \[([\s\S]*?)\n\];/gm;
let m: RegExpExecArray | null;
while ((m = constRe.exec(file)) !== null) {
  const name = m[1];
  const body = m[2];
  const candleRe = /\{\s*time:\s*(\d+),\s*open:\s*[\d.-]+,\s*high:\s*[\d.-]+,\s*low:\s*[\d.-]+,\s*close:\s*[\d.-]+,\s*volume:\s*[\d.-]+\s*\}/g;
  const candles: ConstBlock["candles"] = [];
  let cm: RegExpExecArray | null;
  while ((cm = candleRe.exec(body)) !== null) {
    candles.push({ time: parseInt(cm[1], 10) } as any);
  }
  consts.push({ name, candles });
}

// Parse buildRealScenario calls.
const scenarios: ScenarioBlock[] = [];
const scenRe = /buildRealScenario\(\{\s*id:\s*"([^"]+)",\s*title:\s*"[^"]*",\s*symbol:\s*"([^"]+)",\s*timeframe:\s*"([^"]+)",[\s\S]*?candles:\s*(\w+),\s*visibleCount:\s*(\d+),/g;
while ((m = scenRe.exec(file)) !== null) {
  scenarios.push({
    id: m[1],
    symbol: m[2],
    timeframe: m[3],
    candlesConst: m[4],
    visibleCount: parseInt(m[5], 10),
  });
}

const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "6h": 21600,
  "1d": 86400,
};

const HTF_MAP: Record<string, number> = {
  "15m": 3600,   // 1h
  "1h": 21600,   // 6h (no native 4h)
  "6h": 86400,   // 1d
  "1d": 0,       // no native 1w on Coinbase
};

function toISO(t: number): string {
  return new Date(t * 1000).toISOString().slice(0, 10);
}

// Emit manifest.
for (const s of scenarios) {
  const block = consts.find((c) => c.name === s.candlesConst);
  if (!block || block.candles.length === 0) continue;
  const granularity = TF_SECONDS[s.timeframe];
  const firstTime = block.candles[0].time;
  const lastTime = block.candles[block.candles.length - 1].time;
  const decisionTime = firstTime + (s.visibleCount - 1) * granularity;
  const htfGranularity = HTF_MAP[s.timeframe] ?? 0;
  if (htfGranularity === 0) continue;
  // Coinbase product = symbol with slash → dash.
  const product = s.symbol.replace("/", "-");
  // Widen by ~3× on each side, clamped to a reasonable max.
  const span = lastTime - firstTime;
  const widenSec = Math.min(span * 2, 90 * 86400);  // cap at 90 days widening
  const wideStart = firstTime - widenSec;
  const wideEnd = lastTime + widenSec;
  process.stdout.write(
    [
      s.id,
      s.candlesConst,
      product,
      htfGranularity.toString(),
      toISO(wideStart),
      toISO(wideEnd),
      s.visibleCount.toString(),
      decisionTime.toString(),
    ].join("\t") + "\n"
  );
}
