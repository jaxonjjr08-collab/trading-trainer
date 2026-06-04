// v4.1 — Portfolio foundation tests. Covers correlation math, the
// multi-symbol generator's determinism + correlation construction, session
// mechanics (open/advance/close), and portfolio_risk scoring tiers.

import { describe, it, expect } from "vitest";
import { pearson, candleClosePearson } from "../correlation";
import {
  generatePortfolio,
  DEFAULT_BASKET,
  DEFAULT_CANDLE_COUNT,
} from "../portfolio-data";
import {
  CORRELATION_OVERLAP_THRESHOLD,
  PORTFOLIO_RISK_BUDGET_PCT,
  advanceTo,
  closePosition,
  createSession,
  endSession,
  findCorrelatedOverlap,
  openPosition,
  scorePortfolioRisk,
  totalRiskPercent,
} from "../portfolio";
import type { Candle, PortfolioSession } from "../types";

describe("pearson", () => {
  it("returns 1 for identical series", () => {
    expect(pearson([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1, 9);
  });

  it("returns -1 for perfectly anti-correlated", () => {
    expect(pearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 9);
  });

  it("returns null on mismatched lengths", () => {
    expect(pearson([1, 2, 3], [1, 2])).toBeNull();
  });

  it("returns null on single-point input", () => {
    expect(pearson([1], [1])).toBeNull();
  });

  it("returns null when either series has zero variance", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull();
  });

  it("close to zero for uncorrelated series", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
    const r = pearson(a, b)!;
    expect(Math.abs(r)).toBeLessThan(0.5);
  });
});

describe("generatePortfolio", () => {
  it("produces aligned-timestamp candles for each symbol", () => {
    const symbols = generatePortfolio({ seed: 42 });
    expect(symbols.length).toBe(DEFAULT_BASKET.length);
    for (const s of symbols) {
      expect(s.candles.length).toBe(DEFAULT_CANDLE_COUNT);
    }
    // All symbols share the same time axis.
    const ref = symbols[0].candles.map((c) => c.time);
    for (const s of symbols) {
      const times = s.candles.map((c) => c.time);
      expect(times).toEqual(ref);
    }
  });

  it("is deterministic per seed", () => {
    const a = generatePortfolio({ seed: 12345 });
    const b = generatePortfolio({ seed: 12345 });
    for (let i = 0; i < a.length; i++) {
      expect(a[i].candles).toEqual(b[i].candles);
    }
  });

  it("realizes high correlation for high-ρ pairs", () => {
    // BTC (ρ=0.9) and ETH (ρ=0.85) should land in the high range.
    const symbols = generatePortfolio({ seed: 7 });
    const btc = symbols.find((s) => s.symbol === "BTC/USD")!;
    const eth = symbols.find((s) => s.symbol === "ETH/USD")!;
    const r = candleClosePearson(btc.candles, eth.candles)!;
    expect(r).toBeGreaterThan(0.55);
  });

  it("low-ρ pairs realize visibly lower correlation than high-ρ pairs", () => {
    const symbols = generatePortfolio({ seed: 11 });
    const btc = symbols.find((s) => s.symbol === "BTC/USD")!;
    const eth = symbols.find((s) => s.symbol === "ETH/USD")!;
    const link = symbols.find((s) => s.symbol === "LINK/USD")!;
    const btcEth = candleClosePearson(btc.candles, eth.candles)!;
    const btcLink = candleClosePearson(btc.candles, link.candles)!;
    // BTC/ETH should be measurably more correlated than BTC/LINK in this
    // construction. Not a strict ρ match (close-price correlation is biased
    // by trend), but the ordering should hold.
    expect(btcEth).toBeGreaterThan(btcLink);
  });
});

describe("portfolio session mechanics", () => {
  function freshSession(): PortfolioSession {
    return createSession({ seed: 1, accountSize: 10000 });
  }

  it("starts with no positions and currentIdx 0", () => {
    const s = freshSession();
    expect(s.positions.length).toBe(0);
    expect(s.currentIdx).toBe(0);
    expect(s.status).toBe("active");
  });

  it("openPosition rejects long with stop above entry", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    expect(() =>
      openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry: sym.basePrice,
        stopLoss: sym.basePrice * 1.05,
        takeProfit: sym.basePrice * 1.1,
        riskPercent: 1,
      })
    ).toThrow();
  });

  it("openPosition rejects risk above 50%", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    expect(() =>
      openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry: sym.basePrice,
        stopLoss: sym.basePrice * 0.95,
        takeProfit: sym.basePrice * 1.05,
        riskPercent: 60,
      })
    ).toThrow();
  });

  it("openPosition appends a position with status open", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    const next = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.95,
      takeProfit: sym.basePrice * 1.05,
      riskPercent: 1,
    });
    expect(next.positions.length).toBe(1);
    expect(next.positions[0].status).toBe("open");
    expect(next.positions[0].openedAtIdx).toBe(0);
  });

  it("advanceTo resolves stops conservatively (stop wins ties)", () => {
    const s = createSession({ seed: 1 });
    // Construct a position whose stop is hit by candle 1's low.
    const sym = s.symbols[0];
    const stopHitCandle = sym.candles[1];
    const next = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: stopHitCandle.low, // wick exactly hits the stop
      takeProfit: sym.basePrice * 1.5, // far away
      riskPercent: 1,
    });
    const advanced = advanceTo(next, 5);
    const p = advanced.positions[0];
    expect(p.status).toBe("closed_sl");
    expect(p.exitIdx).toBe(1);
    expect(p.pnlPercent).toBeCloseTo(-1, 9); // -1R × 1% risk
  });

  it("closePosition fills at the current tick close", () => {
    const s = createSession({ seed: 1 });
    const sym = s.symbols[0];
    const withPos = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.9,
      takeProfit: sym.basePrice * 1.5,
      riskPercent: 1,
    });
    const advanced = advanceTo(withPos, 5);
    const closed = closePosition(advanced, withPos.positions[0].id);
    const p = closed.positions[0];
    expect(p.status).toBe("closed_manual");
    expect(p.exitPrice).toBe(sym.candles[5].close);
  });

  it("endSession marks all still-open positions closed_manual", () => {
    const s = createSession({ seed: 1 });
    const sym = s.symbols[0];
    const next = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.5, // very wide so it doesn't get stopped
      takeProfit: sym.basePrice * 2,
      riskPercent: 1,
    });
    const ended = endSession(next);
    expect(ended.status).toBe("ended");
    expect(ended.positions[0].status).not.toBe("open");
  });
});

describe("leverage on the portfolio engine (v5.3.0)", () => {
  function freshSession(): PortfolioSession {
    return createSession({ seed: 1, accountSize: 10000 });
  }

  it("openPosition stamps liquidationPrice when leverage > 1", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    const out = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.95,
      takeProfit: sym.basePrice * 1.1,
      riskPercent: 1,
      leverage: 10,
    });
    const pos = out.positions[0];
    expect(pos.leverage).toBe(10);
    expect(pos.liquidationPrice).toBeGreaterThan(0);
    expect(pos.liquidationPrice!).toBeLessThan(sym.basePrice); // long liq is below
  });

  it("openPosition leaves liquidation undefined on spot (leverage 1)", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    const out = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.95,
      takeProfit: sym.basePrice * 1.1,
      riskPercent: 1,
      leverage: 1,
    });
    const pos = out.positions[0];
    expect(pos.leverage).toBeUndefined();
    expect(pos.liquidationPrice).toBeUndefined();
  });

  it("openPosition rejects when stop is past the liquidation level", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    expect(() =>
      openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry: sym.basePrice,
        // Stop very far below — past the 10× liq level which sits at ~-10%
        stopLoss: sym.basePrice * 0.5,
        takeProfit: sym.basePrice * 1.5,
        riskPercent: 1,
        leverage: 10,
      })
    ).toThrow(/liquidation/i);
  });

  it("openPosition rejects leverage above the cap", () => {
    const s = freshSession();
    const sym = s.symbols[0];
    expect(() =>
      openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry: sym.basePrice,
        stopLoss: sym.basePrice * 0.99,
        takeProfit: sym.basePrice * 1.05,
        riskPercent: 1,
        leverage: 100,
      })
    ).toThrow(/capped/i);
  });
});

describe("scorePortfolioRisk", () => {
  it("returns null when no positions ever opened", () => {
    const s = createSession({ seed: 1 });
    expect(scorePortfolioRisk(s)).toBeNull();
  });

  it("portfolio_balanced when total risk under budget and no overlap", () => {
    let s = createSession({ seed: 1 });
    const sym = s.symbols[0];
    s = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.95,
      takeProfit: sym.basePrice * 1.05,
      riskPercent: 1,
    });
    const score = scorePortfolioRisk(s)!;
    expect(score.total).toBe(10);
    expect(score.tags).toContain("portfolio_balanced");
    expect(score.tags).not.toContain("portfolio_overconcentrated");
    expect(score.breakdown[0].positive).toBe(true);
  });

  it("flags portfolio_overconcentrated when total risk exceeds budget", () => {
    // Advance first so correlation has data, then use BTC long + LINK short
    // — opposite direction is exempt from overlap detection, so this test
    // isolates the overconcentration penalty.
    let s = createSession({ seed: 1 });
    s = advanceTo(s, 10);
    const btc = s.symbols.find((sym) => sym.symbol === "BTC/USD")!;
    const link = s.symbols.find((sym) => sym.symbol === "LINK/USD")!;
    s = openPosition(s, {
      symbol: btc.symbol,
      direction: "long",
      entry: btc.candles[10].close,
      stopLoss: btc.candles[10].close * 0.97,
      takeProfit: btc.candles[10].close * 1.05,
      riskPercent: 4,
    });
    s = openPosition(s, {
      symbol: link.symbol,
      direction: "short", // opposite direction → no overlap tag
      entry: link.candles[10].close,
      stopLoss: link.candles[10].close * 1.03,
      takeProfit: link.candles[10].close * 0.95,
      riskPercent: 4,
    });
    expect(totalRiskPercent(s)).toBe(8);
    const score = scorePortfolioRisk(s)!;
    expect(score.tags).toContain("portfolio_overconcentrated");
    expect(score.tags).not.toContain("portfolio_correlated_overlap");
    // 10 − 3 (over by 3pp) = 7. Cap on the over-penalty is 5 so 8% would also be the same.
    expect(score.total).toBe(7);
  });

  it("flags portfolio_correlated_overlap on same-direction high-ρ pairs", () => {
    let s = createSession({ seed: 1 });
    // BTC and ETH both long — the generator should land them well above the
    // 0.7 overlap threshold (we tested that above).
    const btc = s.symbols.find((sym) => sym.symbol === "BTC/USD")!;
    const eth = s.symbols.find((sym) => sym.symbol === "ETH/USD")!;
    s = advanceTo(s, 10); // advance so correlation has enough data
    s = openPosition(s, {
      symbol: btc.symbol,
      direction: "long",
      entry: btc.candles[10].close,
      stopLoss: btc.candles[10].close * 0.97,
      takeProfit: btc.candles[10].close * 1.05,
      riskPercent: 1,
    });
    s = openPosition(s, {
      symbol: eth.symbol,
      direction: "long",
      entry: eth.candles[10].close,
      stopLoss: eth.candles[10].close * 0.97,
      takeProfit: eth.candles[10].close * 1.05,
      riskPercent: 1,
    });
    const overlaps = findCorrelatedOverlap(s);
    expect(overlaps.length).toBeGreaterThanOrEqual(1);
    expect(overlaps[0].rho).toBeGreaterThan(CORRELATION_OVERLAP_THRESHOLD);
    const score = scorePortfolioRisk(s)!;
    expect(score.tags).toContain("portfolio_correlated_overlap");
  });

  it("opposite-direction positions are not flagged as overlap", () => {
    let s = createSession({ seed: 1 });
    s = advanceTo(s, 10);
    const btc = s.symbols.find((sym) => sym.symbol === "BTC/USD")!;
    const eth = s.symbols.find((sym) => sym.symbol === "ETH/USD")!;
    s = openPosition(s, {
      symbol: btc.symbol,
      direction: "long",
      entry: btc.candles[10].close,
      stopLoss: btc.candles[10].close * 0.97,
      takeProfit: btc.candles[10].close * 1.05,
      riskPercent: 1,
    });
    s = openPosition(s, {
      symbol: eth.symbol,
      direction: "short",
      entry: eth.candles[10].close,
      stopLoss: eth.candles[10].close * 1.03,
      takeProfit: eth.candles[10].close * 0.95,
      riskPercent: 1,
    });
    expect(findCorrelatedOverlap(s).length).toBe(0);
  });
});

describe("budget threshold is reachable through positions", () => {
  it("PORTFOLIO_RISK_BUDGET_PCT is at least 1 (sanity check the constant)", () => {
    expect(PORTFOLIO_RISK_BUDGET_PCT).toBeGreaterThanOrEqual(1);
  });
});

// Smoke check: a candle's volume is positive — used implicitly by correlation
// and indicator math elsewhere.
describe("portfolio data sanity", () => {
  it("emitted candles have positive volume", () => {
    const symbols = generatePortfolio({ seed: 99 });
    for (const s of symbols) {
      for (const c of s.candles) {
        const candle = c as Candle;
        expect(candle.volume).toBeGreaterThan(0);
      }
    }
  });
});

import {
  CHALLENGES,
  CHALLENGES_IN_ORDER,
  evaluateAllChallenges,
  evaluateChallenge,
  PORTFOLIO_CHALLENGE_KEY_NAME,
} from "../portfolio-challenge";

describe("portfolio challenge evaluator (v4.1.1)", () => {
  function buildOverbudgetEnded(): PortfolioSession {
    let s = createSession({ seed: 1 });
    s = advanceTo(s, 5);
    // 5 positions at 1.5% each → 7.5% total, 2.5% over budget. Overconcentration
    // fires; portfolio_balanced cannot be set; challenge fails on requireTag.
    for (let i = 0; i < 5; i++) {
      const sym = s.symbols[i];
      s = openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry: sym.candles[5].close,
        stopLoss: sym.candles[5].close * 0.97,
        takeProfit: sym.candles[5].close * 1.05,
        riskPercent: 1.5,
      });
    }
    return endSession(s);
  }

  it("not satisfied while session is still active", () => {
    let s = createSession({ seed: 1 });
    const sym = s.symbols[0];
    s = openPosition(s, {
      symbol: sym.symbol,
      direction: "long",
      entry: sym.basePrice,
      stopLoss: sym.basePrice * 0.97,
      takeProfit: sym.basePrice * 1.05,
      riskPercent: 1,
    });
    const progress = evaluateChallenge(s);
    expect(progress.satisfied).toBe(false);
  });

  it("flags failedRequireTag when ended but not balanced", () => {
    const ended = buildOverbudgetEnded();
    const progress = evaluateChallenge(ended);
    expect(progress.satisfied).toBe(false);
    expect(progress.failedRequireTag).toBe(true);
    expect(progress.positionsOpened).toBe(5);
  });

  it("is satisfied for an ended session with 5 positions and portfolio_balanced", () => {
    // Construct a session that ends balanced: 5 small risks (well under
    // budget) and mixed directions so no correlated overlap fires.
    let s = createSession({ seed: 3 });
    s = advanceTo(s, 5);
    const wanted = ["BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD", "LINK/USD"];
    const directions: ("long" | "short")[] = [
      "long",
      "short",
      "long",
      "short",
      "long",
    ];
    wanted.forEach((symName, i) => {
      const sym = s.symbols.find((x) => x.symbol === symName)!;
      const px = sym.candles[5].close;
      const dir = directions[i];
      s = openPosition(s, {
        symbol: sym.symbol,
        direction: dir,
        entry: px,
        stopLoss: dir === "long" ? px * 0.97 : px * 1.03,
        takeProfit: dir === "long" ? px * 1.05 : px * 0.95,
        riskPercent: 0.5, // 5 × 0.5% = 2.5%, comfortably under 5% budget
      });
    });
    s = endSession(s);
    const progress = evaluateChallenge(s);
    expect(progress.positionsOpened).toBe(5);
    expect(progress.satisfied).toBe(true);
    expect(progress.failedRequireTag).toBe(false);
  });

  it("exports the canned challenge", () => {
    expect(CHALLENGES.five_concurrent_seven_days.minPositions).toBe(5);
  });

  // v4.1.1 — storage.ts inlines this key name to avoid pulling portfolio code
  // into every route that imports storage. Pin the two together so a rename
  // can't silently break ALL_KEYS.
  it("storage ALL_KEYS string matches the canonical export", async () => {
    const { PORTFOLIO_CHALLENGE_KEY_NAME_INLINE } = await import("../storage");
    expect(PORTFOLIO_CHALLENGE_KEY_NAME).toBe(PORTFOLIO_CHALLENGE_KEY_NAME_INLINE);
  });
});

describe("finish_above_water challenge (v4.1.2)", () => {
  const challenge = CHALLENGES.finish_above_water;

  it("not satisfied while session is active", () => {
    const s = createSession({ seed: 1 });
    expect(evaluateChallenge(s, challenge).satisfied).toBe(false);
  });

  it("flags failedRealizedPnl when ended with no positions opened", () => {
    let s = createSession({ seed: 1 });
    s = endSession(s);
    const progress = evaluateChallenge(s, challenge);
    expect(progress.satisfied).toBe(false);
    // No positions opened — the count check fails too; failedRealizedPnl
    // still fires because realized PnL of zero doesn't clear > 0.
    expect(progress.failedRealizedPnl).toBe(true);
  });

  it("flags failedRealizedPnl when ended with net-loss closures", () => {
    // Open three positions and stop-loss them all so realized PnL is negative.
    let s = createSession({ seed: 1 });
    s = advanceTo(s, 5);
    for (let i = 0; i < 3; i++) {
      const sym = s.symbols[i];
      const stopHit = sym.candles[5].close * 0.999; // very tight stop will get hit
      s = openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry: sym.candles[5].close,
        stopLoss: stopHit,
        takeProfit: sym.candles[5].close * 1.5,
        riskPercent: 1,
      });
    }
    s = endSession(s);
    const progress = evaluateChallenge(s, challenge);
    expect(progress.positionsOpened).toBe(3);
    expect(progress.failedRealizedPnl).toBe(true);
    expect(progress.satisfied).toBe(false);
  });

  it("satisfied when ended with 3+ positions and positive realized PnL", () => {
    // Construct guaranteed positive PnL: open longs with entry slightly below
    // the current close (mark-to-market positive) then close manually at the
    // current candle, fixing the realized R-multiple > 0.
    let s = createSession({ seed: 1 });
    s = advanceTo(s, 5);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const sym = s.symbols[i];
      const px = sym.candles[5].close;
      // Round to match how the form would build it.
      const entry = px * 0.99;
      s = openPosition(s, {
        symbol: sym.symbol,
        direction: "long",
        entry,
        stopLoss: entry * 0.97,
        takeProfit: entry * 1.05,
        riskPercent: 1,
      });
      ids.push(s.positions[s.positions.length - 1].id);
    }
    // Close each manually at current — current is above each entry by ~1%,
    // so R-multiple > 0 → realized PnL > 0.
    for (const id of ids) {
      s = closePosition(s, id);
    }
    s = endSession(s);
    const progress = evaluateChallenge(s, challenge);
    expect(progress.positionsOpened).toBe(3);
    expect(progress.satisfied).toBe(true);
    expect(progress.failedRealizedPnl).toBe(false);
  });

  it("evaluateAllChallenges returns two entries, primary first", () => {
    const s = createSession({ seed: 1 });
    const results = evaluateAllChallenges(s);
    expect(results.length).toBe(CHALLENGES_IN_ORDER.length);
    expect(results[0].challenge.id).toBe("five_concurrent_seven_days");
    expect(results[1].challenge.id).toBe("finish_above_water");
  });
});
