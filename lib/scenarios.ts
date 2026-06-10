// Real historical BTC/USD candle data from Coinbase (granularity 21600 = 6h).
// Manually pasted at build time, not fetched at runtime.
// Hidden candles are revealed to the user only after they submit a decision.

import type {
  Candle,
  Difficulty,
  Direction,
  Scenario,
  SetupType,
} from "./types";
import { buildRealScenario } from "./scenario-factory";
import { REAL_SCENARIOS } from "./scenarios-real";
import { withDerivedManagement } from "./management-derivation";

// Deterministic LCG so synthetic scenarios are reproducible across builds.
// v3.0 — exported for reuse by lib/procedural-scenarios.ts. Same algorithm.
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export type Move = { drift: number; vol: number };

// Turn a sequence of per-candle drift+volatility moves into a Candle[].
export function genCandles(
  startPrice: number,
  moves: Move[],
  startTime: number,
  intervalSec: number,
  seed: number
): Candle[] {
  const rng = makeRng(seed);
  let price = startPrice;
  const out: Candle[] = [];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const open = price;
    const close = open * (1 + m.drift);
    const body = Math.abs(close - open);
    const wick = open * m.vol;
    const high = Math.max(open, close) + body * rng() * 0.7 + wick * rng();
    const low = Math.min(open, close) - body * rng() * 0.7 - wick * rng();
    const volume = Math.round(100 + rng() * 4000 + Math.abs(m.drift) * 50000);
    const round = startPrice > 1000 ? 2 : 4;
    out.push({
      time: startTime + i * intervalSec,
      open: Number(open.toFixed(round)),
      high: Number(high.toFixed(round)),
      low: Number(low.toFixed(round)),
      close: Number(close.toFixed(round)),
      volume,
    });
    price = close;
  }
  return out;
}

// Build a scenario's visible + hidden candle arrays from two move sequences.
// v3.0 — exported for reuse by lib/procedural-scenarios.ts.
export function buildSeries(
  startPrice: number,
  visibleMoves: Move[],
  hiddenMoves: Move[],
  startTime: number,
  intervalSec: number,
  seed: number
): { visible: Candle[]; hidden: Candle[] } {
  const visible = genCandles(startPrice, visibleMoves, startTime, intervalSec, seed);
  const lastClose = visible[visible.length - 1].close;
  const hiddenStart = startTime + visibleMoves.length * intervalSec;
  const hidden = genCandles(lastClose, hiddenMoves, hiddenStart, intervalSec, seed + 7919);
  return { visible, hidden };
}

// ── Synthetic scenarios ──────────────────────────────────────────────────────

const H4 = 14400;
const H1 = 3600;
const H6 = 21600;

// 4) Support breakdown — ETH, 4h. Hovers above $3100, then breaks down decisively.
const breakdown = buildSeries(
  3260,
  [
    { drift: -0.004, vol: 0.006 }, { drift: 0.003, vol: 0.005 },
    { drift: -0.006, vol: 0.007 }, { drift: 0.002, vol: 0.005 },
    { drift: -0.005, vol: 0.006 }, { drift: 0.001, vol: 0.005 },
    { drift: -0.008, vol: 0.008 }, { drift: 0.003, vol: 0.005 },
    { drift: -0.004, vol: 0.006 }, { drift: -0.002, vol: 0.005 },
    { drift: -0.006, vol: 0.007 }, { drift: 0.001, vol: 0.005 },
    { drift: -0.005, vol: 0.006 }, { drift: -0.003, vol: 0.005 },
    { drift: -0.008, vol: 0.008 }, { drift: 0.002, vol: 0.005 },
    { drift: -0.005, vol: 0.006 }, { drift: -0.004, vol: 0.005 },
    { drift: -0.003, vol: 0.005 }, { drift: 0.002, vol: 0.005 },
    { drift: -0.004, vol: 0.005 }, { drift: -0.006, vol: 0.007 },
    { drift: -0.015, vol: 0.012 }, { drift: -0.008, vol: 0.010 },
  ],
  [
    { drift: -0.012, vol: 0.010 }, { drift: -0.009, vol: 0.009 },
    { drift: 0.004, vol: 0.006 }, { drift: -0.011, vol: 0.010 },
    { drift: -0.014, vol: 0.011 }, { drift: 0.005, vol: 0.007 },
    { drift: -0.008, vol: 0.008 }, { drift: -0.010, vol: 0.009 },
    { drift: -0.006, vol: 0.007 }, { drift: 0.003, vol: 0.006 },
    { drift: -0.005, vol: 0.006 }, { drift: -0.007, vol: 0.008 },
  ],
  1717200000,
  H4,
  101
);

// 5) Overextended pump — BTC, 1h. 8 green candles into a fresh local high.
const overextended = buildSeries(
  58200,
  [
    { drift: 0.001, vol: 0.003 }, { drift: -0.001, vol: 0.003 },
    { drift: 0.002, vol: 0.003 }, { drift: -0.001, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.001, vol: 0.003 },
    { drift: 0.0015, vol: 0.003 }, { drift: 0.002, vol: 0.003 },
    { drift: 0.005, vol: 0.005 }, { drift: 0.007, vol: 0.006 },
    { drift: 0.009, vol: 0.006 }, { drift: 0.011, vol: 0.007 },
    { drift: 0.008, vol: 0.006 }, { drift: 0.006, vol: 0.006 },
    { drift: 0.005, vol: 0.005 }, { drift: 0.004, vol: 0.005 },
    { drift: 0.003, vol: 0.004 }, { drift: 0.002, vol: 0.004 },
    { drift: 0.0015, vol: 0.004 }, { drift: 0.001, vol: 0.004 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.001, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.0003, vol: 0.003 },
  ],
  [
    { drift: -0.002, vol: 0.004 }, { drift: -0.004, vol: 0.005 },
    { drift: -0.007, vol: 0.006 }, { drift: -0.005, vol: 0.005 },
    { drift: -0.009, vol: 0.007 }, { drift: -0.004, vol: 0.005 },
    { drift: -0.003, vol: 0.004 }, { drift: 0.002, vol: 0.004 },
    { drift: -0.005, vol: 0.005 }, { drift: -0.003, vol: 0.004 },
    { drift: -0.002, vol: 0.004 }, { drift: -0.001, vol: 0.003 },
  ],
  1717200000,
  H1,
  202
);

// 6) Liquidity sweep — SOL, 4h. Range, then sharp wick below support, close back inside.
const sweep = buildSeries(
  148,
  [
    { drift: 0.002, vol: 0.008 }, { drift: -0.004, vol: 0.008 },
    { drift: 0.003, vol: 0.008 }, { drift: -0.002, vol: 0.008 },
    { drift: 0.005, vol: 0.009 }, { drift: -0.006, vol: 0.009 },
    { drift: 0.004, vol: 0.008 }, { drift: -0.003, vol: 0.008 },
    { drift: 0.002, vol: 0.008 }, { drift: -0.005, vol: 0.009 },
    { drift: 0.003, vol: 0.008 }, { drift: -0.001, vol: 0.008 },
    { drift: 0.004, vol: 0.008 }, { drift: -0.007, vol: 0.010 },
    { drift: 0.002, vol: 0.008 }, { drift: -0.003, vol: 0.008 },
    { drift: 0.001, vol: 0.008 }, { drift: -0.004, vol: 0.008 },
    { drift: -0.003, vol: 0.009 }, { drift: -0.005, vol: 0.010 },
    { drift: -0.008, vol: 0.012 }, { drift: -0.015, vol: 0.025 }, // sweep down
    { drift: 0.018, vol: 0.020 }, { drift: -0.002, vol: 0.010 }, // close back in range
  ],
  [
    { drift: 0.006, vol: 0.010 }, { drift: 0.009, vol: 0.011 },
    { drift: 0.005, vol: 0.009 }, { drift: 0.012, vol: 0.012 },
    { drift: -0.003, vol: 0.008 }, { drift: 0.007, vol: 0.009 },
    { drift: 0.004, vol: 0.008 }, { drift: 0.006, vol: 0.009 },
    { drift: -0.002, vol: 0.008 }, { drift: 0.005, vol: 0.008 },
    { drift: 0.003, vol: 0.008 }, { drift: 0.004, vol: 0.008 },
  ],
  1717200000,
  H4,
  303
);

// 7) Clean retest — ETH, 6h. Broke above $3500, now retests it as support.
const retest = buildSeries(
  3380,
  [
    { drift: 0.004, vol: 0.005 }, { drift: 0.003, vol: 0.005 },
    { drift: 0.006, vol: 0.006 }, { drift: -0.002, vol: 0.005 },
    { drift: 0.005, vol: 0.005 }, { drift: 0.008, vol: 0.007 },
    { drift: 0.004, vol: 0.005 }, { drift: 0.010, vol: 0.008 }, // breakout
    { drift: 0.012, vol: 0.009 }, { drift: 0.006, vol: 0.006 },
    { drift: 0.003, vol: 0.005 }, { drift: 0.002, vol: 0.005 },
    { drift: -0.001, vol: 0.004 }, { drift: -0.003, vol: 0.005 },
    { drift: -0.005, vol: 0.006 }, { drift: -0.004, vol: 0.005 },
    { drift: -0.003, vol: 0.005 }, { drift: -0.005, vol: 0.006 }, // pullback
    { drift: -0.004, vol: 0.005 }, { drift: -0.002, vol: 0.005 },
    { drift: -0.001, vol: 0.004 }, { drift: 0.001, vol: 0.004 },
    { drift: 0.0005, vol: 0.004 }, { drift: 0.001, vol: 0.004 }, // small bullish rejection
  ],
  [
    { drift: 0.004, vol: 0.005 }, { drift: 0.006, vol: 0.006 },
    { drift: 0.008, vol: 0.007 }, { drift: 0.005, vol: 0.005 },
    { drift: 0.007, vol: 0.006 }, { drift: 0.003, vol: 0.005 },
    { drift: 0.009, vol: 0.007 }, { drift: -0.002, vol: 0.005 },
    { drift: 0.006, vol: 0.006 }, { drift: 0.004, vol: 0.005 },
    { drift: 0.005, vol: 0.005 }, { drift: 0.003, vol: 0.005 },
  ],
  1717200000,
  H6,
  404
);

// 8) High leverage trap — BTC, 1h. Coiled range right under resistance, then violent wick down.
const leverageTrap = buildSeries(
  61400,
  [
    { drift: 0.001, vol: 0.003 }, { drift: -0.001, vol: 0.003 },
    { drift: 0.0008, vol: 0.003 }, { drift: -0.0005, vol: 0.003 },
    { drift: 0.001, vol: 0.003 }, { drift: 0.0005, vol: 0.003 },
    { drift: -0.0008, vol: 0.003 }, { drift: 0.001, vol: 0.003 },
    { drift: 0.0008, vol: 0.003 }, { drift: -0.0005, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.001, vol: 0.003 },
    { drift: -0.0008, vol: 0.003 }, { drift: 0.0005, vol: 0.003 },
    { drift: 0.001, vol: 0.003 }, { drift: 0.0008, vol: 0.003 },
    { drift: -0.0005, vol: 0.003 }, { drift: 0.001, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.0008, vol: 0.003 },
    { drift: 0.001, vol: 0.003 }, { drift: 0.0005, vol: 0.003 },
    { drift: 0.0008, vol: 0.003 }, { drift: 0.0008, vol: 0.003 },
  ],
  [
    { drift: -0.004, vol: 0.012 }, // sudden wide-range down (wick sweeps liq)
    { drift: -0.018, vol: 0.025 }, { drift: 0.012, vol: 0.020 },
    { drift: 0.006, vol: 0.010 }, { drift: 0.004, vol: 0.006 },
    { drift: 0.003, vol: 0.005 }, { drift: 0.005, vol: 0.006 },
    { drift: 0.002, vol: 0.005 }, { drift: 0.004, vol: 0.006 },
    { drift: 0.003, vol: 0.005 }, { drift: 0.002, vol: 0.005 },
    { drift: 0.004, vol: 0.005 },
  ],
  1717200000,
  H1,
  505
);

// 9) News volatility — BTC, 4h. Calm range, then explosive wide-range bars.
const news = buildSeries(
  64500,
  [
    { drift: 0.001, vol: 0.004 }, { drift: -0.0008, vol: 0.004 },
    { drift: 0.0005, vol: 0.004 }, { drift: -0.0005, vol: 0.004 },
    { drift: 0.0008, vol: 0.004 }, { drift: -0.001, vol: 0.004 },
    { drift: 0.0005, vol: 0.004 }, { drift: 0.001, vol: 0.004 },
    { drift: -0.0005, vol: 0.004 }, { drift: 0.0008, vol: 0.004 },
    { drift: -0.0008, vol: 0.004 }, { drift: 0.001, vol: 0.004 },
    { drift: 0.0005, vol: 0.004 }, { drift: -0.0005, vol: 0.004 },
    { drift: 0.0008, vol: 0.004 }, { drift: -0.001, vol: 0.004 },
    { drift: 0.0005, vol: 0.004 }, { drift: 0.0008, vol: 0.004 },
    { drift: -0.0008, vol: 0.004 }, { drift: 0.001, vol: 0.004 },
    { drift: -0.025, vol: 0.030 }, // news dump
    { drift: 0.028, vol: 0.035 }, // news rip
    { drift: -0.018, vol: 0.025 }, { drift: 0.015, vol: 0.022 },
  ],
  [
    { drift: -0.020, vol: 0.025 }, { drift: 0.022, vol: 0.030 },
    { drift: -0.012, vol: 0.018 }, { drift: 0.008, vol: 0.012 },
    { drift: 0.005, vol: 0.010 }, { drift: 0.003, vol: 0.008 },
    { drift: 0.002, vol: 0.006 }, { drift: 0.004, vol: 0.007 },
    { drift: 0.001, vol: 0.005 }, { drift: 0.003, vol: 0.006 },
    { drift: 0.002, vol: 0.005 }, { drift: 0.003, vol: 0.005 },
  ],
  1717200000,
  H4,
  606
);

// 10) No clear setup — ETH, 1h. Tight directionless chop.
const noSetup = buildSeries(
  3210,
  [
    { drift: 0.0008, vol: 0.003 }, { drift: -0.0005, vol: 0.003 },
    { drift: 0.0003, vol: 0.003 }, { drift: -0.0008, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.0003, vol: 0.003 },
    { drift: -0.0005, vol: 0.003 }, { drift: 0.0008, vol: 0.003 },
    { drift: -0.0003, vol: 0.003 }, { drift: -0.0005, vol: 0.003 },
    { drift: 0.0008, vol: 0.003 }, { drift: -0.0003, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: -0.0005, vol: 0.003 },
    { drift: 0.0003, vol: 0.003 }, { drift: -0.0008, vol: 0.003 },
    { drift: 0.0005, vol: 0.003 }, { drift: 0.0003, vol: 0.003 },
    { drift: -0.0005, vol: 0.003 }, { drift: 0.0008, vol: 0.003 },
    { drift: -0.0003, vol: 0.003 }, { drift: 0.0005, vol: 0.003 },
    { drift: -0.0005, vol: 0.003 }, { drift: 0.0003, vol: 0.003 },
  ],
  [
    { drift: 0.0005, vol: 0.003 }, { drift: -0.0008, vol: 0.003 },
    { drift: 0.0003, vol: 0.003 }, { drift: 0.0005, vol: 0.003 },
    { drift: -0.0005, vol: 0.003 }, { drift: -0.0003, vol: 0.003 },
    { drift: 0.0008, vol: 0.003 }, { drift: -0.0005, vol: 0.003 },
    { drift: 0.0003, vol: 0.003 }, { drift: 0.0005, vol: 0.003 },
    { drift: -0.0003, vol: 0.003 }, { drift: 0.0008, vol: 0.003 },
  ],
  1717200000,
  H1,
  707
);

const visible_uptrend: Candle[] = [
  { time: 1725235200, open: 57291.21, high: 57981.74, low: 57119.01, close: 57777.84, volume: 1110.76 },
  { time: 1725256800, open: 57779.32, high: 58669.03, low: 57356.31, close: 58419.93, volume: 1021.42 },
  { time: 1725278400, open: 58415.33, high: 58825.39, low: 58095.10, close: 58518.42, volume: 956.21 },
  { time: 1725300000, open: 58514.77, high: 59423.00, low: 58313.42, close: 59139.83, volume: 1230.26 },
  { time: 1725321600, open: 59138.89, high: 59825.70, low: 58984.78, close: 59181.43, volume: 1029.25 },
  { time: 1725343200, open: 59187.66, high: 59191.18, low: 58700.00, close: 59059.89, volume: 499.93 },
  { time: 1725364800, open: 59059.88, high: 59359.16, low: 57540.25, close: 57677.86, volume: 4812.26 },
  { time: 1725386400, open: 57678.40, high: 58240.00, low: 57394.49, close: 57468.84, volume: 1923.01 },
  { time: 1725408000, open: 57460.50, high: 57935.24, low: 55555.00, close: 56226.49, volume: 3361.07 },
  { time: 1725429600, open: 56225.81, high: 56897.10, low: 56210.43, close: 56562.28, volume: 1382.16 },
  { time: 1725451200, open: 56559.30, high: 58531.25, low: 56149.15, close: 57875.12, volume: 7014.06 },
  { time: 1725472800, open: 57875.12, high: 58382.00, low: 57634.06, close: 57971.00, volume: 1957.89 },
  { time: 1725494400, open: 57971.00, high: 58326.12, low: 56904.56, close: 57189.80, volume: 1577.20 },
  { time: 1725516000, open: 57189.46, high: 57238.01, low: 56536.64, close: 56676.68, volume: 1497.83 },
  { time: 1725537600, open: 56676.67, high: 57300.00, low: 55786.51, close: 56589.78, volume: 6658.95 },
  { time: 1725559200, open: 56589.75, high: 56708.61, low: 55628.04, close: 56156.82, volume: 2547.59 },
  { time: 1725580800, open: 56156.82, high: 56844.01, low: 55964.04, close: 56481.10, volume: 796.29 },
  { time: 1725602400, open: 56477.35, high: 56498.47, low: 55262.51, close: 55987.70, volume: 1366.12 },
  { time: 1725624000, open: 55986.40, high: 56995.00, low: 53601.93, close: 53888.40, volume: 10234.29 },
  { time: 1725645600, open: 53888.40, high: 53966.51, low: 52530.00, close: 53950.01, volume: 6098.75 },
  { time: 1725667200, open: 53950.00, high: 54374.99, low: 53733.10, close: 54170.74, volume: 825.32 },
  { time: 1725688800, open: 54170.74, high: 54497.58, low: 54028.79, close: 54327.26, volume: 725.31 },
  { time: 1725710400, open: 54327.26, high: 54847.00, low: 53987.03, close: 54134.27, volume: 984.19 },
  { time: 1725732000, open: 54128.38, high: 54470.01, low: 53814.50, close: 54156.33, volume: 749.76 },
  { time: 1725753600, open: 54159.60, high: 54573.69, low: 53958.05, close: 54334.92, volume: 501.32 },
  { time: 1725775200, open: 54334.92, high: 54719.73, low: 54251.00, close: 54563.20, volume: 368.55 },
  { time: 1725796800, open: 54563.66, high: 54577.39, low: 53623.95, close: 54504.35, volume: 1170.39 },
  { time: 1725818400, open: 54494.52, high: 55315.95, low: 54180.02, close: 54881.11, volume: 1644.62 },
  { time: 1725840000, open: 54881.10, high: 55378.70, low: 54565.56, close: 54664.63, volume: 1538.77 },
  { time: 1725861600, open: 54664.63, high: 55554.66, low: 54632.87, close: 55269.82, volume: 946.51 },
  { time: 1725883200, open: 55269.82, high: 56791.32, low: 54804.35, close: 56531.64, volume: 4113.86 },
  { time: 1725904800, open: 56533.43, high: 58119.97, low: 56267.87, close: 57053.90, volume: 3603.89 },
  { time: 1725926400, open: 57047.82, high: 57081.77, low: 56377.76, close: 56945.83, volume: 960.24 },
  { time: 1725948000, open: 56942.27, high: 57395.27, low: 56770.01, close: 57227.60, volume: 863.73 },
  { time: 1725969600, open: 57223.10, high: 57464.20, low: 56510.12, close: 57174.70, volume: 2454.70 },
  { time: 1725991200, open: 57174.71, high: 58050.35, low: 57174.71, close: 57645.59, volume: 2154.54 },
  { time: 1726012800, open: 57641.15, high: 57762.58, low: 56091.36, close: 56243.23, volume: 2195.53 },
  { time: 1726034400, open: 56238.08, high: 56876.80, low: 56164.66, close: 56796.66, volume: 991.98 },
  { time: 1726056000, open: 56796.67, high: 57900.00, low: 55534.41, close: 57709.84, volume: 5967.67 },
  { time: 1726077600, open: 57709.84, high: 58014.35, low: 57222.55, close: 57352.79, volume: 2523.76 },
  { time: 1726099200, open: 57352.92, high: 58487.06, low: 57333.37, close: 57988.17, volume: 1924.44 },
  { time: 1726120800, open: 57984.61, high: 58369.41, low: 57850.71, close: 58061.77, volume: 1348.21 },
  { time: 1726142400, open: 58061.77, high: 58600.00, low: 57311.15, close: 58395.40, volume: 4740.61 },
  { time: 1726164000, open: 58399.26, high: 58469.57, low: 57763.81, close: 58137.54, volume: 2162.37 },
  { time: 1726185600, open: 58137.33, high: 58254.88, low: 57824.03, close: 57940.70, volume: 825.33 },
  { time: 1726207200, open: 57940.70, high: 58354.54, low: 57740.09, close: 57883.78, volume: 1059.38 },
  { time: 1726228800, open: 57883.72, high: 59997.00, low: 57630.01, close: 59608.50, volume: 5405.54 },
  { time: 1726250400, open: 59610.65, high: 60670.00, low: 59500.00, close: 60543.35, volume: 4645.71 },
  { time: 1726272000, open: 60543.35, high: 60660.00, low: 59945.74, close: 59954.74, volume: 958.89 },
  { time: 1726293600, open: 59954.74, high: 60200.00, low: 59603.11, close: 59733.04, volume: 613.41 },
  { time: 1726315200, open: 59732.91, high: 60035.28, low: 59651.69, close: 59906.40, volume: 645.93 },
  { time: 1726336800, open: 59901.82, high: 60143.89, low: 59436.80, close: 60012.35, volume: 929.16 },
  { time: 1726358400, open: 60012.34, high: 60304.06, low: 60009.38, close: 60168.16, volume: 1014.73 },
];

const hidden_uptrend: Candle[] = [
  { time: 1726380000, open: 60168.16, high: 60231.99, low: 59884.01, close: 60016.01, volume: 233.69 },
  { time: 1726401600, open: 60016.01, high: 60402.34, low: 59718.46, close: 59830.63, volume: 1021.73 },
  { time: 1726423200, open: 59830.62, high: 60194.40, low: 58695.75, close: 59122.33, volume: 1705.20 },
  { time: 1726444800, open: 59122.70, high: 59214.15, low: 58104.92, close: 58667.83, volume: 1606.07 },
  { time: 1726466400, open: 58667.82, high: 59168.82, low: 58490.98, close: 58656.45, volume: 736.06 },
  { time: 1726488000, open: 58656.45, high: 58783.48, low: 57477.00, close: 58155.76, volume: 3002.41 },
  { time: 1726509600, open: 58155.75, high: 58410.58, low: 57588.00, close: 58208.75, volume: 2309.57 },
  { time: 1726531200, open: 58209.76, high: 58777.00, low: 57620.27, close: 58646.31, volume: 1263.89 },
  { time: 1726552800, open: 58641.08, high: 59303.80, low: 58433.42, close: 59090.40, volume: 1047.21 },
  { time: 1726574400, open: 59090.40, high: 61373.41, low: 58877.89, close: 60969.03, volume: 6188.12 },
  { time: 1726596000, open: 60968.06, high: 61095.57, low: 59626.40, close: 60312.60, volume: 3202.67 },
  { time: 1726617600, open: 60317.38, high: 60777.57, low: 59878.02, close: 60238.58, volume: 1172.89 },
  { time: 1726639200, open: 60238.67, high: 60545.63, low: 59382.17, close: 59848.50, volume: 940.04 },
  { time: 1726660800, open: 59848.50, high: 60254.71, low: 59174.50, close: 60024.62, volume: 2537.07 },
  { time: 1726682400, open: 60022.00, high: 61800.00, low: 59479.11, close: 61769.18, volume: 6821.50 },
  { time: 1726704000, open: 61770.38, high: 62600.00, low: 61569.16, close: 62014.93, volume: 3367.78 },
  { time: 1726725600, open: 62015.00, high: 62736.62, low: 61826.97, close: 62661.24, volume: 2279.26 },
  { time: 1726747200, open: 62661.23, high: 63891.82, low: 62602.33, close: 63742.72, volume: 5868.78 },
  { time: 1726768800, open: 63742.71, high: 63813.52, low: 62656.30, close: 62960.14, volume: 3560.05 },
  { time: 1726790400, open: 62956.04, high: 64140.67, low: 62618.43, close: 63813.74, volume: 2111.36 },
];

const visible_breakout: Candle[] = [
  { time: 1709337600, open: 62439.74, high: 62500.00, low: 61818.89, close: 62081.22, volume: 2502.04 },
  { time: 1709359200, open: 62084.10, high: 62338.77, low: 61718.91, close: 61914.98, volume: 1325.68 },
  { time: 1709380800, open: 61914.48, high: 62240.03, low: 61623.39, close: 61829.86, volume: 1665.46 },
  { time: 1709402400, open: 61829.92, high: 62266.92, low: 61757.69, close: 62045.78, volume: 1389.20 },
  { time: 1709424000, open: 62045.78, high: 62143.66, low: 61675.19, close: 61927.52, volume: 1239.52 },
  { time: 1709445600, open: 61927.52, high: 62085.87, low: 61388.00, close: 61870.72, volume: 1492.00 },
  { time: 1709467200, open: 61869.66, high: 63035.85, low: 61852.00, close: 62606.77, volume: 2610.86 },
  { time: 1709488800, open: 62610.77, high: 63260.00, low: 62607.79, close: 63154.49, volume: 1971.79 },
  { time: 1709510400, open: 63155.74, high: 64300.00, low: 62300.00, close: 63397.59, volume: 5620.89 },
  { time: 1709532000, open: 63394.90, high: 65614.97, low: 63360.00, close: 65272.25, volume: 6305.57 },
  { time: 1709553600, open: 65266.43, high: 67611.00, low: 64635.13, close: 66945.00, volume: 12278.37 },
  { time: 1709575200, open: 66951.91, high: 68602.98, low: 66188.00, close: 68360.14, volume: 16395.54 },
  { time: 1709596800, open: 68356.70, high: 68849.84, low: 65128.00, close: 66990.58, volume: 9161.02 },
  { time: 1709618400, open: 66996.72, high: 67538.95, low: 65572.87, close: 66701.69, volume: 5582.68 },
  { time: 1709640000, open: 66701.75, high: 69324.58, low: 63300.00, close: 65606.63, volume: 21684.95 },
  { time: 1709661600, open: 65606.48, high: 65611.53, low: 59224.68, close: 63800.78, volume: 29146.44 },
  { time: 1709683200, open: 63802.15, high: 66456.29, low: 62832.39, close: 66442.11, volume: 6708.18 },
  { time: 1709704800, open: 66450.34, high: 67654.06, low: 65523.08, close: 67312.80, volume: 6716.20 },
  { time: 1709726400, open: 67304.90, high: 67603.74, low: 64700.00, close: 67437.83, volume: 13136.50 },
  { time: 1709748000, open: 67437.89, high: 67602.06, low: 65762.09, close: 66122.28, volume: 8095.11 },
  { time: 1709769600, open: 66115.48, high: 66525.99, low: 65599.63, close: 65870.34, volume: 3947.24 },
  { time: 1709791200, open: 65867.04, high: 67314.19, low: 65733.33, close: 66950.00, volume: 2792.75 },
  { time: 1709812800, open: 66950.00, high: 68098.09, low: 66629.72, close: 67689.06, volume: 8240.76 },
  { time: 1709834400, open: 67689.06, high: 68089.49, low: 66925.00, close: 66938.21, volume: 7247.62 },
  { time: 1709856000, open: 66938.21, high: 67358.89, low: 66855.86, close: 66988.71, volume: 1934.75 },
  { time: 1709877600, open: 66988.71, high: 67838.04, low: 66917.40, close: 67817.99, volume: 3218.97 },
  { time: 1709899200, open: 67821.38, high: 70199.00, low: 66157.09, close: 68462.05, volume: 17748.43 },
  { time: 1709920800, open: 68454.08, high: 69560.00, low: 68050.01, close: 68289.16, volume: 10847.38 },
  { time: 1709942400, open: 68289.16, high: 68499.36, low: 68047.62, close: 68402.35, volume: 2375.61 },
  { time: 1709964000, open: 68402.98, high: 68700.41, low: 68109.16, close: 68453.58, volume: 2236.52 },
  { time: 1709985600, open: 68453.45, high: 68687.94, low: 68163.94, close: 68313.06, volume: 2448.71 },
  { time: 1710007200, open: 68316.00, high: 68598.37, low: 68277.28, close: 68480.00, volume: 1944.67 },
  { time: 1710028800, open: 68480.01, high: 69790.45, low: 68367.30, close: 69469.88, volume: 3688.20 },
  { time: 1710050400, open: 69472.70, high: 70000.00, low: 69189.51, close: 69706.81, volume: 3058.01 },
  { time: 1710072000, open: 69706.81, high: 69978.29, low: 68816.00, close: 69555.88, volume: 2663.75 },
  { time: 1710093600, open: 69554.09, high: 69615.06, low: 68221.13, close: 69032.12, volume: 2753.10 },
  { time: 1710115200, open: 69032.80, high: 69038.70, low: 67112.21, close: 68583.16, volume: 3623.84 },
  { time: 1710136800, open: 68584.84, high: 72303.04, low: 68483.51, close: 71551.70, volume: 8800.45 },
  { time: 1710158400, open: 71551.85, high: 72764.36, low: 71350.55, close: 72569.01, volume: 11803.06 },
  { time: 1710180000, open: 72569.02, high: 72943.98, low: 71810.14, close: 72110.98, volume: 8105.37 },
  { time: 1710201600, open: 72110.98, high: 72505.10, low: 71324.02, close: 71988.94, volume: 3518.58 },
  { time: 1710223200, open: 71983.49, high: 72375.33, low: 71432.68, close: 72050.43, volume: 2599.45 },
  { time: 1710244800, open: 72044.26, high: 73027.63, low: 68603.00, close: 71091.30, volume: 14936.58 },
  { time: 1710266400, open: 71086.82, high: 71709.07, low: 70351.07, close: 71475.93, volume: 8365.59 },
  { time: 1710288000, open: 71473.43, high: 72244.53, low: 71337.30, close: 72193.07, volume: 2692.24 },
  { time: 1710309600, open: 72195.33, high: 73709.99, low: 72138.43, close: 73104.78, volume: 4203.58 },
  { time: 1710331200, open: 73106.57, high: 73291.05, low: 71700.00, close: 72913.58, volume: 7781.30 },
  { time: 1710352800, open: 72916.97, high: 73549.48, low: 72811.00, close: 73135.04, volume: 6778.80 },
  { time: 1710374400, open: 73135.04, high: 73732.64, low: 72530.01, close: 73209.94, volume: 3133.16 },
  { time: 1710396000, open: 73209.94, high: 73835.57, low: 72664.21, close: 72925.89, volume: 3341.22 },
  { time: 1710417600, open: 72926.37, high: 73096.88, low: 69813.74, close: 71000.92, volume: 12774.11 },
];

const hidden_breakout: Candle[] = [
  { time: 1710439200, open: 71000.43, high: 71706.81, low: 68454.47, close: 71364.58, volume: 14978.11 },
  { time: 1710460800, open: 71364.58, high: 72414.96, low: 66729.59, close: 67403.83, volume: 13041.78 },
  { time: 1710482400, open: 67401.03, high: 68811.82, low: 65565.70, close: 67691.99, volume: 9044.51 },
  { time: 1710504000, open: 67687.52, high: 68731.93, low: 67379.08, close: 68216.56, volume: 8142.92 },
  { time: 1710525600, open: 68216.56, high: 70647.85, low: 67423.23, close: 69506.88, volume: 9966.63 },
  { time: 1710547200, open: 69514.87, high: 70050.00, low: 68589.24, close: 68967.65, volume: 2900.84 },
  { time: 1710568800, open: 68967.65, high: 69443.79, low: 67722.32, close: 68257.90, volume: 2204.75 },
  { time: 1710590400, open: 68255.81, high: 68480.64, low: 67124.06, close: 67264.54, volume: 3358.48 },
  { time: 1710612000, open: 67286.85, high: 67664.96, low: 64774.05, close: 65254.22, volume: 8068.75 },
  { time: 1710633600, open: 65254.22, high: 66545.00, low: 65050.02, close: 66203.90, volume: 3067.02 },
  { time: 1710655200, open: 66203.90, high: 67429.36, low: 64505.00, close: 66881.99, volume: 3885.11 },
  { time: 1710676800, open: 66881.82, high: 68626.39, low: 66347.62, close: 68482.54, volume: 3213.95 },
  { time: 1710698400, open: 68487.98, high: 68877.82, low: 67915.46, close: 68343.64, volume: 2465.77 },
  { time: 1710720000, open: 68354.29, high: 68933.71, low: 66754.64, close: 68656.55, volume: 3088.76 },
  { time: 1710741600, open: 68653.15, high: 68684.86, low: 67280.31, close: 68209.03, volume: 2131.23 },
  { time: 1710763200, open: 68200.52, high: 68576.57, low: 66562.65, close: 67377.06, volume: 8367.03 },
  { time: 1710784800, open: 67377.06, high: 67999.00, low: 66871.00, close: 67613.04, volume: 6470.36 },
  { time: 1710806400, open: 67609.39, high: 68136.39, low: 64600.00, close: 65188.92, volume: 7058.78 },
  { time: 1710828000, open: 65181.10, high: 65421.59, low: 62438.61, close: 63045.73, volume: 9775.87 },
  { time: 1710849600, open: 63044.70, high: 65769.87, low: 62312.59, close: 64855.06, volume: 13598.58 },
  { time: 1710871200, open: 64846.35, high: 65333.99, low: 61506.00, close: 61906.27, volume: 9678.75 },
  { time: 1710892800, open: 61902.57, high: 63408.20, low: 60771.14, close: 61521.96, volume: 9029.46 },
];

const visible_chop: Candle[] = [
  { time: 1727827200, open: 60792.63, high: 61873.26, low: 60711.09, close: 61477.53, volume: 1051.94 },
  { time: 1727848800, open: 61478.50, high: 61928.53, low: 60882.22, close: 61154.70, volume: 850.92 },
  { time: 1727870400, open: 61154.71, high: 62380.34, low: 60518.78, close: 61619.14, volume: 3325.07 },
  { time: 1727892000, open: 61611.90, high: 61699.25, low: 59969.20, close: 60631.37, volume: 3536.10 },
  { time: 1727913600, open: 60631.36, high: 61474.92, low: 60515.73, close: 61167.83, volume: 1100.74 },
  { time: 1727935200, open: 61167.83, high: 61425.34, low: 60115.96, close: 60750.17, volume: 862.43 },
  { time: 1727956800, open: 60750.16, high: 60892.30, low: 59824.87, close: 60613.51, volume: 4004.77 },
  { time: 1727978400, open: 60613.51, high: 61101.00, low: 60523.76, close: 60744.99, volume: 1866.62 },
  { time: 1728000000, open: 60745.00, high: 61275.72, low: 60454.50, close: 61219.56, volume: 1038.37 },
  { time: 1728021600, open: 61221.73, high: 61641.18, low: 61060.41, close: 61429.57, volume: 957.91 },
  { time: 1728043200, open: 61429.72, high: 62348.87, low: 60775.03, close: 61983.80, volume: 4223.16 },
  { time: 1728064800, open: 61983.86, high: 62481.00, low: 61898.71, close: 62090.71, volume: 1664.78 },
  { time: 1728086400, open: 62090.70, high: 62200.00, low: 61686.34, close: 62138.07, volume: 535.44 },
  { time: 1728108000, open: 62138.06, high: 62323.10, low: 62059.35, close: 62179.01, volume: 264.24 },
  { time: 1728129600, open: 62179.01, high: 62380.04, low: 61832.76, close: 62011.35, volume: 548.54 },
  { time: 1728151200, open: 62011.35, high: 62100.00, low: 61689.45, close: 62051.29, volume: 435.35 },
  { time: 1728172800, open: 62051.29, high: 62147.35, low: 61805.85, close: 61934.60, volume: 312.18 },
  { time: 1728194400, open: 61934.59, high: 62158.44, low: 61883.31, close: 62094.72, volume: 157.96 },
  { time: 1728216000, open: 62094.72, high: 62916.15, low: 62050.84, close: 62579.08, volume: 823.53 },
  { time: 1728237600, open: 62581.41, high: 62978.75, low: 62300.00, close: 62810.86, volume: 792.55 },
  { time: 1728259200, open: 62810.93, high: 63975.37, low: 62645.15, close: 63377.50, volume: 1599.73 },
  { time: 1728280800, open: 63377.50, high: 63721.02, low: 62620.91, close: 63114.99, volume: 980.16 },
  { time: 1728302400, open: 63114.99, high: 64467.02, low: 62800.00, close: 63808.35, volume: 4659.24 },
  { time: 1728324000, open: 63808.34, high: 63813.40, low: 62113.28, close: 62200.28, volume: 3468.02 },
  { time: 1728345600, open: 62203.82, high: 62811.25, low: 62139.43, close: 62486.70, volume: 887.73 },
  { time: 1728367200, open: 62491.54, high: 62642.79, low: 61976.74, close: 62597.18, volume: 659.32 },
  { time: 1728388800, open: 62597.19, high: 63191.05, low: 61850.00, close: 62359.69, volume: 2869.13 },
  { time: 1728410400, open: 62357.65, high: 62528.27, low: 61824.48, close: 62122.02, volume: 2150.15 },
  { time: 1728432000, open: 62118.44, high: 62507.68, low: 61964.88, close: 62489.62, volume: 654.59 },
  { time: 1728453600, open: 62489.62, high: 62504.32, low: 62005.00, close: 62149.18, volume: 530.48 },
  { time: 1728475200, open: 62149.17, high: 62365.99, low: 61571.34, close: 61699.85, volume: 2355.35 },
  { time: 1728496800, open: 61699.86, high: 61779.58, low: 60255.00, close: 60578.28, volume: 4041.95 },
  { time: 1728518400, open: 60578.28, high: 60985.44, low: 60305.35, close: 60873.74, volume: 1191.61 },
  { time: 1728540000, open: 60873.74, high: 61239.92, low: 60562.50, close: 61181.57, volume: 969.13 },
  { time: 1728561600, open: 61181.59, high: 61271.59, low: 59477.72, close: 59525.95, volume: 3990.50 },
  { time: 1728583200, open: 59525.95, high: 60283.96, low: 58863.90, close: 60279.53, volume: 4311.35 },
  { time: 1728604800, open: 60279.53, high: 60722.61, low: 60029.98, close: 60551.99, volume: 1296.17 },
  { time: 1728626400, open: 60548.94, high: 61226.57, low: 60548.69, close: 61135.59, volume: 1238.63 },
  { time: 1728648000, open: 61134.85, high: 62947.99, low: 61083.66, close: 62916.76, volume: 5339.91 },
  { time: 1728669600, open: 62915.28, high: 63416.70, low: 62329.83, close: 62518.75, volume: 3580.28 },
  { time: 1728691200, open: 62518.75, high: 63063.58, low: 62464.15, close: 62755.72, volume: 777.50 },
  { time: 1728712800, open: 62757.25, high: 63242.32, low: 62620.39, close: 62920.03, volume: 481.99 },
  { time: 1728734400, open: 62920.02, high: 63474.25, low: 62803.47, close: 63091.87, volume: 2120.82 },
  { time: 1728756000, open: 63091.88, high: 63354.42, low: 62895.03, close: 63187.47, volume: 563.60 },
  { time: 1728777600, open: 63183.08, high: 63270.18, low: 62636.59, close: 62837.81, volume: 449.68 },
  { time: 1728799200, open: 62834.57, high: 62979.38, low: 62500.00, close: 62540.53, volume: 241.99 },
  { time: 1728820800, open: 62528.40, high: 62864.18, low: 62033.00, close: 62500.65, volume: 846.63 },
];

const hidden_chop: Candle[] = [
  { time: 1728842400, open: 62500.64, high: 63106.69, low: 62290.77, close: 62845.30, volume: 719.31 },
  { time: 1728864000, open: 62847.89, high: 64494.28, low: 62426.67, close: 63901.23, volume: 1775.20 },
  { time: 1728885600, open: 63900.14, high: 65105.01, low: 63760.23, close: 64875.85, volume: 2016.76 },
  { time: 1728907200, open: 64872.55, high: 66296.00, low: 64628.96, close: 65607.44, volume: 6894.49 },
  { time: 1728928800, open: 65607.45, high: 66500.00, low: 65540.00, close: 66065.65, volume: 2952.26 },
  { time: 1728950400, open: 66065.64, high: 66317.38, low: 65186.29, close: 65333.85, volume: 1092.42 },
  { time: 1728972000, open: 65331.21, high: 65818.59, low: 65250.00, close: 65378.21, volume: 1221.35 },
  { time: 1728993600, open: 65383.02, high: 67944.76, low: 64778.44, close: 66802.52, volume: 9455.04 },
  { time: 1729015200, open: 66802.52, high: 67383.76, low: 66108.01, close: 67056.60, volume: 4555.20 },
  { time: 1729036800, open: 67056.62, high: 67560.76, low: 66743.00, close: 67211.54, volume: 1970.56 },
  { time: 1729058400, open: 67214.82, high: 68399.00, low: 66769.86, close: 67880.20, volume: 3133.27 },
  { time: 1729080000, open: 67883.35, high: 68300.00, low: 67106.20, close: 67932.30, volume: 4952.29 },
  { time: 1729101600, open: 67932.30, high: 68061.45, low: 67468.11, close: 67608.44, volume: 2409.63 },
  { time: 1729123200, open: 67608.45, high: 67926.99, low: 67220.41, close: 67325.92, volume: 1519.01 },
  { time: 1729144800, open: 67325.43, high: 67503.79, low: 66783.50, close: 66837.13, volume: 1421.17 },
  { time: 1729166400, open: 66837.13, high: 67657.09, low: 66629.97, close: 67273.30, volume: 3359.20 },
  { time: 1729188000, open: 67276.87, high: 67450.00, low: 66684.79, close: 67402.33, volume: 1612.84 },
  { time: 1729209600, open: 67399.86, high: 68222.71, low: 67149.24, close: 67980.35, volume: 1666.51 },
  { time: 1729231200, open: 67980.35, high: 68352.83, low: 67648.54, close: 67676.26, volume: 1353.24 },
  { time: 1729252800, open: 67676.25, high: 68919.98, low: 67615.75, close: 68722.28, volume: 5906.35 },
  { time: 1729274400, open: 68722.27, high: 69000.62, low: 68190.98, close: 68426.11, volume: 2876.64 },
  { time: 1729296000, open: 68426.11, high: 68689.29, low: 68231.90, close: 68377.54, volume: 701.51 },
  { time: 1729317600, open: 68377.55, high: 68467.98, low: 68067.27, close: 68077.57, volume: 288.96 },
  { time: 1729339200, open: 68077.51, high: 68350.09, low: 68005.83, close: 68120.16, volume: 506.60 },
  { time: 1729360800, open: 68120.15, high: 68414.95, low: 68088.63, close: 68363.73, volume: 371.80 },
  { time: 1729382400, open: 68363.73, high: 68433.80, low: 68083.18, close: 68202.69, volume: 446.81 },
];

// v5.12.0 — RAW_SCENARIOS is the authored list. SCENARIOS (exported below)
// post-processes it through withDerivedManagement so every scenario whose
// ideal trade runs in profit gains trade-management prompts, while the three
// hand-authored ones keep theirs untouched.
const RAW_SCENARIOS: Scenario[] = [
  // Factory smoke test (v1.7.1): identical output to the legacy hand-written form,
  // plus the new dataSource: "real" marker.
  buildRealScenario({
    id: "uptrend-pullback-2024-09",
    title: "Trend continuation: pullback recovery",
    symbol: "BTC/USD",
    timeframe: "6h",
    difficulty: "medium",
    setupType: "trend_continuation",
    candles: [...visible_uptrend, ...hidden_uptrend],
    visibleCount: visible_uptrend.length,
    keyLevels: [
      { price: 60500, label: "near-term resistance" },
      { price: 58000, label: "pullback support" },
      { price: 53600, label: "swing low" },
    ],
    preferredDecision: "long",
    marketContext:
      "Higher lows over the past two weeks. Price reclaimed a prior support after a sharp flush and is testing a level that capped earlier attempts.",
    neutralScenarioNotes:
      "BTC/USD on the 6h timeframe. Price ran from $57k down to a $53.6k low, then climbed back to ~$60k. Recent lows have been getting higher. Current price is right at a level that capped previous attempts.",
    learningFocus:
      "Trend continuation entries: pulling back to a level inside an uptrend is the cleanest place to risk a position with defined invalidation.",
    outcome: {
      description:
        "Price chopped around the level for a few candles then broke out and ran into the mid-$63k area before resting.",
      takeaway:
        "A reasonable long with a stop beyond $58k would have been paid. A stop right at $60k would have been swept in the chop first.",
    },
    lessonRecommendation: "entry_timing",
    context: {
      trend: "up",
      support: [58000, 53600],
      resistance: [60500],
      currentPrice: 60168.16,
      bestDirection: "long",
      notes:
        "BTC/USD on the 6h timeframe. Price ran from $57k down to a $53.6k low ten days ago, then climbed back to $60k. Recent lows have been getting higher. Current price is right at a level that capped previous attempts. The chart shows roughly two weeks of price action ending at the decision point.",
    },
  }),
  {
    id: "failed-breakout-2024-03",
    title: "Fresh ATH: trust it or fade it?",
    symbol: "BTC/USD",
    timeframe: "6h",
    difficulty: "hard",
    setupType: "failed_breakout",
    marketContext:
      "BTC tagged a fresh all-time high on a wide-range bar that sold off into the close. There is no price history above this level, so reactions are unpredictable.",
    neutralScenarioNotes:
      "BTC/USD on the 6h timeframe. Over two weeks price ran from $62k to a new all-time high near $73.7k. The most recent candle is a wide-range bar that pushed to fresh highs and sold off into the close. No price history above this level.",
    learningFocus:
      "Breakouts on no-history levels: chasing the candle that prints the high usually means buying the wick. Waiting for a clean retest is the higher-probability play.",
    visibleCandles: visible_breakout,
    hiddenCandles: hidden_breakout,
    decisionPointIndex: visible_breakout.length - 1,
    keyLevels: [
      { price: 73700, label: "fresh ATH (wick)" },
      { price: 72500, label: "intraday resistance" },
      { price: 68000, label: "prior support" },
      { price: 65500, label: "swing structure" },
    ],
    preferredDecision: "wait",
    acceptableDecisions: ["wait"],
    outcome: {
      description:
        "Price failed to reclaim the highs and unwound sharply over the next several days, briefly losing $62k before stabilizing.",
      takeaway:
        "Chasing the ATH candle was the trap. Waiting for a retest or a clean lower-high rejection was the higher-quality decision.",
    },
    lessonRecommendation: "when_to_wait",
    context: {
      trend: "up",
      support: [68000, 65500],
      resistance: [73700, 72500],
      currentPrice: 71000.92,
      bestDirection: "wait",
      notes:
        "BTC/USD on the 6h timeframe. Over the last two weeks price ran from $62k to a new all-time high near $73.7k. The most recent candle is a wide-range bar that pushed to fresh highs and then sold off into the close. There is no price history above this level. Current price sits just under the high.",
    },
  },
  {
    id: "range-chop-2024-10",
    title: "Range chop: no edge in either direction",
    symbol: "BTC/USD",
    timeframe: "6h",
    difficulty: "easy",
    setupType: "range_chop",
    marketContext:
      "Two weeks of horizontal oscillation. Neither side has produced a break-and-hold and price sits in the middle of the range.",
    neutralScenarioNotes:
      "BTC/USD on the 6h timeframe. Price has oscillated between $59.5k and $64.5k for the last two weeks. Highs and lows are not clearly trending in either direction. Neither boundary has produced a sustained break-and-hold. Current price sits in the middle of the recent range.",
    learningFocus:
      "Recognizing range chop. The middle of a range is the worst place to take a directional bet — there's an opposing level a few percent away in either direction.",
    visibleCandles: visible_chop,
    hiddenCandles: hidden_chop,
    decisionPointIndex: visible_chop.length - 1,
    keyLevels: [
      { price: 64500, label: "range high" },
      { price: 60500, label: "mid support" },
      { price: 59500, label: "range low" },
    ],
    preferredDecision: "wait",
    acceptableDecisions: ["wait"],
    outcome: {
      description:
        "Price drifted higher inside the range over the next week, eventually breaking the range high cleanly several candles later.",
      takeaway:
        "Waiting was correct here. A long at the range high after a clean break would have been higher quality than a guess from the middle.",
    },
    lessonRecommendation: "when_to_wait",
    context: {
      trend: "range",
      support: [60500, 59500],
      resistance: [64500],
      currentPrice: 62500.65,
      bestDirection: "wait",
      notes:
        "BTC/USD on the 6h timeframe. Price has oscillated roughly between $59.5k and $64.5k for the last two weeks. Highs and lows are not clearly trending in either direction. Neither boundary has produced a sustained break-and-hold. Current price sits in the middle of the recent range.",
    },
  },
  // 4) Support breakdown
  (() => {
    const v = breakdown.visible;
    const h = breakdown.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "support-breakdown-eth",
      title: "Support breakdown on ETH",
      symbol: "ETH/USD",
      timeframe: "4h",
      difficulty: "hard",
      setupType: "support_breakdown" as SetupType,
      marketContext:
        "ETH has been losing lower highs and lower lows. The most recent candles closed decisively below a multi-week support that held three prior tests.",
      neutralScenarioNotes:
        "ETH/USD on the 4h timeframe. Price stair-stepped lower over the past several days. The most recent two candles closed firmly below a level that previously acted as support.",
      learningFocus:
        "Trend-aligned shorts after a level breaks. The cleanest short is the retest of broken support as new resistance — not chasing the candle that breaks it.",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [
        { price: 3100, label: "broken support" },
        { price: 3200, label: "prior consolidation" },
        { price: 2900, label: "next support" },
      ],
      preferredDecision: "short" as Direction,
      outcome: {
        description:
          "Price continued lower for the next several candles, briefly bouncing into the broken level before failing and extending the move.",
        takeaway:
          "A short on the retest of broken support paid. Chasing the breakdown candle still worked but at far worse R:R.",
      },
      lessonRecommendation: "entry_timing" as const,
      context: {
        trend: "down" as const,
        support: [2900],
        resistance: [3100, 3200],
        currentPrice: last,
        bestDirection: "short" as Direction,
        notes:
          "ETH/USD on the 4h timeframe. Price has been making lower highs and lower lows. The most recent two candles closed firmly below a level that previously acted as support.",
      },
    };
  })(),
  // 5) Overextended pump
  (() => {
    const v = overextended.visible;
    const h = overextended.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "overextended-pump-btc",
      title: "Overextended into a local high",
      symbol: "BTC/USD",
      timeframe: "1h",
      difficulty: "medium",
      setupType: "overextended" as SetupType,
      marketContext:
        "Eight consecutive green candles into a fresh local high. Momentum is slowing but price has not yet rejected.",
      neutralScenarioNotes:
        "BTC/USD on the 1h timeframe. Price has rallied for many consecutive candles into a fresh local high. The last few candles show shrinking bodies as momentum tapers off.",
      learningFocus:
        "Spotting exhaustion. A long this far from the last pullback has terrible R:R because the stop has to sit far below.",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [
        { price: last, label: "current local high" },
        { price: 60000, label: "nearest pullback area" },
        { price: 58200, label: "prior swing low" },
      ],
      preferredDecision: "wait" as Direction,
      acceptableDecisions: ["wait"],
      outcome: {
        description:
          "Price stalled then rolled over, giving back about half of the rally over the next half day.",
        takeaway:
          "Late longs got stopped on the rollover. Waiting for a pullback to confirm the next higher-low was the higher-quality choice.",
      },
      lessonRecommendation: "entry_timing" as const,
      context: {
        trend: "up" as const,
        support: [60000, 58200],
        resistance: [last],
        currentPrice: last,
        bestDirection: "wait" as Direction,
        notes:
          "BTC/USD on the 1h timeframe. Many consecutive green candles into a fresh local high. Momentum is slowing.",
      },
    };
  })(),
  // 6) Liquidity sweep
  (() => {
    const v = sweep.visible;
    const h = sweep.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "liquidity-sweep-sol",
      title: "Liquidity sweep below range support",
      symbol: "SOL/USD",
      timeframe: "4h",
      difficulty: "hard",
      setupType: "liquidity_sweep" as SetupType,
      marketContext:
        "SOL ranged for days. The most recent candle wicked sharply below range support and closed back inside the range — a classic stop sweep.",
      neutralScenarioNotes:
        "SOL/USD on the 4h timeframe. Price ranged for many candles. The most recent candle has a long lower wick that pierced below the range and closed back inside it.",
      learningFocus:
        "Sweep-and-reclaim setups. The sweep flushes stops and creates a clean invalidation: if price closes back below the sweep low, the thesis is wrong.",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [
        { price: 140, label: "range low (swept)" },
        { price: 155, label: "range high" },
        { price: 135, label: "sweep wick low" },
      ],
      preferredDecision: "long" as Direction,
      outcome: {
        description:
          "Price reclaimed mid-range and pushed steadily toward and beyond the range high over the next day.",
        takeaway:
          "A long with stop below the sweep wick was paid cleanly. Shorting the breakdown candle would have been stopped on the reclaim.",
      },
      lessonRecommendation: "stop_loss_invalidation" as const,
      context: {
        trend: "range" as const,
        support: [140, 135],
        resistance: [155],
        currentPrice: last,
        bestDirection: "long" as Direction,
        notes:
          "SOL/USD on the 4h timeframe. Multi-day range with a sweep below support that closed back inside the range.",
      },
    };
  })(),
  // 7) Clean retest
  (() => {
    const v = retest.visible;
    const h = retest.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "clean-retest-eth",
      title: "Clean retest of broken resistance",
      symbol: "ETH/USD",
      timeframe: "6h",
      difficulty: "easy",
      setupType: "clean_retest" as SetupType,
      marketContext:
        "ETH broke above a multi-week resistance several candles ago, then pulled back to the same level and is showing a small bullish rejection.",
      neutralScenarioNotes:
        "ETH/USD on the 6h timeframe. Price broke above a former resistance several candles back and has pulled back to that level. Recent candles show a small bullish rejection.",
      learningFocus:
        "Retest entries. Breakout-retest-continuation is one of the highest R:R setups because invalidation is tight and obvious.",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [
        { price: 3500, label: "broken resistance / new support" },
        { price: 3700, label: "next resistance" },
        { price: 3400, label: "invalidation if reclaimed" },
      ],
      preferredDecision: "long" as Direction,
      outcome: {
        description:
          "Price held the retest and continued higher over the next several candles, reaching the next resistance area.",
        takeaway:
          "Long on the rejection candle with a stop below the retest low was a high-quality decision regardless of how far the move extended.",
      },
      lessonRecommendation: "risk_reward_basics" as const,
      context: {
        trend: "up" as const,
        support: [3500, 3400],
        resistance: [3700],
        currentPrice: last,
        bestDirection: "long" as Direction,
        notes:
          "ETH/USD on the 6h timeframe. Broke resistance, pulled back to retest it as support, small bullish rejection.",
      },
    };
  })(),
  // 8) High leverage trap
  (() => {
    const v = leverageTrap.visible;
    const h = leverageTrap.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "leverage-trap-btc",
      title: "Tight coil just under resistance",
      symbol: "BTC/USD",
      timeframe: "1h",
      difficulty: "hard",
      setupType: "leverage_trap" as SetupType,
      marketContext:
        "BTC has coiled in a tiny range right under a major resistance for many hours. Volatility is compressing and a violent move is likely.",
      neutralScenarioNotes:
        "BTC/USD on the 1h timeframe. Price has compressed into a very tight range right beneath a clear resistance. Ranges this tight tend to release with a wide-range bar.",
      learningFocus:
        "Leverage discipline. A tight coil tempts high-leverage trades because the stop is small, but the next bar's wick is often wider than the entire coil — high leverage gets liquidated before the move resolves.",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [
        { price: last, label: "coil midpoint" },
        { price: 62000, label: "resistance" },
        { price: 60500, label: "first real support" },
      ],
      preferredDecision: "wait" as Direction,
      acceptableDecisions: ["wait", "long"],
      outcome: {
        description:
          "Price wicked sharply down out of the coil, briefly tagging $60k, then reversed and ground higher — liquidating high-leverage longs and shorts on the wick.",
        takeaway:
          "Anyone who waited or took a small, low-leverage position with a stop below the first support survived. High-leverage entries inside the coil were liquidated on the wick.",
      },
      lessonRecommendation: "leverage_liquidation" as const,
      context: {
        trend: "range" as const,
        support: [60500],
        resistance: [62000],
        currentPrice: last,
        bestDirection: "wait" as Direction,
        notes:
          "BTC/USD on the 1h timeframe. Very tight coil under a defined resistance. Compression suggests a wide-range release.",
      },
    };
  })(),
  // 9) News volatility
  (() => {
    const v = news.visible;
    const h = news.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "news-volatility-btc",
      title: "Post-news whipsaw",
      symbol: "BTC/USD",
      timeframe: "4h",
      difficulty: "medium",
      setupType: "news_volatility" as SetupType,
      marketContext:
        "Calm rangebound trade gave way to two enormous opposing candles after a scheduled macro event. The next candles continue to print wide ranges.",
      neutralScenarioNotes:
        "BTC/USD on the 4h timeframe. After a long period of calm, two consecutive wide-range opposing candles printed. Recent candles continue to have large ranges with both upper and lower wicks.",
      learningFocus:
        "Trading around news. The first few bars after a news event are noise, not structure. Stops sized for normal volatility get destroyed.",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [
        { price: last, label: "current price (post-event)" },
        { price: 66000, label: "post-event high" },
        { price: 62500, label: "post-event low" },
      ],
      preferredDecision: "wait" as Direction,
      acceptableDecisions: ["wait"],
      outcome: {
        description:
          "Volatility kept expanding for the next half day with no clear direction, then began to compress as a new range formed.",
        takeaway:
          "Waiting for volatility to compress and a new range to form was the only repeatable edge. Anything sized for normal vol got stopped.",
      },
      lessonRecommendation: "when_to_wait" as const,
      context: {
        trend: "range" as const,
        support: [62500],
        resistance: [66000],
        currentPrice: last,
        bestDirection: "wait" as Direction,
        notes:
          "BTC/USD on the 4h timeframe. Post-news bars with abnormally wide ranges and wicks on both sides.",
      },
    };
  })(),
  // 10) No clear setup
  (() => {
    const v = noSetup.visible;
    const h = noSetup.hidden;
    const last = v[v.length - 1].close;
    return {
      id: "no-setup-eth",
      title: "No clear setup",
      symbol: "ETH/USD",
      timeframe: "1h",
      difficulty: "easy",
      setupType: "no_setup" as SetupType,
      marketContext:
        "Featureless 1h chop in a tight band. No marked level is being respected, no momentum to either side.",
      neutralScenarioNotes:
        "ETH/USD on the 1h timeframe. Small directionless candles in a tight band with no clear level being respected.",
      learningFocus:
        "When to wait. Featureless conditions force the question: where is your edge, what level is being respected, and what would a clean thesis look like here?",
      visibleCandles: v,
      hiddenCandles: h,
      decisionPointIndex: v.length - 1,
      keyLevels: [{ price: last, label: "centre of chop" }],
      preferredDecision: "wait" as Direction,
      acceptableDecisions: ["wait"],
      outcome: {
        description:
          "The chop continued for the entire revealed window without producing a clean direction.",
        takeaway:
          "Forcing a directional position here was a coin flip with extra steps. Wait was correct.",
      },
      lessonRecommendation: "when_to_wait" as const,
      context: {
        trend: "range" as const,
        support: [],
        resistance: [],
        currentPrice: last,
        bestDirection: "wait" as Direction,
        notes:
          "ETH/USD on the 1h timeframe. Featureless tight-band chop with no respected level.",
      },
    };
  })(),
  ...REAL_SCENARIOS,
];

// v5.12.0 — attach derived trade-management points to every scenario whose
// ideal trade actually runs (authored points are preserved). This is what
// turns "3 scenarios teach management" into "every winner does".
export const SCENARIOS: Scenario[] = RAW_SCENARIOS.map(withDerivedManagement);

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export type ScenarioFilter = {
  difficulty?: Difficulty | "all";
  setupType?: SetupType | "all";
  symbol?: string | "all";
  timeframe?: string | "all";
};

export function filterScenarios(f: ScenarioFilter): Scenario[] {
  return SCENARIOS.filter((s) => {
    if (f.difficulty && f.difficulty !== "all" && s.difficulty !== f.difficulty) return false;
    if (f.setupType && f.setupType !== "all" && s.setupType !== f.setupType) return false;
    if (f.symbol && f.symbol !== "all" && s.symbol !== f.symbol) return false;
    if (f.timeframe && f.timeframe !== "all" && s.timeframe !== f.timeframe) return false;
    return true;
  });
}

export function pickRandomScenario(excludeId?: string, pool: Scenario[] = SCENARIOS): Scenario {
  const choices = excludeId ? pool.filter((s) => s.id !== excludeId) : pool;
  const list = choices.length > 0 ? choices : pool;
  return list[Math.floor(Math.random() * list.length)];
}

// v3.0 — Smart rotation. Replaces the round-robin pickNextScenario that
// always returned `pool[(idx+1) % pool.length]` — predictable but cycled the
// same handful repeatedly for a user practicing one setup type.
//
// New ranking, applied within the caller's pool (so filters/drill scope stay
// honored):
//   1. Never-seen-and-never-attempted scenarios come first (huge novelty bonus).
//   2. Otherwise, score = max(lastSeenAt, lastAttemptAt). Lower = more stale =
//      higher priority. Ties broken by id to stay deterministic.
//   3. Current scenario is always excluded.
//
// Storage reads are guarded: the helpers return {} on SSR, so server-rendered
// pages get the same pure-round-robin fallback as before. Real ranking kicks
// in client-side.
//
// Take optional `seenAt` and `attemptedAt` injectables so the function stays
// testable without touching localStorage in tests.
export type ScenarioPickerInputs = {
  seenAt?: Record<string, number>;
  attemptedAt?: Record<string, number>;
};

export function pickNextScenario(
  currentId: string,
  pool: Scenario[] = SCENARIOS,
  inputs: ScenarioPickerInputs = {}
): Scenario {
  if (pool.length === 0) return SCENARIOS[0];
  const others = pool.filter((s) => s.id !== currentId);
  const candidates = others.length > 0 ? others : pool;
  const seen = inputs.seenAt ?? {};
  const attempted = inputs.attemptedAt ?? {};

  // Bail out to the legacy round-robin behaviour when we have no signal at
  // all (e.g. SSR or a brand-new user). Avoids "all scenarios look identical
  // — return the first one" which feels broken when the only seen entry is
  // the current scenario.
  const haveSignal =
    Object.keys(seen).length > 0 || Object.keys(attempted).length > 0;
  if (!haveSignal) {
    const idx = pool.findIndex((s) => s.id === currentId);
    if (idx === -1) return pool[0];
    return pool[(idx + 1) % pool.length];
  }

  const ranked = [...candidates].sort((a, b) => {
    const aFresh = Math.max(seen[a.id] ?? 0, attempted[a.id] ?? 0);
    const bFresh = Math.max(seen[b.id] ?? 0, attempted[b.id] ?? 0);
    // Never touched → freshest possible (sort first).
    if (aFresh === 0 && bFresh !== 0) return -1;
    if (bFresh === 0 && aFresh !== 0) return 1;
    if (aFresh !== bFresh) return aFresh - bFresh;
    return a.id < b.id ? -1 : 1;
  });
  return ranked[0] ?? pool[0];
}

export const ALL_SYMBOLS: string[] = [...new Set(SCENARIOS.map((s) => s.symbol))];
export const ALL_TIMEFRAMES: string[] = [...new Set(SCENARIOS.map((s) => s.timeframe))];
export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const ALL_SETUP_TYPES: SetupType[] = [
  "trend_continuation",
  "failed_breakout",
  "range_chop",
  "support_breakdown",
  "overextended",
  "liquidity_sweep",
  "clean_retest",
  "leverage_trap",
  "news_volatility",
  "no_setup",
];

export const SETUP_TYPE_LABELS: Record<SetupType, string> = {
  trend_continuation: "Uptrend pullback",
  failed_breakout: "Failed breakout",
  range_chop: "Range chop",
  support_breakdown: "Support breakdown",
  overextended: "Overextended pump",
  liquidity_sweep: "Liquidity sweep",
  clean_retest: "Clean retest",
  leverage_trap: "High leverage trap",
  news_volatility: "News volatility",
  no_setup: "No clear setup",
};

// v2.3 — one-sentence plain-English description of each setup type.
// Shown as a tooltip on the Practice filter so beginners aren't asked to
// filter by jargon they don't yet understand.
export const SETUP_TYPE_BLURBS: Record<SetupType, string> = {
  trend_continuation:
    "Pullback in an uptrend that holds and resumes higher. The textbook 'buy the dip inside a trend' setup.",
  failed_breakout:
    "Price pokes above resistance (or below support) and snaps back inside. Chasers get trapped at the wick.",
  range_chop:
    "Sideways price action between defined edges. No directional edge from the middle; only fade the edges or wait.",
  support_breakdown:
    "A long-held support level finally cracks, releasing underwater longs as forced sellers. Often produces a fast move down.",
  overextended:
    "Parabolic vertical run with extreme funding and crowded positioning. High exhaustion risk; chasing the top usually loses.",
  liquidity_sweep:
    "Sudden spike that grabs stops at an obvious level, then immediately reverses. Reclaim of the broken level is the trigger.",
  clean_retest:
    "After a clear breakout, price returns to the broken level and holds. The retest is one of the highest-EV continuation entries.",
  leverage_trap:
    "Conditions where leverage costs more than direction does — fast tape, thin books, conflicting headlines, weekend gaps. Both sides get washed.",
  news_volatility:
    "Trading right before or during a known catalyst. Spreads widen, wicks lengthen, levels stop mattering for minutes at a time.",
  no_setup:
    "Nothing clear is happening. No level, no structure, no edge — the cleanest play is to do nothing.",
};
