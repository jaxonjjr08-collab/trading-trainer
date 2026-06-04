import { SETUP_TYPE_LABELS } from "@/lib/scenarios";
import type { Scenario } from "@/lib/types";

type Props = { scenario: Scenario };

// Study mode panel. Shows learning focus + a setup-specific hint.
// Never reveals preferred decision, outcome, or anything that gives away the answer.
const HINTS: Record<Scenario["setupType"], string> = {
  trend_continuation:
    "Inside an uptrend, ask: where would a higher-low form, and what closes below it would prove the trend is over?",
  failed_breakout:
    "When a level has no price history above (or below) it, the first reaction is unreliable. What would a clean retest look like?",
  range_chop:
    "From the middle of a range, both opposing levels are roughly equidistant. What R:R can you realistically build here?",
  support_breakdown:
    "Broken support often retests as resistance. Where would a lower-high form, and what closes above it would invalidate the breakdown?",
  overextended:
    "How many candles since the last meaningful pullback? Where would the stop have to sit if you took this now?",
  liquidity_sweep:
    "A sweep below a level that closes back inside is a different signal than a clean break. What's the invalidation if price re-loses the swept low?",
  clean_retest:
    "After a clean break, the same level tested from the other side is the highest-R:R entry. Where exactly is invalidation?",
  leverage_trap:
    "Tight coils tempt high leverage because the stop is small. Compare your stop distance to the typical wick range of the last 20 candles.",
  news_volatility:
    "Post-news bars are noise, not structure. What stop distance would survive another bar like the last one?",
  no_setup:
    "Try writing a one-sentence thesis that points to a specific level being respected. If you can't find one, what does that suggest about your edge here?",
};

export default function StudyHints({ scenario }: Props) {
  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent">
        <span>Study mode</span>
        <span className="text-muted normal-case tracking-normal">·</span>
        <span className="text-muted normal-case tracking-normal">{SETUP_TYPE_LABELS[scenario.setupType]} · {scenario.difficulty}</span>
      </div>
      <div>
        <div className="text-xs font-semibold text-text mb-0.5">Learning focus</div>
        <p className="text-xs text-muted leading-snug">{scenario.learningFocus}</p>
      </div>
      <div>
        <div className="text-xs font-semibold text-text mb-0.5">Hint</div>
        <p className="text-xs text-muted leading-snug">{HINTS[scenario.setupType]}</p>
      </div>
      <p className="text-[10px] text-muted italic">
        The preferred decision and the outcome are hidden until you submit — even in Study mode.
      </p>
    </div>
  );
}
