"use client";

// v2.5 — First-time consent modal for AI features. Required before any AI
// call fires. Explains the data flow, where the key is stored, and rough
// cost so the user can make an informed decision. Acceptance writes a
// timestamp via markAiConsent(); dismissal leaves consent absent and the
// caller is responsible for keeping the toggle off.

import { useEffect } from "react";

type Props = {
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
};

export default function AIConsentModal({ open, onAccept, onDismiss }: Props) {
  // Trap Esc to dismiss while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
    >
      <div className="max-w-lg w-full rounded-md border-2 border-accent/50 bg-panel p-6 space-y-4 shadow-2xl">
        <div>
          <div className="text-xs uppercase tracking-wide text-accent">Heads up</div>
          <h2 id="ai-consent-title" className="text-xl font-bold mt-1">
            Enable AI review &amp; coach
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-text">
          The AI layer reads your decision, the scenario, and your rule-based score, then writes a personalised review
          and answers follow-up questions. It's not a market predictor — it's a study coach.
        </p>

        <div className="rounded-md border border-line bg-panel2 p-3 space-y-2 text-xs text-text">
          <div className="text-[10px] uppercase tracking-wider text-muted">What this means</div>
          <ul className="space-y-1.5 list-disc pl-4 leading-snug">
            <li>
              <span className="font-semibold">Each AI call sends data to Anthropic.</span> Specifically: the scenario
              metadata, your decision values, your thesis/invalidation text, your score, and your chat history. Nothing
              else.
            </li>
            <li>
              <span className="font-semibold">You bring your own API key.</span> Stored in this browser's localStorage.
              Anyone with access to this browser profile can read it. Don't use a production key.
            </li>
            <li>
              <span className="font-semibold">You pay per call.</span> ~$0.005 per review on Haiku (default) or ~$0.02
              on Sonnet. Chat follow-ups are cheaper thanks to prompt caching.
            </li>
            <li>
              <span className="font-semibold">You can revoke any time.</span> Settings → Revoke clears consent. Cached
              reviews stay readable; no new calls fire.
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-muted leading-snug italic">
          The app calls api.anthropic.com directly from your browser using the
          anthropic-dangerous-direct-browser-access header. Your key never leaves this device for any other reason.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm border border-line bg-panel2 text-text px-4 py-2 rounded-md hover:bg-panel"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="text-sm font-semibold bg-accent text-white px-5 py-2 rounded-md hover:opacity-90"
          >
            I understand — enable
          </button>
        </div>
      </div>
    </div>
  );
}
