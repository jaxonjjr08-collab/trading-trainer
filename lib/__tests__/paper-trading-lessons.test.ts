// v5.4.0 — Pins the priority order + trigger conditions for the
// paper-trading lesson banners. The user-visible behavior is "the right
// lesson fires at the right moment, exactly once" — a bug in the
// decision logic would show the wrong lesson or fire one twice.

import { describe, it, expect } from "vitest";
import {
  decidePaperLesson,
  type PaperLessonId,
} from "../paper-trading-lessons";
import type {
  PortfolioPosition,
  PortfolioSession,
} from "../types";

function mkSession(positions: PortfolioPosition[] = []): PortfolioSession {
  return {
    id: "s1",
    startedAt: 0,
    datasetSeed: 1,
    intervalSec: 3600,
    candleCount: 100,
    symbols: [],
    currentIdx: 0,
    positions,
    status: "active",
    accountSize: 10000,
    mode: "live",
  };
}

function mkPos(over: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: `p_${Math.random()}`,
    symbol: "BTC-USD",
    direction: "long",
    entry: 60000,
    stopLoss: 58000,
    takeProfit: 65000,
    riskPercent: 1,
    openedAtIdx: 0,
    status: "open",
    ...over,
  };
}

const empty: ReadonlySet<PaperLessonId> = new Set();

describe("decidePaperLesson", () => {
  it("returns null when there are no positions", () => {
    expect(decidePaperLesson(mkSession(), empty)).toBeNull();
  });

  it("fires first_trade for the very first position", () => {
    const out = decidePaperLesson(mkSession([mkPos()]), empty);
    expect(out?.id).toBe("first_trade");
  });

  it("upgrades to first_leverage when leverage > 1 is in play", () => {
    const out = decidePaperLesson(
      mkSession([mkPos({ leverage: 5 })]),
      empty
    );
    expect(out?.id).toBe("first_leverage");
  });

  it("upgrades to first_high_leverage when leverage >= 10", () => {
    const out = decidePaperLesson(
      mkSession([mkPos({ leverage: 10 })]),
      empty
    );
    expect(out?.id).toBe("first_high_leverage");
  });

  it("liquidation takes precedence over every other lesson", () => {
    const out = decidePaperLesson(
      mkSession([
        mkPos({
          leverage: 25,
          status: "closed_liq",
          exitPrice: 55000,
          pnlPercent: -25,
        }),
      ]),
      empty
    );
    expect(out?.id).toBe("first_liquidation");
  });

  it("respects the seen set — skips already-dismissed lessons", () => {
    const seen = new Set<PaperLessonId>(["first_trade"]);
    const out = decidePaperLesson(mkSession([mkPos()]), seen);
    // No leverage; first_trade dismissed; first_short doesn't apply on a
    // long. So we expect null.
    expect(out).toBeNull();
  });

  it("fires losing_streak after 3 consecutive closed losses", () => {
    const loser = (i: number): PortfolioPosition =>
      mkPos({
        id: `p${i}`,
        status: "closed_sl",
        exitPrice: 58000,
        pnlPercent: -1,
      });
    const session = mkSession([loser(1), loser(2), loser(3)]);
    const seen = new Set<PaperLessonId>(["first_trade"]);
    const out = decidePaperLesson(session, seen);
    expect(out?.id).toBe("losing_streak");
  });

  it("does NOT fire losing_streak when one of the three is a win", () => {
    const loser: PortfolioPosition = mkPos({
      status: "closed_sl",
      pnlPercent: -1,
    });
    const winner: PortfolioPosition = mkPos({
      id: "p_win",
      status: "closed_tp",
      pnlPercent: 2,
    });
    const session = mkSession([loser, winner, loser]);
    const seen = new Set<PaperLessonId>([
      "first_trade",
    ]);
    const out = decidePaperLesson(session, seen);
    expect(out?.id).not.toBe("losing_streak");
  });

  it("fires first_short for a short position when first_trade is seen", () => {
    const seen = new Set<PaperLessonId>(["first_trade"]);
    const out = decidePaperLesson(
      mkSession([mkPos({ direction: "short" })]),
      seen
    );
    expect(out?.id).toBe("first_short");
  });
});
