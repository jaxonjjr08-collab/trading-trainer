// v2.4 — Macro context briefings. A pre-scenario card that grounds a
// beginner in *why* the historical chart played out the way it did.
// "BTC ran from $42k to $49k" makes more sense once you know the spot ETFs
// just got approved that week.
//
// Derived from the first visible candle's timestamp — no per-scenario
// authoring needed. Each entry covers a window of weeks/months and returns
// a one-paragraph brief. Beginners optionally read it before the chart;
// experienced users can dismiss the panel.

type MacroEvent = {
  startSec: number; // inclusive
  endSec: number;   // exclusive
  brief: string;
};

function date(yyyyMmDd: string): number {
  return Math.floor(Date.parse(yyyyMmDd + "T00:00:00Z") / 1000);
}

// Crypto-relevant macro events. Add new entries chronologically — overlapping
// windows resolve to the most-recent match.
const EVENTS: MacroEvent[] = [
  {
    startSec: date("2020-01-01"),
    endSec: date("2020-04-15"),
    brief:
      "Q1 2020 — the COVID-19 panic. Global equities printed circuit breakers and crypto correlated hard into the sell-off. The 'BTC is uncorrelated' narrative broke first when global liquidity tightened. Realized volatility expanded multiple times beyond normal range; leverage was deadly.",
  },
  {
    startSec: date("2021-01-01"),
    endSec: date("2021-05-01"),
    brief:
      "Spring 2021 — the post-COVID rally peaked. Coinbase listed on April 14 ($COIN), pulling extreme retail attention. Funding rates spiked across all venues for weeks before the listing. The 'sell-the-news' pattern textbook played out within two weeks of the IPO.",
  },
  {
    startSec: date("2021-05-01"),
    endSec: date("2021-07-01"),
    brief:
      "May 2021 — the Musk Tesla-stops-accepting-Bitcoin tweet, followed by China renewing its mining ban. Funding flipped negative, liquidity thinned, and the market wicked both directions over 48 hours. Cross-headline whipsaws are particularly punishing for any leverage above 5×.",
  },
  {
    startSec: date("2021-10-15"),
    endSec: date("2022-01-01"),
    brief:
      "Late 2021 — BTC printed its all-time high of ~$69k in early November. Retail attention peaked; funding rates were 0.05%+ on all major venues; the 'we're going to $100k by year end' narrative dominated crypto Twitter. The high ended up holding as the cycle top for 28 months.",
  },
  {
    startSec: date("2022-04-01"),
    endSec: date("2022-07-15"),
    brief:
      "May–June 2022 — the contagion period. Terra/LUNA imploded on May 9–12 ($60B+ ecosystem wipe). Celsius paused withdrawals on June 12 citing 'extreme conditions.' Every long-held support became a forced-seller flush. Macro: the Fed was hiking aggressively into multi-decade inflation prints.",
  },
  {
    startSec: date("2022-10-01"),
    endSec: date("2023-01-15"),
    brief:
      "Q4 2022 — FTX/Alameda contagion. FTX paused withdrawals on November 8; bankruptcy on November 11. BTC broke the multi-month $20k floor on the same day and lost $5k in 72 hours. Risk: every exchange's solvency was being re-evaluated; the 'not your keys, not your coins' message landed for real.",
  },
  {
    startSec: date("2023-06-01"),
    endSec: date("2023-10-01"),
    brief:
      "Summer 2023 — quiet, low-volatility post-bear-market range. Multi-month chop between $25k and $32k on declining volume. The clean technical breakdowns and reclaims still tradeable, but conviction was low across the board. Headlines focused on BlackRock filing its spot ETF in June.",
  },
  {
    startSec: date("2023-10-01"),
    endSec: date("2024-01-10"),
    brief:
      "Q4 2023 — BlackRock ETF anticipation. BTC reclaimed $30k in October, ran to $34k, then $44k by year-end as ETF approval timeline firmed. The 'priced in vs. flow' question became the central debate. GBTC's discount to NAV compressed in anticipation of the conversion.",
  },
  {
    startSec: date("2024-01-10"),
    endSec: date("2024-04-01"),
    brief:
      "Q1 2024 — spot BTC ETFs approved January 10. Initial sell-the-news from $49k down to $38k as GBTC redemptions averaged $400M/day for the first three weeks. Once GBTC outflows normalized in mid-February, BTC ran from $48k to a new ATH at $73.8k by mid-March.",
  },
  {
    startSec: date("2024-04-15"),
    endSec: date("2024-07-15"),
    brief:
      "Spring 2024 — post-halving (April 20) and post-ATH consolidation. BTC chopped between $57k and $68k. Geopolitical risk spikes (Iran/Israel mid-April) caused weekend liquidations. The big themes were ETF flow normalization and the lack of fresh retail attention.",
  },
  {
    startSec: date("2024-07-15"),
    endSec: date("2024-09-15"),
    brief:
      "August 2024 — the yen carry trade unwind. On August 5, the Nikkei printed its largest single-day drop since 1987 and crypto cascaded with it. BTC wicked from $58k to $49k inside hours; ETH dropped from $2.7k to $2.1k. Cross-asset deleveraging events are the most dangerous regime for crypto leverage.",
  },
  {
    startSec: date("2024-09-15"),
    endSec: date("2024-11-05"),
    brief:
      "September–October 2024 — pre-election positioning. BTC reclaimed structure from $52k, ran toward $70k. Election outcome (November 5) was the dominant catalyst; positioning concentrated in the days before. The 'priced in vs. realized' debate ran hot in both directions.",
  },
  {
    startSec: date("2024-11-05"),
    endSec: date("2025-01-20"),
    brief:
      "Late 2024 — post-election parabola. BTC ran from $69k to a fresh ATH near $108k by mid-December. Funding rates hit multi-cycle highs. ETH followed BTC into a 30%+ rally. The $100k psychological level became a magnet — first touch wicked through and rejected hard before being reclaimed weeks later.",
  },
  {
    startSec: date("2025-01-20"),
    endSec: date("2025-06-01"),
    brief:
      "Q1 2025 — post-ATH consolidation. BTC ranged between $92k and $108k for weeks; the $100k psychological level acted as both magnet and barrier. Macro: rate-cut expectations shifted, equity volatility expanded. Crypto-specific narratives quieted; technical structure was the dominant signal.",
  },
];

export function macroContextForTime(timeSec: number): string | null {
  // Iterate in reverse to prefer the most recent matching window.
  for (let i = EVENTS.length - 1; i >= 0; i--) {
    const e = EVENTS[i];
    if (timeSec >= e.startSec && timeSec < e.endSec) return e.brief;
  }
  return null;
}
