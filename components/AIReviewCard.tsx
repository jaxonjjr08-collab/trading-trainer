"use client";

// v2.5 — AI Review Card. Auto-runs on submit (when AI is enabled and consent
// has been granted). Streams the response token-by-token. Caches the final
// text by attempt.id so revisiting the journal shows it instantly without
// re-billing.
//
// Failure modes are surfaced inline: invalid key, rate limits, network
// errors all show a clean message + Retry. The rest of the review panel
// (rule-based score, BestDecisionCard) is unaffected.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Attempt, Scenario } from "@/lib/types";
import {
  cacheReview,
  clearCachedReview,
  getAiKey,
  getAiModel,
  getCachedReview,
  hasAiConsent,
  isAiEnabled,
} from "@/lib/storage";
import {
  AIApiError,
  AIConfigError,
  buildSystemPrompt,
  friendlyApiError,
  modelLabel,
  REVIEW_USER_PROMPT,
  streamCompletion,
} from "@/lib/ai";

type Props = {
  attempt: Attempt;
  scenario: Scenario;
};

type State =
  | { kind: "idle" }
  | { kind: "loading"; text: string }
  | { kind: "done"; text: string; model: string }
  | { kind: "error"; message: string };

export default function AIReviewCard({ attempt, scenario }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [enabledLive, setEnabledLive] = useState(false);
  const triggeredFor = useRef<string | null>(null);

  const run = useCallback(
    async (regenerate = false) => {
      if (!isAiEnabled() || !hasAiConsent()) {
        setState({ kind: "idle" });
        return;
      }
      if (!getAiKey()) {
        setState({
          kind: "error",
          message: "No Anthropic API key configured. Open Settings → AI features to paste one.",
        });
        return;
      }
      if (regenerate) clearCachedReview(attempt.id);

      const system = buildSystemPrompt(scenario, attempt);
      const messages = [{ role: "user" as const, content: REVIEW_USER_PROMPT }];
      const model = getAiModel();

      setState({ kind: "loading", text: "" });
      try {
        let acc = "";
        for await (const chunk of streamCompletion(system, messages, { model, maxTokens: 600 })) {
          acc += chunk;
          setState({ kind: "loading", text: acc });
        }
        const final = acc.trim();
        if (final.length === 0) {
          setState({ kind: "error", message: "AI returned an empty response. Try regenerating." });
          return;
        }
        setState({ kind: "done", text: final, model });
        cacheReview(attempt.id, { model, text: final, createdAt: Date.now() });
      } catch (e) {
        if (e instanceof AIConfigError) {
          setState({ kind: "error", message: e.message });
        } else if (e instanceof AIApiError) {
          setState({ kind: "error", message: friendlyApiError(e) });
        } else {
          setState({ kind: "error", message: (e as Error).message });
        }
      }
    },
    [attempt, scenario]
  );

  // On mount (and whenever attempt.id changes): load cached, or fire the
  // initial stream. Guarded so we don't re-trigger on parent re-renders.
  useEffect(() => {
    const enabled = isAiEnabled() && hasAiConsent();
    setEnabledLive(enabled);
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    if (triggeredFor.current === attempt.id) return;
    triggeredFor.current = attempt.id;
    const cached = getCachedReview(attempt.id);
    if (cached) {
      setState({ kind: "done", text: cached.text, model: cached.model });
      return;
    }
    void run();
  }, [attempt.id, run]);

  // When AI is disabled / no consent, render nothing — the rest of the
  // review panel handles its own messaging.
  if (!enabledLive) return null;

  return (
    <div className="rounded-md border-2 border-accent/40 bg-accent/5 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-accent">AI review</div>
          <p className="text-[11px] text-muted mt-0.5">
            Personalised feedback on your decision — names your numbers and contrasts with the ideal plan.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state.kind === "done" && (
            <span className="text-[10px] uppercase tracking-wider text-accent border border-accent/40 bg-accent/10 px-2 py-0.5 rounded">
              {modelLabel(state.model as ReturnType<typeof getAiModel>) || state.model}
            </span>
          )}
          {(state.kind === "done" || state.kind === "error") && (
            <button
              type="button"
              onClick={() => void run(true)}
              className="text-xs border border-line bg-panel px-2 py-1 rounded-md hover:bg-panel2"
              title="Re-run the AI review (uses a fresh API call)"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {state.kind === "loading" && (
        <div className="space-y-2">
          {state.text.length === 0 ? (
            <div className="text-sm text-muted italic">Streaming review…</div>
          ) : (
            <ReviewText text={state.text} streaming />
          )}
        </div>
      )}

      {state.kind === "done" && <ReviewText text={state.text} streaming={false} />}

      {state.kind === "error" && (
        <div className="rounded-md border border-bad/40 bg-bad/5 p-3 text-sm text-bad space-y-2">
          <p>{state.message}</p>
          <button
            type="button"
            onClick={() => void run(true)}
            className="text-xs font-semibold border border-bad/50 bg-bad/10 text-bad px-3 py-1 rounded-md hover:bg-bad/20"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewText({ text, streaming }: { text: string; streaming: boolean }) {
  // Split on double-newline to render paragraphs. Anthropic's 3-paragraph
  // response uses \n\n; defensive .split handles single-newline fallback.
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <div className="space-y-2">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm text-text leading-relaxed whitespace-pre-wrap">
          {p}
          {streaming && i === paragraphs.length - 1 && (
            <span className="inline-block w-1.5 h-3 ml-0.5 align-baseline bg-accent animate-pulse" aria-hidden />
          )}
        </p>
      ))}
    </div>
  );
}
