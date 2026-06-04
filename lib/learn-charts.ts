export type ChartTone = "good" | "bad" | "warn" | "accent" | "muted";

export type ChartCandle = { o: number; h: number; l: number; c: number };

export type ChartLevel = {
  price: number;
  label: string;
  tone: ChartTone;
  dashed?: boolean;
};

export type ChartZone = {
  from: number;
  to: number;
  tone: ChartTone;
  label?: string;
};

export type ChartMarker = {
  candleIndex: number;
  price: number;
  tone: ChartTone;
  label?: string;
};

// v4.0.1 — Indicator overlays + sub-panels for the chart-tools lessons.
// Each new field is optional; existing chart specs render unchanged.
//
// ChartLine: a price-overlay line (one value per candle). Used for SMAs,
//   EMAs, VWAP, the middle Bollinger band. `values.length` should equal
//   `candles.length`; nulls are allowed for early candles where the
//   indicator hasn't warmed up yet.
//
// ChartBand: a shaded band between an upper and lower line. Used for
//   Bollinger Bands, Keltner Channels, Donchian Channels.
//
// ChartSubPanel: a separate pane below the price chart. Two flavours —
//   "oscillator" (e.g. RSI, with horizontal thresholds and 0–100 scale)
//   and "histogram" (e.g. MACD histogram, with positive/negative bars).

export type ChartLine = {
  values: Array<number | null>;
  tone: ChartTone;
  label?: string;
  dashed?: boolean;
};

export type ChartBand = {
  upper: number[];
  lower: number[];
  middle?: number[];
  tone: ChartTone;
  label?: string;
};

export type ChartSubPanel =
  | {
      kind: "oscillator";
      values: Array<number | null>;
      label: string;
      tone: ChartTone;
      // Optional horizontal threshold lines, e.g. [30, 70] for RSI.
      thresholds?: number[];
      // Min/max for the y-scale. Defaults to [0, 100].
      yMin?: number;
      yMax?: number;
    }
  | {
      kind: "histogram";
      values: Array<number | null>;
      label: string;
      // Bars switch tone above/below zero.
      positiveTone?: ChartTone;
      negativeTone?: ChartTone;
    };

export type ChartSpec = {
  candles: ChartCandle[];
  levels?: ChartLevel[];
  zones?: ChartZone[];
  markers?: ChartMarker[];
  lines?: ChartLine[];
  bands?: ChartBand[];
  subPanels?: ChartSubPanel[];
};

function build(
  start: number,
  steps: Array<{ c: number; wH?: number; wL?: number }>
): ChartCandle[] {
  const out: ChartCandle[] = [];
  let o = start;
  for (const s of steps) {
    const c = s.c;
    const h = Math.max(o, c) + (s.wH ?? 0);
    const l = Math.min(o, c) - (s.wL ?? 0);
    out.push({ o, h, l, c });
    o = c;
  }
  return out;
}

const rr_balanced: ChartSpec = {
  candles: build(59300, [
    { c: 59600, wH: 80, wL: 60 },
    { c: 59500, wH: 50, wL: 80 },
    { c: 59800, wH: 80, wL: 60 },
    { c: 60000, wH: 100, wL: 80 },
    { c: 60300, wH: 80, wL: 100 },
    { c: 60500, wH: 80, wL: 80 },
    { c: 60800, wH: 90, wL: 60 },
  ]),
  zones: [
    { from: 60000, to: 63000, tone: "good", label: "Reward = $3,000" },
    { from: 59000, to: 60000, tone: "bad", label: "Risk = $1,000" },
  ],
  levels: [
    { price: 63000, label: "TP $63,000", tone: "good" },
    { price: 60000, label: "Entry $60,000", tone: "accent" },
    { price: 59000, label: "Stop $59,000", tone: "bad" },
  ],
  markers: [{ candleIndex: 3, price: 60000, tone: "accent", label: "Long" }],
};

const stop_loss_chart: ChartSpec = {
  candles: build(60500, [
    { c: 60100, wH: 60, wL: 100 },
    { c: 59800, wH: 50, wL: 120 },
    { c: 59600, wH: 80, wL: 200 },
    { c: 59900, wH: 100, wL: 100 },
    { c: 60200, wH: 100, wL: 80 },
    { c: 59800, wH: 80, wL: 120 },
    { c: 60300, wH: 150, wL: 80 },
    { c: 60800, wH: 150, wL: 100 },
  ]),
  levels: [
    { price: 60000, label: "Entry $60,000", tone: "accent" },
    { price: 59500, label: "Support", tone: "muted", dashed: true },
    { price: 59200, label: "Stop $59,200", tone: "bad" },
  ],
  markers: [{ candleIndex: 3, price: 59900, tone: "accent", label: "Long" }],
};

const support_bounce: ChartSpec = {
  candles: build(60500, [
    { c: 60100, wH: 60, wL: 100 },
    { c: 59800, wH: 50, wL: 120 },
    { c: 59600, wH: 80, wL: 200 },
    { c: 59900, wH: 100, wL: 100 },
    { c: 60200, wH: 100, wL: 80 },
    { c: 59700, wH: 80, wL: 180 },
    { c: 60100, wH: 120, wL: 60 },
    { c: 60400, wH: 100, wL: 80 },
    { c: 60700, wH: 120, wL: 80 },
  ]),
  levels: [{ price: 59500, label: "Support $59,500", tone: "good" }],
};

const resistance_reject: ChartSpec = {
  candles: build(61500, [
    { c: 61800, wH: 100, wL: 60 },
    { c: 62100, wH: 100, wL: 80 },
    { c: 62500, wH: 100, wL: 60 },
    { c: 62900, wH: 200, wL: 80 },
    { c: 62500, wH: 100, wL: 80 },
    { c: 62800, wH: 200, wL: 60 },
    { c: 62300, wH: 100, wL: 120 },
    { c: 62600, wH: 200, wL: 60 },
    { c: 62000, wH: 80, wL: 120 },
  ]),
  levels: [{ price: 63000, label: "Resistance $63,000", tone: "bad" }],
};

const take_profit_chart: ChartSpec = {
  candles: build(60000, [
    { c: 60300, wH: 100, wL: 80 },
    { c: 60700, wH: 120, wL: 80 },
    { c: 61200, wH: 100, wL: 80 },
    { c: 61800, wH: 200, wL: 80 },
    { c: 62300, wH: 200, wL: 100 },
    { c: 62700, wH: 200, wL: 80 },
    { c: 62800, wH: 200, wL: 100 },
    { c: 62500, wH: 200, wL: 200 },
  ]),
  levels: [
    { price: 63000, label: "Resistance", tone: "muted", dashed: true },
    { price: 62800, label: "TP $62,800", tone: "good" },
    { price: 60000, label: "Entry $60,000", tone: "accent" },
  ],
  markers: [{ candleIndex: 0, price: 60000, tone: "accent", label: "Long" }],
};

const uptrend: ChartSpec = {
  candles: build(58000, [
    { c: 58500, wH: 100, wL: 80 },
    { c: 59000, wH: 100, wL: 100 },
    { c: 58800, wH: 80, wL: 200 },
    { c: 60000, wH: 150, wL: 80 },
    { c: 59700, wH: 100, wL: 200 },
    { c: 61000, wH: 200, wL: 80 },
    { c: 60500, wH: 100, wL: 200 },
    { c: 62000, wH: 200, wL: 80 },
    { c: 62500, wH: 200, wL: 100 },
  ]),
};

const range_chart: ChartSpec = {
  candles: build(60500, [
    { c: 61000, wH: 100, wL: 100 },
    { c: 60700, wH: 100, wL: 100 },
    { c: 60200, wH: 100, wL: 100 },
    { c: 60100, wH: 60, wL: 200 },
    { c: 60500, wH: 100, wL: 100 },
    { c: 60900, wH: 200, wL: 60 },
    { c: 60400, wH: 100, wL: 100 },
    { c: 60200, wH: 100, wL: 200 },
    { c: 60700, wH: 100, wL: 100 },
    { c: 61000, wH: 200, wL: 60 },
  ]),
  levels: [
    { price: 61100, label: "Range high", tone: "bad" },
    { price: 60000, label: "Range low", tone: "good" },
  ],
};

const breakout_chart: ChartSpec = {
  candles: build(62500, [
    { c: 62700, wH: 100, wL: 80 },
    { c: 62500, wH: 100, wL: 100 },
    { c: 62800, wH: 100, wL: 60 },
    { c: 62600, wH: 100, wL: 100 },
    { c: 62900, wH: 100, wL: 60 },
    { c: 62700, wH: 100, wL: 100 },
    { c: 63500, wH: 100, wL: 80 },
    { c: 63900, wH: 100, wL: 80 },
    { c: 64200, wH: 150, wL: 80 },
  ]),
  levels: [{ price: 63000, label: "Resistance broken", tone: "good" }],
};

const fakeout_chart: ChartSpec = {
  candles: build(62500, [
    { c: 62700, wH: 100, wL: 80 },
    { c: 62500, wH: 100, wL: 100 },
    { c: 62800, wH: 100, wL: 60 },
    { c: 62600, wH: 100, wL: 100 },
    { c: 62900, wH: 100, wL: 60 },
    { c: 62700, wH: 100, wL: 100 },
    { c: 62700, wH: 800, wL: 100 },
    { c: 62400, wH: 100, wL: 150 },
    { c: 62100, wH: 80, wL: 200 },
  ]),
  levels: [{ price: 63000, label: "Resistance held", tone: "bad" }],
};

const retest_chart: ChartSpec = {
  candles: build(62700, [
    { c: 62500, wH: 100, wL: 100 },
    { c: 62800, wH: 100, wL: 80 },
    { c: 62600, wH: 100, wL: 100 },
    { c: 63500, wH: 100, wL: 100 },
    { c: 63800, wH: 100, wL: 80 },
    { c: 63100, wH: 80, wL: 150 },
    { c: 63400, wH: 100, wL: 100 },
    { c: 63900, wH: 100, wL: 80 },
    { c: 64500, wH: 150, wL: 100 },
  ]),
  levels: [{ price: 63000, label: "Level retested", tone: "good" }],
  markers: [{ candleIndex: 5, price: 63050, tone: "accent", label: "Long on retest" }],
};

const sweep_chart: ChartSpec = {
  candles: build(60200, [
    { c: 60000, wH: 80, wL: 100 },
    { c: 60100, wH: 100, wL: 80 },
    { c: 59800, wH: 80, wL: 150 },
    { c: 60000, wH: 100, wL: 100 },
    { c: 59900, wH: 100, wL: 100 },
    { c: 59950, wH: 100, wL: 800 },
    { c: 60500, wH: 200, wL: 80 },
    { c: 61000, wH: 200, wL: 100 },
    { c: 61500, wH: 200, wL: 80 },
  ]),
  levels: [
    { price: 59500, label: "Obvious low", tone: "muted", dashed: true },
    { price: 59150, label: "Sweep wick", tone: "bad" },
  ],
};

const chase_vs_plan: ChartSpec = {
  candles: build(62700, [
    { c: 62800, wH: 100, wL: 80 },
    { c: 62600, wH: 100, wL: 100 },
    { c: 62900, wH: 100, wL: 60 },
    { c: 63100, wH: 100, wL: 100 },
    { c: 63500, wH: 80, wL: 100 },
    { c: 63900, wH: 80, wL: 80 },
    { c: 64300, wH: 100, wL: 80 },
    { c: 64100, wH: 100, wL: 150 },
  ]),
  levels: [
    { price: 63000, label: "Breakout level", tone: "muted", dashed: true },
    { price: 62800, label: "Planned stop", tone: "bad" },
  ],
  markers: [
    { candleIndex: 3, price: 63100, tone: "good", label: "Planned entry" },
    { candleIndex: 6, price: 64300, tone: "bad", label: "Chase" },
  ],
};

const tp_before_past: ChartSpec = {
  candles: build(60000, [
    { c: 60500, wH: 100, wL: 80 },
    { c: 61000, wH: 100, wL: 80 },
    { c: 61500, wH: 100, wL: 80 },
    { c: 62000, wH: 150, wL: 80 },
    { c: 62500, wH: 150, wL: 100 },
    { c: 62800, wH: 200, wL: 100 },
    { c: 62700, wH: 300, wL: 200 },
    { c: 62300, wH: 100, wL: 200 },
  ]),
  levels: [
    { price: 65500, label: "Unrealistic TP", tone: "bad", dashed: true },
    { price: 63000, label: "Resistance", tone: "muted", dashed: true },
    { price: 62800, label: "Realistic TP", tone: "good" },
    { price: 60000, label: "Entry", tone: "accent" },
  ],
};

const liq_buffer: ChartSpec = {
  candles: build(60000, [
    { c: 59800, wH: 80, wL: 100 },
    { c: 59500, wH: 100, wL: 150 },
    { c: 59200, wH: 80, wL: 200 },
    { c: 58800, wH: 100, wL: 200 },
    { c: 58500, wH: 100, wL: 150 },
  ]),
  zones: [{ from: 58500, to: 54000, tone: "bad", label: "Wipeout zone past stop" }],
  levels: [
    { price: 60000, label: "Entry $60,000", tone: "accent" },
    { price: 58500, label: "Stop $58,500", tone: "warn" },
    { price: 54000, label: "Liq (10×) $54,000", tone: "bad" },
  ],
};

const chop_chart: ChartSpec = {
  candles: build(60100, [
    { c: 60300, wH: 200, wL: 200 },
    { c: 59900, wH: 200, wL: 200 },
    { c: 60200, wH: 200, wL: 200 },
    { c: 59800, wH: 200, wL: 200 },
    { c: 60100, wH: 200, wL: 200 },
    { c: 60400, wH: 200, wL: 200 },
    { c: 59950, wH: 250, wL: 250 },
    { c: 60150, wH: 250, wL: 250 },
    { c: 60050, wH: 200, wL: 200 },
  ]),
};

const thesis_chart: ChartSpec = {
  candles: build(58500, [
    { c: 59000, wH: 100, wL: 80 },
    { c: 59500, wH: 100, wL: 100 },
    { c: 59300, wH: 80, wL: 150 },
    { c: 59800, wH: 100, wL: 80 },
    { c: 59600, wH: 80, wL: 150 },
    { c: 60100, wH: 200, wL: 60 },
    { c: 60500, wH: 100, wL: 80 },
    { c: 60900, wH: 150, wL: 80 },
    { c: 61500, wH: 200, wL: 100 },
  ]),
  levels: [
    { price: 60000, label: "Entry $60,000", tone: "accent" },
    { price: 59500, label: "Support held", tone: "good", dashed: true },
    { price: 59400, label: "Invalidation", tone: "bad" },
  ],
};

const cluster_chart: ChartSpec = {
  candles: build(60200, [
    { c: 60000, wH: 80, wL: 100 },
    { c: 60100, wH: 100, wL: 80 },
    { c: 59700, wH: 80, wL: 200 },
    { c: 59850, wH: 200, wL: 800 },
    { c: 60500, wH: 200, wL: 80 },
    { c: 61000, wH: 200, wL: 100 },
    { c: 61500, wH: 200, wL: 80 },
  ]),
  zones: [{ from: 58800, to: 58300, tone: "warn", label: "Liquidation cluster" }],
  levels: [{ price: 60000, label: "Spot", tone: "muted", dashed: true }],
};

const vol_chart: ChartSpec = {
  candles: build(60000, [
    { c: 60050, wH: 30, wL: 30 },
    { c: 59950, wH: 30, wL: 40 },
    { c: 60020, wH: 30, wL: 30 },
    { c: 59980, wH: 40, wL: 30 },
    { c: 60000, wH: 30, wL: 30 },
    { c: 60800, wH: 200, wL: 100 },
    { c: 59700, wH: 150, wL: 400 },
    { c: 60900, wH: 400, wL: 200 },
    { c: 59500, wH: 200, wL: 400 },
  ]),
};

// ─── Chart Tools specs (v4.0.1) ─────────────────────────────────────────────
// Visual examples for the new chart-tool lessons. Not every term gets a chart
// spec — the most visually-dependent ones (SMA/EMA, Bollinger, RSI, MACD, Fib,
// VWAP, divergence) are authored here; others fall back to the existing text
// example via chartFor() returning null.

// SMA/EMA overlay on a calm uptrend. The line tracks the closes, smoothed.
const sma_chart: ChartSpec = (() => {
  const candles = build(59800, [
    { c: 60000, wH: 60, wL: 80 },
    { c: 60300, wH: 80, wL: 80 },
    { c: 60100, wH: 80, wL: 100 },
    { c: 60400, wH: 100, wL: 80 },
    { c: 60700, wH: 80, wL: 80 },
    { c: 60500, wH: 60, wL: 100 },
    { c: 60900, wH: 100, wL: 80 },
    { c: 61200, wH: 80, wL: 80 },
    { c: 61000, wH: 80, wL: 100 },
    { c: 61400, wH: 100, wL: 80 },
  ]);
  // Hand-tuned SMA-ish line; lags ~3 candles behind.
  const sma: Array<number | null> = [null, null, null, 60100, 60225, 60375, 60475, 60625, 60825, 61025];
  return {
    candles,
    lines: [{ values: sma, tone: "accent", label: "SMA(4)" }],
    levels: [],
  };
})();

const ema_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 80, wL: 60 },
    { c: 60500, wH: 100, wL: 80 },
    { c: 60300, wH: 80, wL: 120 },
    { c: 60700, wH: 100, wL: 60 },
    { c: 61000, wH: 80, wL: 60 },
    { c: 60800, wH: 60, wL: 100 },
    { c: 61200, wH: 100, wL: 80 },
    { c: 61500, wH: 100, wL: 60 },
    { c: 61300, wH: 60, wL: 120 },
    { c: 61700, wH: 100, wL: 80 },
  ]);
  // Faster-reacting EMA line.
  const ema: Array<number | null> = [60000, 60100, 60280, 60290, 60450, 60670, 60720, 60900, 61120, 61210];
  return {
    candles,
    lines: [{ values: ema, tone: "accent", label: "EMA(5)" }],
  };
})();

// Bollinger Bands on a chopping-then-breakout chart.
const bollinger_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 59950, wH: 50, wL: 80 },
    { c: 60050, wH: 60, wL: 60 },
    { c: 60000, wH: 50, wL: 50 },
    { c: 60080, wH: 70, wL: 50 },
    { c: 60020, wH: 50, wL: 80 },
    { c: 60100, wH: 60, wL: 50 },
    { c: 60050, wH: 50, wL: 60 }, // squeeze tightens
    { c: 60500, wH: 120, wL: 50 }, // breakout
    { c: 60900, wH: 150, wL: 60 },
    { c: 61300, wH: 150, wL: 80 },
  ]);
  // Bands tighten then widen as volatility expands.
  const upper = [60150, 60140, 60130, 60130, 60120, 60130, 60130, 60500, 61100, 61700];
  const middle = [60000, 60005, 60005, 60020, 60020, 60035, 60040, 60125, 60340, 60590];
  const lower = [59850, 59870, 59880, 59910, 59920, 59940, 59950, 59750, 59580, 59480];
  return {
    candles,
    bands: [{ upper, middle, lower, tone: "accent", label: "BB(20, 2)" }],
  };
})();

// RSI sub-panel. Price ranges, RSI swings between 30 and 70 cleanly.
const rsi_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 60, wL: 60 },
    { c: 60500, wH: 80, wL: 80 },
    { c: 60300, wH: 60, wL: 100 },
    { c: 60050, wH: 60, wL: 100 },
    { c: 59850, wH: 60, wL: 80 },
    { c: 60100, wH: 100, wL: 60 },
    { c: 60400, wH: 80, wL: 60 },
    { c: 60650, wH: 100, wL: 80 },
    { c: 60450, wH: 60, wL: 100 },
    { c: 60200, wH: 60, wL: 100 },
  ]);
  const rsi: Array<number | null> = [50, 58, 68, 56, 38, 28, 48, 60, 72, 64];
  return {
    candles,
    subPanels: [
      {
        kind: "oscillator",
        values: rsi,
        label: "RSI(14)",
        tone: "accent",
        thresholds: [30, 70],
      },
    ],
  };
})();

// MACD histogram sub-panel. Bars go negative during pullback, positive on rally.
const macd_chart: ChartSpec = (() => {
  const candles = build(60500, [
    { c: 60300, wH: 60, wL: 80 },
    { c: 60100, wH: 60, wL: 100 },
    { c: 59950, wH: 50, wL: 80 },
    { c: 59850, wH: 50, wL: 80 },
    { c: 60050, wH: 80, wL: 60 },
    { c: 60250, wH: 80, wL: 60 },
    { c: 60500, wH: 100, wL: 60 },
    { c: 60750, wH: 100, wL: 80 },
    { c: 60950, wH: 100, wL: 60 },
    { c: 61100, wH: 80, wL: 60 },
  ]);
  const hist: Array<number | null> = [-20, -40, -60, -55, -20, 15, 45, 70, 80, 75];
  return {
    candles,
    subPanels: [
      {
        kind: "histogram",
        values: hist,
        label: "MACD histogram",
        positiveTone: "good",
        negativeTone: "bad",
      },
    ],
  };
})();

// Fibonacci retracement: levels drawn between a swing low and swing high.
const fib_chart: ChartSpec = (() => {
  const candles = build(55000, [
    { c: 56500, wH: 120, wL: 100 },
    { c: 58200, wH: 150, wL: 100 },
    { c: 60500, wH: 200, wL: 150 },
    { c: 62800, wH: 200, wL: 150 },
    { c: 65000, wH: 200, wL: 100 }, // swing high
    { c: 63200, wH: 100, wL: 200 },
    { c: 61500, wH: 100, wL: 200 }, // pullback to 0.382
    { c: 60800, wH: 100, wL: 150 },
    { c: 61400, wH: 150, wL: 100 },
    { c: 62500, wH: 200, wL: 100 },
  ]);
  return {
    candles,
    levels: [
      { price: 65000, label: "Swing high (0)", tone: "muted", dashed: true },
      { price: 63090, label: "0.236", tone: "muted", dashed: true },
      { price: 61180, label: "0.382", tone: "accent", dashed: true },
      { price: 60000, label: "0.5", tone: "muted", dashed: true },
      { price: 58820, label: "0.618 (golden)", tone: "accent" },
      { price: 56560, label: "0.786", tone: "muted", dashed: true },
      { price: 55000, label: "Swing low (1)", tone: "muted", dashed: true },
    ],
  };
})();

// VWAP line through an intraday session.
const vwap_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 60, wL: 60 },
    { c: 60500, wH: 80, wL: 60 },
    { c: 60800, wH: 100, wL: 80 },
    { c: 60600, wH: 60, wL: 100 },
    { c: 60700, wH: 80, wL: 80 },
    { c: 60900, wH: 100, wL: 60 },
    { c: 61100, wH: 100, wL: 80 },
    { c: 60950, wH: 60, wL: 100 },
    { c: 61050, wH: 80, wL: 80 },
    { c: 61200, wH: 100, wL: 80 },
  ]);
  // Session VWAP — slow-moving running average of price.
  const vwap: Array<number | null> = [60000, 60100, 60250, 60400, 60450, 60520, 60600, 60670, 60710, 60760];
  return {
    candles,
    lines: [{ values: vwap, tone: "accent", label: "VWAP", dashed: true }],
  };
})();

// Divergence: price prints higher high, RSI prints lower high.
const divergence_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60500, wH: 80, wL: 80 },
    { c: 61200, wH: 100, wL: 60 },
    { c: 61500, wH: 100, wL: 80 }, // first peak
    { c: 60800, wH: 60, wL: 120 },
    { c: 60500, wH: 60, wL: 100 },
    { c: 61000, wH: 100, wL: 60 },
    { c: 61700, wH: 100, wL: 60 },
    { c: 62000, wH: 80, wL: 60 }, // higher high in PRICE
    { c: 61700, wH: 60, wL: 100 },
    { c: 61200, wH: 60, wL: 120 },
  ]);
  // RSI prints a LOWER high at the second peak (divergence).
  const rsi: Array<number | null> = [55, 65, 75, 58, 50, 62, 68, 72, 60, 48];
  return {
    candles,
    markers: [
      { candleIndex: 2, price: 61500, tone: "warn", label: "Peak 1" },
      { candleIndex: 7, price: 62000, tone: "warn", label: "Peak 2 (HH)" },
    ],
    subPanels: [
      {
        kind: "oscillator",
        values: rsi,
        label: "RSI(14) — note the lower high",
        tone: "warn",
        thresholds: [30, 70],
      },
    ],
  };
})();

// ── v4.1.8 — chart-tools backfill (17 specs) ───────────────────────────────
// Each visual is illustrative, not a faithful indicator simulation. The goal
// is to ship a recognisable shape so beginners can connect the term to a
// picture, not to render correct math against synthetic candles.

// key_mas — three EMAs with different periods, showing how each lags more.
const key_mas_chart: ChartSpec = (() => {
  const candles = build(58000, [
    { c: 58500, wH: 100, wL: 80 },
    { c: 59200, wH: 120, wL: 80 },
    { c: 60000, wH: 150, wL: 100 },
    { c: 60800, wH: 200, wL: 100 },
    { c: 60400, wH: 100, wL: 120 },
    { c: 61200, wH: 150, wL: 80 },
    { c: 62000, wH: 200, wL: 100 },
    { c: 62800, wH: 200, wL: 100 },
    { c: 63500, wH: 200, wL: 100 },
    { c: 64200, wH: 200, wL: 100 },
  ]);
  const ema20 = [58200, 58500, 58900, 59400, 59800, 60200, 60700, 61200, 61700, 62200];
  const ema50 = [58100, 58200, 58400, 58700, 59000, 59300, 59700, 60100, 60500, 60900];
  const ema200 = [58000, 58050, 58100, 58200, 58300, 58400, 58550, 58700, 58850, 59000];
  return {
    candles,
    lines: [
      { values: ema20, tone: "accent", label: "EMA(20)" },
      { values: ema50, tone: "warn", label: "EMA(50)" },
      { values: ema200, tone: "muted", label: "EMA(200)" },
    ],
  };
})();

// ma_crossover — golden cross: 50 EMA crossing above 200 EMA after a base.
const ma_crossover_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 59500, wH: 80, wL: 100 },
    { c: 59000, wH: 80, wL: 120 },
    { c: 58800, wH: 80, wL: 100 },
    { c: 59200, wH: 100, wL: 80 },
    { c: 59800, wH: 120, wL: 80 },
    { c: 60500, wH: 150, wL: 80 },
    { c: 61200, wH: 200, wL: 100 },
    { c: 62000, wH: 200, wL: 100 },
    { c: 62800, wH: 200, wL: 100 },
    { c: 63500, wH: 200, wL: 100 },
  ]);
  const ema50 = [59700, 59500, 59300, 59250, 59400, 59700, 60150, 60700, 61300, 61900];
  const ema200 = [60100, 60050, 59950, 59850, 59750, 59700, 59700, 59750, 59850, 60000];
  return {
    candles,
    lines: [
      { values: ema50, tone: "good", label: "EMA(50)" },
      { values: ema200, tone: "muted", label: "EMA(200)" },
    ],
    markers: [{ candleIndex: 5, price: 59700, tone: "good", label: "Golden cross" }],
  };
})();

// stochastic — %K oscillator with the standard 20/80 thresholds.
const stochastic_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60300, wH: 60, wL: 60 },
    { c: 60500, wH: 80, wL: 80 },
    { c: 60200, wH: 60, wL: 100 },
    { c: 59900, wH: 60, wL: 100 },
    { c: 59750, wH: 60, wL: 80 },
    { c: 60100, wH: 100, wL: 60 },
    { c: 60400, wH: 80, wL: 60 },
    { c: 60600, wH: 100, wL: 80 },
    { c: 60450, wH: 60, wL: 100 },
    { c: 60200, wH: 60, wL: 100 },
  ]);
  const k = [55, 68, 76, 60, 22, 12, 35, 68, 84, 70];
  return {
    candles,
    subPanels: [
      {
        kind: "oscillator",
        values: k,
        label: "Stochastic %K",
        tone: "accent",
        thresholds: [20, 80],
      },
    ],
  };
})();

// williams_r — same shape as stochastic but inverted scale (-100 to 0).
const williams_r_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60300, wH: 60, wL: 60 },
    { c: 60500, wH: 80, wL: 80 },
    { c: 60200, wH: 60, wL: 100 },
    { c: 59900, wH: 60, wL: 100 },
    { c: 59750, wH: 60, wL: 80 },
    { c: 60100, wH: 100, wL: 60 },
    { c: 60400, wH: 80, wL: 60 },
    { c: 60600, wH: 100, wL: 80 },
    { c: 60450, wH: 60, wL: 100 },
    { c: 60200, wH: 60, wL: 100 },
  ]);
  const w = [-50, -25, -12, -45, -85, -92, -65, -25, -10, -35];
  return {
    candles,
    subPanels: [
      {
        kind: "oscillator",
        values: w,
        label: "Williams %R",
        tone: "accent",
        thresholds: [-80, -20],
        yMin: -100,
        yMax: 0,
      },
    ],
  };
})();

// atr — calm-then-volatile chart; ATR rises through the volatile region.
const atr_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60050, wH: 40, wL: 40 },
    { c: 60100, wH: 50, wL: 40 },
    { c: 60080, wH: 50, wL: 50 },
    { c: 60150, wH: 50, wL: 40 },
    { c: 60400, wH: 120, wL: 80 },
    { c: 59800, wH: 100, wL: 200 },
    { c: 60500, wH: 200, wL: 120 },
    { c: 60100, wH: 150, wL: 200 },
    { c: 60800, wH: 250, wL: 150 },
    { c: 60500, wH: 100, wL: 200 },
  ]);
  const atr = [80, 85, 90, 95, 180, 260, 320, 360, 380, 360];
  return {
    candles,
    subPanels: [
      {
        kind: "oscillator",
        values: atr,
        label: "ATR(14)",
        tone: "accent",
        yMin: 0,
        yMax: 400,
      },
    ],
  };
})();

// keltner — ATR-based bands, price riding the upper rail in a trend.
const keltner_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 80, wL: 60 },
    { c: 60500, wH: 100, wL: 60 },
    { c: 60900, wH: 150, wL: 80 },
    { c: 61300, wH: 150, wL: 80 },
    { c: 61700, wH: 200, wL: 80 },
    { c: 62100, wH: 200, wL: 100 },
    { c: 62500, wH: 200, wL: 100 },
    { c: 62800, wH: 150, wL: 100 },
    { c: 63100, wH: 200, wL: 80 },
    { c: 63400, wH: 200, wL: 80 },
  ]);
  const middle = [60000, 60150, 60400, 60700, 61000, 61350, 61700, 62000, 62300, 62600];
  const upper = [60400, 60600, 60900, 61250, 61600, 62000, 62400, 62700, 63050, 63400];
  const lower = [59600, 59700, 59900, 60150, 60400, 60700, 61000, 61300, 61550, 61800];
  return {
    candles,
    bands: [{ upper, middle, lower, tone: "accent", label: "Keltner (20, 2 ATR)" }],
  };
})();

// volume_profile — POC + HVN/LVN levels (sideways histogram not supported,
// so we mark the meaningful prices as horizontal lines).
const volume_profile_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60400, wH: 100, wL: 80 },
    { c: 60800, wH: 150, wL: 80 },
    { c: 60600, wH: 100, wL: 100 },
    { c: 61000, wH: 150, wL: 80 },
    { c: 60700, wH: 100, wL: 120 },
    { c: 61200, wH: 200, wL: 100 },
    { c: 61500, wH: 200, wL: 100 },
    { c: 61300, wH: 100, wL: 150 },
    { c: 61700, wH: 200, wL: 100 },
    { c: 62000, wH: 200, wL: 100 },
  ]);
  return {
    candles,
    levels: [
      { price: 61500, label: "POC (most-traded)", tone: "accent" },
      { price: 60700, label: "HVN", tone: "good", dashed: true },
      { price: 61050, label: "LVN (fast through)", tone: "muted", dashed: true },
    ],
  };
})();

// obv — cumulative volume rising with price overall.
const obv_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 60, wL: 60 },
    { c: 60500, wH: 80, wL: 60 },
    { c: 60800, wH: 100, wL: 80 },
    { c: 60600, wH: 80, wL: 100 },
    { c: 60800, wH: 80, wL: 60 },
    { c: 61100, wH: 100, wL: 60 },
    { c: 60900, wH: 80, wL: 100 },
    { c: 61300, wH: 120, wL: 60 },
    { c: 61600, wH: 100, wL: 80 },
    { c: 61400, wH: 80, wL: 100 },
  ]);
  const obv = [0, 100, 200, 150, 220, 320, 270, 380, 470, 420];
  return {
    candles,
    subPanels: [
      {
        kind: "oscillator",
        values: obv,
        label: "OBV — cumulative volume",
        tone: "accent",
        yMin: -50,
        yMax: 500,
      },
    ],
  };
})();

// cvd — price rising while cumulative-delta diverges down (bearish hidden).
const cvd_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60300, wH: 60, wL: 60 },
    { c: 60600, wH: 80, wL: 60 },
    { c: 60900, wH: 100, wL: 60 },
    { c: 61200, wH: 100, wL: 80 },
    { c: 61500, wH: 100, wL: 80 },
    { c: 61700, wH: 100, wL: 80 },
    { c: 61500, wH: 80, wL: 120 },
    { c: 61300, wH: 80, wL: 100 },
    { c: 61000, wH: 80, wL: 120 },
    { c: 60700, wH: 80, wL: 120 },
  ]);
  const cvd = [0, 50, 100, 150, 130, 80, 40, -20, -100, -180];
  return {
    candles,
    subPanels: [
      {
        kind: "oscillator",
        values: cvd,
        label: "CVD — buyer minus seller volume",
        tone: "warn",
        yMin: -200,
        yMax: 200,
      },
    ],
  };
})();

// fib_extension — projection levels above the swing high.
const fib_extension_chart: ChartSpec = (() => {
  const candles = build(55000, [
    { c: 56500, wH: 100, wL: 80 },
    { c: 58000, wH: 120, wL: 100 },
    { c: 60000, wH: 200, wL: 100 },
    { c: 58500, wH: 100, wL: 200 },
    { c: 57500, wH: 80, wL: 150 },
    { c: 58200, wH: 120, wL: 80 },
    { c: 59500, wH: 200, wL: 100 },
    { c: 60800, wH: 200, wL: 100 },
    { c: 62500, wH: 250, wL: 100 },
    { c: 63500, wH: 200, wL: 150 },
  ]);
  return {
    candles,
    levels: [
      { price: 60000, label: "Swing high (1.0)", tone: "muted", dashed: true },
      { price: 57500, label: "Pullback low (0)", tone: "muted", dashed: true },
      { price: 61175, label: "1.272 ext", tone: "accent", dashed: true },
      { price: 62550, label: "1.618 ext (golden)", tone: "accent" },
      { price: 64550, label: "2.0 ext", tone: "muted", dashed: true },
    ],
  };
})();

// trend_line — diagonal line drawn through ascending lows.
const trend_line_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 80, wL: 100 },
    { c: 60500, wH: 100, wL: 80 },
    { c: 60300, wH: 80, wL: 150 },
    { c: 60800, wH: 120, wL: 80 },
    { c: 61000, wH: 100, wL: 80 },
    { c: 60900, wH: 80, wL: 200 },
    { c: 61400, wH: 150, wL: 80 },
    { c: 61700, wH: 120, wL: 100 },
    { c: 61500, wH: 100, wL: 250 },
    { c: 62200, wH: 150, wL: 80 },
  ]);
  const trendLine = [60050, 60200, 60350, 60500, 60650, 60800, 60950, 61100, 61250, 61400];
  return {
    candles,
    lines: [{ values: trendLine, tone: "accent", label: "Uptrend line", dashed: true }],
    markers: [
      { candleIndex: 2, price: 60350, tone: "good", label: "Touch 1" },
      { candleIndex: 5, price: 60800, tone: "good", label: "Touch 2" },
      { candleIndex: 8, price: 61250, tone: "good", label: "Touch 3" },
    ],
  };
})();

// channel — two parallel diagonal rails.
const channel_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 100, wL: 100 },
    { c: 60500, wH: 100, wL: 80 },
    { c: 60800, wH: 150, wL: 80 },
    { c: 60500, wH: 80, wL: 150 },
    { c: 60900, wH: 100, wL: 80 },
    { c: 61200, wH: 150, wL: 80 },
    { c: 60900, wH: 80, wL: 150 },
    { c: 61400, wH: 120, wL: 80 },
    { c: 61700, wH: 150, wL: 80 },
    { c: 61400, wH: 80, wL: 150 },
  ]);
  const lower = [59900, 60100, 60300, 60500, 60700, 60900, 61100, 61300, 61500, 61700];
  const upper = [60400, 60600, 60800, 61000, 61200, 61400, 61600, 61800, 62000, 62200];
  return {
    candles,
    lines: [
      { values: upper, tone: "accent", label: "Channel top", dashed: true },
      { values: lower, tone: "accent", label: "Channel bottom", dashed: true },
    ],
  };
})();

// pitchfork — median line plus two parallel outer rails.
const pitchfork_chart: ChartSpec = (() => {
  const candles = build(58000, [
    { c: 58500, wH: 100, wL: 80 },
    { c: 59200, wH: 120, wL: 80 },
    { c: 60000, wH: 150, wL: 100 },
    { c: 59000, wH: 80, wL: 200 },
    { c: 59800, wH: 100, wL: 100 },
    { c: 60800, wH: 200, wL: 80 },
    { c: 60200, wH: 100, wL: 200 },
    { c: 61500, wH: 200, wL: 80 },
    { c: 62000, wH: 150, wL: 120 },
    { c: 62500, wH: 200, wL: 100 },
  ]);
  const median = [59500, 59700, 59900, 60100, 60300, 60500, 60700, 60900, 61100, 61300];
  const upper = [60500, 60700, 60900, 61100, 61300, 61500, 61700, 61900, 62100, 62300];
  const lower = [58500, 58700, 58900, 59100, 59300, 59500, 59700, 59900, 60100, 60300];
  return {
    candles,
    lines: [
      { values: upper, tone: "muted", label: "Upper", dashed: true },
      { values: median, tone: "accent", label: "Median" },
      { values: lower, tone: "muted", label: "Lower", dashed: true },
    ],
  };
})();

// ichimoku — simplified: tenkan, kijun, and a kumo cloud.
const ichimoku_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60300, wH: 80, wL: 80 },
    { c: 60600, wH: 100, wL: 80 },
    { c: 60900, wH: 150, wL: 100 },
    { c: 61200, wH: 200, wL: 100 },
    { c: 61500, wH: 200, wL: 100 },
    { c: 61800, wH: 200, wL: 80 },
    { c: 62200, wH: 200, wL: 100 },
    { c: 62600, wH: 200, wL: 100 },
    { c: 63000, wH: 200, wL: 100 },
    { c: 63400, wH: 200, wL: 100 },
  ]);
  const tenkan = [60100, 60400, 60700, 61000, 61300, 61600, 61950, 62300, 62700, 63100];
  const kijun = [60050, 60250, 60450, 60700, 60950, 61200, 61450, 61750, 62050, 62400];
  const cloudUpper = [59800, 59950, 60150, 60350, 60600, 60900, 61200, 61500, 61800, 62100];
  const cloudLower = [59500, 59650, 59850, 60050, 60300, 60600, 60850, 61100, 61350, 61600];
  return {
    candles,
    bands: [{ upper: cloudUpper, lower: cloudLower, tone: "good", label: "Kumo cloud" }],
    lines: [
      { values: tenkan, tone: "accent", label: "Tenkan-sen" },
      { values: kijun, tone: "warn", label: "Kijun-sen" },
    ],
  };
})();

// pivot_points — floor pivot levels (P / R1-R2 / S1-S2).
const pivot_points_chart: ChartSpec = (() => {
  const candles = build(61000, [
    { c: 60800, wH: 80, wL: 100 },
    { c: 60900, wH: 100, wL: 80 },
    { c: 61100, wH: 120, wL: 80 },
    { c: 61300, wH: 150, wL: 80 },
    { c: 61500, wH: 150, wL: 80 },
    { c: 61300, wH: 80, wL: 120 },
    { c: 61100, wH: 100, wL: 100 },
    { c: 61300, wH: 120, wL: 80 },
    { c: 61450, wH: 150, wL: 80 },
    { c: 61400, wH: 100, wL: 80 },
  ]);
  return {
    candles,
    levels: [
      { price: 62000, label: "R2", tone: "muted", dashed: true },
      { price: 61500, label: "R1", tone: "bad" },
      { price: 61100, label: "Pivot (P)", tone: "accent" },
      { price: 60700, label: "S1", tone: "good" },
      { price: 60200, label: "S2", tone: "muted", dashed: true },
    ],
  };
})();

// donchian — N-period highest-high / lowest-low channel, with a breakout.
const donchian_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60500, wH: 200, wL: 80 },
    { c: 60300, wH: 100, wL: 100 },
    { c: 59800, wH: 80, wL: 200 },
    { c: 60200, wH: 100, wL: 80 },
    { c: 60600, wH: 150, wL: 80 },
    { c: 60900, wH: 250, wL: 80 },
    { c: 61300, wH: 200, wL: 80 },
    { c: 61100, wH: 100, wL: 100 },
    { c: 61500, wH: 200, wL: 80 },
    { c: 61700, wH: 200, wL: 80 },
  ]);
  const upper = [60700, 60700, 60700, 60700, 60700, 61150, 61500, 61500, 61700, 61900];
  const lower = [60000, 60000, 59600, 59600, 59600, 59600, 59600, 59700, 59700, 59700];
  return {
    candles,
    bands: [{ upper, lower, tone: "accent", label: "Donchian (20)" }],
    markers: [{ candleIndex: 5, price: 61150, tone: "good", label: "Breakout" }],
  };
})();

// candle_patterns — minimal chart with a hammer and an engulfing pattern
// labelled. The MiniChart system supports markers; we use them to mark
// the same kind of read the live chart's patterns toggle surfaces.
const candle_patterns_chart: ChartSpec = (() => {
  // Sequence: downtrend → hammer → reversal → bullish engulfing → run up.
  const candles = build(60500, [
    { c: 60300, wH: 60, wL: 80 },
    { c: 60100, wH: 60, wL: 100 },
    { c: 59900, wH: 60, wL: 100 },
    // Hammer: small body at top, long lower wick.
    { c: 60050, wH: 30, wL: 400 },
    { c: 60150, wH: 80, wL: 60 },
    // Engulfing: previous bar small red, current bar large green env'g it.
    { c: 60100, wH: 30, wL: 30 },
    { c: 60400, wH: 80, wL: 60 },
    { c: 60600, wH: 100, wL: 60 },
    { c: 60800, wH: 100, wL: 60 },
  ]);
  return {
    candles,
    markers: [
      { candleIndex: 3, price: 59600, tone: "good", label: "Hammer" },
      { candleIndex: 6, price: 60150, tone: "good", label: "Engulfing" },
    ],
  };
})();

// super_guppy — the 24-EMA ribbon shown during an uptrend. The MiniChart
// system tops out at a handful of lines per spec, so we approximate the
// ribbon with six lines spaced apart: three "good"-tone lines for the short
// cluster (top) and three "accent"-tone lines for the long cluster (bottom).
// The visual gap between the two clusters conveys the "shorts above longs"
// bull state without trying to render 24 individual lines into ~40px height.
const super_guppy_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 60200, wH: 80, wL: 60 },
    { c: 60400, wH: 80, wL: 60 },
    { c: 60500, wH: 80, wL: 80 },
    { c: 60700, wH: 80, wL: 60 },
    { c: 60900, wH: 80, wL: 60 },
    { c: 61050, wH: 80, wL: 100 },
    { c: 61200, wH: 100, wL: 60 },
    { c: 61350, wH: 100, wL: 60 },
    { c: 61500, wH: 80, wL: 80 },
    { c: 61650, wH: 80, wL: 60 },
  ]);
  // Three "short ribbon" lines, tracking close-ish to price.
  const short1: Array<number | null> = [60000, 60150, 60310, 60410, 60590, 60790, 60945, 61115, 61270, 61420];
  const short2: Array<number | null> = [59980, 60110, 60260, 60360, 60520, 60710, 60860, 61020, 61175, 61320];
  const short3: Array<number | null> = [59960, 60080, 60220, 60310, 60460, 60640, 60790, 60940, 61090, 61230];
  // Three "long ribbon" lines, tracking further below — wider gap = more
  // bull conviction.
  const long1: Array<number | null> = [59880, 59900, 59940, 59995, 60080, 60185, 60295, 60410, 60535, 60660];
  const long2: Array<number | null> = [59860, 59870, 59895, 59935, 60005, 60090, 60185, 60285, 60395, 60510];
  const long3: Array<number | null> = [59840, 59845, 59860, 59885, 59935, 60005, 60085, 60170, 60265, 60365];
  return {
    candles,
    lines: [
      { values: short1, tone: "good", label: "Short ribbon" },
      { values: short2, tone: "good" },
      { values: short3, tone: "good" },
      { values: long1, tone: "accent", label: "Long ribbon" },
      { values: long2, tone: "accent" },
      { values: long3, tone: "accent" },
    ],
  };
})();

// parabolic_sar — flipping-dots indicator. We use markers above price during
// the downtrend and below price during the uptrend, with a "Flip" marker at
// the trend change.
const parabolic_sar_chart: ChartSpec = (() => {
  const candles = build(60000, [
    { c: 59800, wH: 60, wL: 100 },
    { c: 59600, wH: 60, wL: 100 },
    { c: 59500, wH: 50, wL: 80 },
    { c: 59800, wH: 100, wL: 60 },
    { c: 60100, wH: 100, wL: 60 },
    { c: 60400, wH: 100, wL: 60 },
    { c: 60700, wH: 100, wL: 60 },
    { c: 61000, wH: 120, wL: 80 },
    { c: 61300, wH: 150, wL: 80 },
    { c: 61500, wH: 150, wL: 80 },
  ]);
  return {
    candles,
    markers: [
      { candleIndex: 0, price: 60100, tone: "bad", label: "·" },
      { candleIndex: 1, price: 59950, tone: "bad", label: "·" },
      { candleIndex: 2, price: 59800, tone: "warn", label: "Flip" },
      { candleIndex: 3, price: 59450, tone: "good", label: "·" },
      { candleIndex: 4, price: 59650, tone: "good", label: "·" },
      { candleIndex: 5, price: 59850, tone: "good", label: "·" },
      { candleIndex: 6, price: 60050, tone: "good", label: "·" },
      { candleIndex: 7, price: 60300, tone: "good", label: "·" },
      { candleIndex: 8, price: 60600, tone: "good", label: "·" },
    ],
  };
})();

export const CHART_SPECS: Record<string, ChartSpec> = {
  risk_percent: rr_balanced,
  position_sizing: rr_balanced,
  risk_reward: rr_balanced,
  stop_loss: stop_loss_chart,
  take_profit: take_profit_chart,
  liquidation: liq_buffer,
  leverage: liq_buffer,
  margin: liq_buffer,
  support: support_bounce,
  resistance: resistance_reject,
  trend: uptrend,
  range: range_chart,
  breakout: breakout_chart,
  fakeout: fakeout_chart,
  retest: retest_chart,
  liquidity_sweep: sweep_chart,
  entry: chase_vs_plan,
  chasing: chase_vs_plan,
  target_realism: tp_before_past,
  thesis: thesis_chart,
  invalidation: thesis_chart,
  wait_decision: chop_chart,
  liquidation_clusters: cluster_chart,
  volatility: vol_chart,

  // v4.0.1 — Chart Tools visual examples
  sma: sma_chart,
  ema: ema_chart,
  bollinger_bands: bollinger_chart,
  rsi: rsi_chart,
  macd: macd_chart,
  fib_retracement: fib_chart,
  vwap: vwap_chart,
  divergence: divergence_chart,

  // v4.1.8 — Chart Tools backfill (the 17 leftovers from v4.0.1).
  key_mas: key_mas_chart,
  ma_crossover: ma_crossover_chart,
  stochastic: stochastic_chart,
  williams_r: williams_r_chart,
  atr: atr_chart,
  keltner: keltner_chart,
  volume_profile: volume_profile_chart,
  obv: obv_chart,
  cvd: cvd_chart,
  fib_extension: fib_extension_chart,
  trend_line: trend_line_chart,
  channel: channel_chart,
  pitchfork: pitchfork_chart,
  ichimoku: ichimoku_chart,
  pivot_points: pivot_points_chart,
  donchian: donchian_chart,
  parabolic_sar: parabolic_sar_chart,

  // v5.1.1 — Super Guppy ribbon visual.
  super_guppy: super_guppy_chart,

  // v5.2.2 — Candle pattern catalogue chart.
  candle_patterns: candle_patterns_chart,
  patterns: candle_patterns_chart,
};

export function chartFor(termId: string): ChartSpec | null {
  return CHART_SPECS[termId] ?? null;
}
