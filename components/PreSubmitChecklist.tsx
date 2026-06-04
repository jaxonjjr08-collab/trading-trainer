import type { DecisionDraft } from "./DecisionForm";

const ACCOUNT_USD = 1000;

type Item = { label: string; done: boolean; note?: string };

// v2.4 — position-sizing readout. When the user has entered direction, entry,
// stop, and risk %, surface the math beginners get wrong most often: how
// the dollar risk + stop distance dictate position size. Beginners typically
// guess at position size and back-derive risk, which is exactly backwards.
type SizingMath = {
  dollarRisk: number;       // account × risk%
  stopDistance: number;     // |entry - stop|
  positionUsd: number;      // dollarRisk / stopDistance × entry
  marginRequired: number;   // positionUsd / leverage (if leverage set)
};

function computeSizing(draft: DecisionDraft | null): SizingMath | null {
  if (!draft) return null;
  if (draft.direction === "wait") return null;
  if (draft.entry == null || draft.stopLoss == null || draft.riskPercent == null) return null;
  const stopDistance = Math.abs(draft.entry - draft.stopLoss);
  if (stopDistance <= 0) return null;
  const dollarRisk = ACCOUNT_USD * (draft.riskPercent / 100);
  const units = dollarRisk / stopDistance;
  const positionUsd = units * draft.entry;
  const marginRequired = draft.leverage && draft.leverage > 0 ? positionUsd / draft.leverage : positionUsd;
  return { dollarRisk, stopDistance, positionUsd, marginRequired };
}

function buildItems(draft: DecisionDraft | null): Item[] {
  if (!draft) {
    return [
      { label: "Choose direction (Long / Short / Wait)", done: false },
      { label: "Set entry price", done: false },
      { label: "Define stop loss", done: false },
      { label: "Define take profit", done: false },
      { label: "Choose leverage and risk %", done: false },
      { label: "Write your thesis (≥ 20 chars)", done: false },
      { label: "Write your invalidation (≥ 20 chars)", done: false },
    ];
  }

  // Direction is always set in the form (default 'long'), so show it as done.
  const dirLabel =
    draft.direction === "long" ? "Long" : draft.direction === "short" ? "Short" : "Wait";

  if (draft.direction === "wait") {
    return [
      { label: `Direction: ${dirLabel}`, done: true },
      { label: "Write your thesis (≥ 20 chars)", done: draft.thesis.length >= 20, note: `${draft.thesis.length} chars` },
      {
        label: "Write your invalidation (≥ 20 chars)",
        done: draft.invalidation.length >= 20,
        note: `${draft.invalidation.length} chars`,
      },
    ];
  }

  return [
    { label: `Direction: ${dirLabel}`, done: true },
    { label: "Set entry price", done: draft.entry != null },
    { label: "Define stop loss", done: draft.stopLoss != null },
    { label: "Define take profit", done: draft.takeProfit != null },
    { label: "Choose leverage", done: draft.leverage != null },
    { label: "Choose risk %", done: draft.riskPercent != null },
    { label: "Write your thesis (≥ 20 chars)", done: draft.thesis.length >= 20, note: `${draft.thesis.length} chars` },
    {
      label: "Write your invalidation (≥ 20 chars)",
      done: draft.invalidation.length >= 20,
      note: `${draft.invalidation.length} chars`,
    },
  ];
}

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}

export default function PreSubmitChecklist({ draft }: { draft: DecisionDraft | null }) {
  const items = buildItems(draft);
  const completed = items.filter((i) => i.done).length;
  const sizing = computeSizing(draft);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Before you submit</h2>
        <p className="text-xs text-muted mt-1">
          Process is the practice. Fill each item with intent — you'll be scored on your decision, not your outcome.
        </p>
      </div>

      <div className="text-xs text-muted">
        {completed} / {items.length} complete
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-sm border text-[10px] font-bold ${
                item.done
                  ? "bg-good/20 border-good text-good"
                  : "bg-panel2 border-line text-muted"
              }`}
              aria-label={item.done ? "complete" : "incomplete"}
            >
              {item.done ? "✓" : ""}
            </span>
            <span className={item.done ? "text-text" : "text-muted"}>
              {item.label}
              {item.note && <span className="ml-2 text-[10px] text-muted">({item.note})</span>}
            </span>
          </li>
        ))}
      </ul>

      {/* v2.4 — derived position-sizing readout. Visible once direction, entry,
          stop, and risk % are set. Shows the relationship beginners get wrong
          most often: risk % + stop distance dictate position size, not the
          other way around. */}
      {sizing && draft && (
        <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-accent">
            Position-sizing math
          </div>
          <p className="text-xs text-text leading-snug">
            At <span className="font-mono font-semibold">{draft.riskPercent}%</span> risk on a {fmtUsd(ACCOUNT_USD)} account,
            you'd lose <span className="font-mono font-semibold text-bad">{fmtUsd(sizing.dollarRisk)}</span> if your stop hits.
            With a {fmtUsd(sizing.stopDistance)} stop distance, your position should be{" "}
            <span className="font-mono font-semibold">{fmtUsd(sizing.positionUsd)}</span>
            {draft.leverage && draft.leverage > 1 && (
              <>
                {" "}
                — about <span className="font-mono font-semibold">{fmtUsd(sizing.marginRequired)}</span> of margin at {draft.leverage}×
              </>
            )}
            .
          </p>
          <p className="text-[10px] text-muted italic leading-snug">
            Position size follows from risk + stop, not the other way around. This is the math beginners get backwards most often.
          </p>
        </div>
      )}

      <div className="text-xs text-muted border-t border-line pt-3">
        You can submit at any time — missing items will be flagged in the review. The point is to notice the gaps,
        not avoid them.
      </div>
    </div>
  );
}
