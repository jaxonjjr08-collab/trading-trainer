"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearAll,
  clearAllQuiz,
  exportAllData,
  importAllData,
  resetAllLocalData,
} from "@/lib/storage";
import { getDailyGoal, setDailyGoal } from "@/lib/streak";
import {
  clearAiKey,
  clearOpenAiKey,
  clearWatchMeDone,
  getAiKey,
  getAiModel,
  getAiProvider,
  getDecisionDefaults,
  getOpenAiKey,
  getOpenAiModel,
  hasAiConsent,
  isAiEnabled,
  isForceLessonsEnabled,
  isWatchMeDone,
  markAiConsent,
  revokeAiConsent,
  setAiEnabled,
  setAiKey,
  setAiModel,
  setAiProvider,
  setDecisionDefaults,
  setForceLessonsEnabled,
  setOpenAiKey,
  setOpenAiModel,
  type AiModel,
  type AiProvider,
  type DecisionDefaults,
  type OpenAiModel,
} from "@/lib/storage";
import AIConsentModal from "./AIConsentModal";

type Status = { tone: "good" | "bad" | "muted"; text: string } | null;

export default function DataManagement({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [goal, setGoalState] = useState(3);
  const [forceLessons, setForceLessonsState] = useState(true);
  // v2.3 — Watch-me walkthrough state. Read on mount, also recomputed after
  // the reset button is clicked so the button label flips.
  const [watchMeDone, setWatchMeDoneState] = useState(false);
  // v2.5 — AI features. State mirrors localStorage so the panel UI is
  // controlled. Saving fires on every change so there's no "Save" button.
  // v5.10.5 — provider toggle + parallel OpenAI key/model state. Each
  // provider's key is kept independently so flipping the radio doesn't blow
  // away whichever key you typed for the other one.
  const [aiEnabled, setAiEnabledState] = useState(false);
  const [aiProvider, setAiProviderState] = useState<AiProvider>("anthropic");
  const [aiKey, setAiKeyState] = useState("");
  const [aiModel, setAiModelState] = useState<AiModel>("claude-haiku-4-5-20251001");
  const [openAiKey, setOpenAiKeyState] = useState("");
  const [openAiModel, setOpenAiModelState] = useState<OpenAiModel>("gpt-4o-mini");
  const [aiConsent, setAiConsentState] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showKey, setShowKey] = useState(false);
  // v2.9 — trading defaults state. Saved on every change (debounce-free; the
  // input handlers commit on blur to avoid writing per-keystroke).
  const [defaults, setDefaultsState] = useState<DecisionDefaults>({
    riskPercent: 1,
    leverage: 3,
    accountSize: 1000,
  });

  useEffect(() => {
    setGoalState(getDailyGoal());
    setForceLessonsState(isForceLessonsEnabled());
    setWatchMeDoneState(isWatchMeDone());
    setAiEnabledState(isAiEnabled());
    setAiProviderState(getAiProvider());
    setAiKeyState(getAiKey());
    setAiModelState(getAiModel());
    setOpenAiKeyState(getOpenAiKey());
    setOpenAiModelState(getOpenAiModel());
    setAiConsentState(hasAiConsent());
    setDefaultsState(getDecisionDefaults());
  }, []);

  function handleDefaultChange<K extends keyof DecisionDefaults>(key: K, value: number) {
    const next = setDecisionDefaults({ [key]: value } as Partial<DecisionDefaults>);
    setDefaultsState(next);
  }

  function handleAiToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (next && !aiConsent) {
      // First-time enable: gate behind consent modal. Don't flip the toggle
      // until the user accepts.
      setShowConsentModal(true);
      return;
    }
    setAiEnabled(next);
    setAiEnabledState(next);
  }

  function handleConsentAccept() {
    markAiConsent();
    setAiConsentState(true);
    setAiEnabled(true);
    setAiEnabledState(true);
    setShowConsentModal(false);
    show("good", "AI features enabled. Pick a provider and paste your API key below to start.");
  }

  function handleConsentDismiss() {
    setShowConsentModal(false);
  }

  function handleAiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setAiKeyState(v);
    setAiKey(v);
  }

  function handleClearKey() {
    clearAiKey();
    setAiKeyState("");
    show("muted", "API key cleared.");
  }

  function handleAiModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as AiModel;
    setAiModelState(v);
    setAiModel(v);
  }

  // v5.10.5 — OpenAI handlers + provider switch. Switching provider just
  // updates the radio + storage; both keys stay saved on their own slots.
  function handleProviderChange(p: AiProvider) {
    setAiProviderState(p);
    setAiProvider(p);
  }
  function handleOpenAiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setOpenAiKeyState(v);
    setOpenAiKey(v);
  }
  function handleClearOpenAiKey() {
    clearOpenAiKey();
    setOpenAiKeyState("");
    show("muted", "OpenAI key cleared.");
  }
  function handleOpenAiModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as OpenAiModel;
    setOpenAiModelState(v);
    setOpenAiModel(v);
  }

  function handleRevokeAi() {
    if (!confirm("Revoke AI consent and disable AI features? Your cached reviews stay; no new calls will fire.")) return;
    revokeAiConsent();
    setAiConsentState(false);
    setAiEnabledState(false);
    show("muted", "AI consent revoked.");
  }

  function handleResetWatchMe() {
    clearWatchMeDone();
    setWatchMeDoneState(false);
    show("good", "Watch-me walkthrough will fire on your next Practice visit (with zero saved attempts).");
  }

  function handleGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (!Number.isFinite(n)) return;
    setDailyGoal(n);
    setGoalState(getDailyGoal());
    // Nudge any mounted StreakBadge / DailyProgressWidget to re-read.
    window.dispatchEvent(new CustomEvent("trainer:streak-updated"));
  }

  function handleForceLessonsToggle(e: React.ChangeEvent<HTMLInputElement>) {
    setForceLessonsEnabled(e.target.checked);
    setForceLessonsState(e.target.checked);
  }

  function show(tone: "good" | "bad" | "muted", text: string) {
    setStatus({ tone, text });
  }

  function handleClearJournal() {
    if (!confirm("Delete every saved practice attempt? This cannot be undone.")) return;
    clearAll();
    show("muted", "Journal cleared.");
  }

  function handleClearQuiz() {
    if (!confirm("Delete all quiz attempts? This cannot be undone.")) return;
    clearAllQuiz();
    show("muted", "Quiz progress cleared.");
  }

  function handleResetAll() {
    if (!confirm("Reset every local datum — journal, quizzes, diagnostic, drill. This cannot be undone.")) return;
    resetAllLocalData();
    show("muted", "All local data reset.");
  }

  function handleExport() {
    const payload = exportAllData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date(payload.exportedAt).toISOString().replace(/[:.]/g, "-");
    a.download = `trading-trainer-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    show("good", "Export downloaded.");
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    e.target.value = ""; // allow same file again
    if (
      !confirm(
        "Importing overwrites your matching local data with the file's contents (anything the file doesn't contain is left as-is). Continue?"
      )
    ) {
      return;
    }
    const result = importAllData(text);
    if (!result.ok) {
      show("bad", `Import failed: ${result.error}`);
      return;
    }
    const i = result.imported!;
    show(
      "good",
      `Imported ${i.attempts} attempts, ${i.quizAttempts} quiz attempts${
        i.diagnostic ? ", diagnostic" : ""
      }${i.activeDrill ? ", drill state" : ""}.`
    );
  }

  return (
    <div className="rounded-md border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-panel2"
      >
        <span className="font-semibold">Data management</span>
        <span className="text-xs text-muted">
          {open ? "Hide" : "Show"} · all local-only
        </span>
      </button>
      {open && (
        <div className="border-t border-line p-4 space-y-3">
          <p className="text-xs text-muted">
            Everything lives in your browser's localStorage. Export saves a full snapshot of your
            progress and settings &mdash; journal, streak, goal, bookmarks, defaults, chart prefs and
            sessions &mdash; to a JSON file (your API keys are never included). Import restores it here
            or on another browser. Clearing is not reversible.
          </p>

          {/* v2.1 Phase 3 — daily goal control */}
          <label className="flex items-center gap-3 text-sm">
            <span className="text-muted">Daily practice goal:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={goal}
              onChange={handleGoalChange}
              className="w-16 bg-panel2 border border-line text-text text-sm px-2 py-1 rounded"
            />
            <span className="text-xs text-muted">attempts per day (1–20)</span>
          </label>

          {/* v2.9 — trading defaults. Prefilled into the DecisionForm on every
              new attempt. Saving on change (no Save button) keeps it consistent
              with daily-goal above. */}
          <div className="rounded-md border border-line bg-panel2/50 p-3 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted">Trading defaults</div>
            <p className="text-xs text-muted leading-snug">
              Prefilled into new attempts so you don't re-enter the same numbers each scenario. Changing here doesn't affect attempts already saved.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="block text-sm">
                <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                  Default risk %
                </span>
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={defaults.riskPercent}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n > 0) handleDefaultChange("riskPercent", n);
                  }}
                  className="w-full bg-panel border border-line text-text text-sm px-2 py-1 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                  Default leverage
                </span>
                <input
                  type="number"
                  min={1}
                  max={125}
                  step={1}
                  value={defaults.leverage}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 1) handleDefaultChange("leverage", n);
                  }}
                  className="w-full bg-panel border border-line text-text text-sm px-2 py-1 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                  Account size ($)
                </span>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={defaults.accountSize}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n > 0) handleDefaultChange("accountSize", n);
                  }}
                  className="w-full bg-panel border border-line text-text text-sm px-2 py-1 rounded"
                />
              </label>
            </div>
          </div>

          {/* v2.1 Phase 4 — micro-lesson interrupt toggle */}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={forceLessons}
              onChange={handleForceLessonsToggle}
              className="mt-0.5 cursor-pointer"
            />
            <span className="flex-1">
              <span className="text-text">Show forced refresher lessons</span>
              <span className="block text-xs text-muted">
                When you repeat the same mistake 3+ times in 10 attempts, the matching Learn term
                is shown before your score. Disabling this defeats most of the trainer's point.
              </span>
            </span>
          </label>

          {/* v2.3 — Watch-me walkthrough reset. Lets a user re-run the first-
              attempt demo on a clean slate (clearing the journal also resets
              it implicitly via resetAllLocalData). */}
          <div className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 w-4 h-4 flex items-center justify-center">
              <span className={watchMeDone ? "text-good" : "text-muted"} aria-hidden>
                {watchMeDone ? "✓" : "·"}
              </span>
            </div>
            <span className="flex-1">
              <span className="text-text">Watch-me walkthrough</span>
              <span className="block text-xs text-muted">
                {watchMeDone
                  ? "You've completed (or skipped) the first-attempt demo. Click reset to fire it again on your next Practice visit with zero saved attempts."
                  : "The first-attempt demo will fire on your next Practice visit (once you have zero saved attempts)."}
              </span>
              {watchMeDone && (
                <button
                  type="button"
                  onClick={handleResetWatchMe}
                  className="mt-1.5 text-xs font-semibold border border-line bg-panel px-3 py-1.5 rounded-md hover:bg-panel2"
                >
                  Reset walkthrough
                </button>
              )}
            </span>
          </div>

          {/* v2.5 — AI features (BYOK). Off by default; toggling on opens a
              consent modal explaining data flow + cost. Key stored in
              localStorage. Model selectable Haiku/Sonnet. */}
          <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={handleAiToggle}
                className="mt-0.5 cursor-pointer"
              />
              <span className="flex-1">
                <span className="text-text font-semibold">Enable AI review &amp; coach</span>
                <span className="block text-xs text-muted leading-snug mt-0.5">
                  Adds an AI-written review after each submit and a follow-up chat. Requires your own API key —
                  Anthropic (Claude) or OpenAI (ChatGPT). Off by default. Each call sends your decision and the
                  scenario to the provider you choose.
                </span>
              </span>
            </label>

            {aiEnabled && (
              <>
                {/* v5.10.5 — provider picker. Radio over a buttons-look so it's
                    obvious you're choosing ONE service, not toggling features. */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted block">Provider</label>
                  <div className="inline-flex rounded-md border border-line overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleProviderChange("anthropic")}
                      className={`text-xs font-semibold px-3 py-1.5 ${
                        aiProvider === "anthropic"
                          ? "bg-accent/20 text-accent"
                          : "bg-panel2 text-muted hover:text-text"
                      }`}
                      aria-pressed={aiProvider === "anthropic"}
                    >
                      Anthropic (Claude)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProviderChange("openai")}
                      className={`text-xs font-semibold px-3 py-1.5 border-l border-line ${
                        aiProvider === "openai"
                          ? "bg-accent/20 text-accent"
                          : "bg-panel2 text-muted hover:text-text"
                      }`}
                      aria-pressed={aiProvider === "openai"}
                    >
                      OpenAI (ChatGPT)
                    </button>
                  </div>
                </div>

                {aiProvider === "anthropic" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted block">Anthropic API key</label>
                      <div className="flex gap-2">
                        <input
                          type={showKey ? "text" : "password"}
                          value={aiKey}
                          onChange={handleAiKeyChange}
                          placeholder="sk-ant-..."
                          autoComplete="off"
                          className="flex-1 bg-panel border border-line text-text text-xs px-2 py-1.5 rounded-md font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="text-xs border border-line bg-panel2 px-2 py-1 rounded-md hover:bg-panel"
                        >
                          {showKey ? "Hide" : "Show"}
                        </button>
                        {aiKey.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearKey}
                            className="text-xs text-bad border border-bad/40 bg-bad/5 px-2 py-1 rounded-md hover:bg-bad/10"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted">
                        Get a key at <span className="font-mono">console.anthropic.com</span>. Stored locally — anyone with
                        access to this browser can read it.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted block">Model</label>
                      <select
                        value={aiModel}
                        onChange={handleAiModelChange}
                        className="bg-panel border border-line text-text text-xs px-2 py-1.5 rounded-md"
                      >
                        <option value="claude-haiku-4-5-20251001">Haiku 4.5 — fast, ~$0.005/review</option>
                        <option value="claude-sonnet-4-6">Sonnet 4.6 — deeper, ~$0.02/review</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted block">OpenAI API key</label>
                      <div className="flex gap-2">
                        <input
                          type={showKey ? "text" : "password"}
                          value={openAiKey}
                          onChange={handleOpenAiKeyChange}
                          placeholder="sk-..."
                          autoComplete="off"
                          className="flex-1 bg-panel border border-line text-text text-xs px-2 py-1.5 rounded-md font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="text-xs border border-line bg-panel2 px-2 py-1 rounded-md hover:bg-panel"
                        >
                          {showKey ? "Hide" : "Show"}
                        </button>
                        {openAiKey.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearOpenAiKey}
                            className="text-xs text-bad border border-bad/40 bg-bad/5 px-2 py-1 rounded-md hover:bg-bad/10"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted">
                        Get a key at <span className="font-mono">platform.openai.com/api-keys</span>. Stored locally —
                        anyone with access to this browser can read it.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted block">Model</label>
                      <select
                        value={openAiModel}
                        onChange={handleOpenAiModelChange}
                        className="bg-panel border border-line text-text text-xs px-2 py-1.5 rounded-md"
                      >
                        <option value="gpt-4o-mini">GPT-4o mini — fast, ~$0.005/review</option>
                        <option value="gpt-4o">GPT-4o — deeper, ~$0.05/review</option>
                      </select>
                    </div>
                  </>
                )}

                <details className="text-[11px] text-muted leading-snug">
                  <summary className="cursor-pointer text-text">What gets sent on each call?</summary>
                  <ul className="mt-1.5 space-y-1 list-disc pl-4">
                    <li>Scenario metadata: symbol, timeframe, key levels, market context, macro context, the ideal decision plan, what actually happened.</li>
                    <li>Your decision values: direction, entry, stop, take-profit, leverage, risk %, thesis, invalidation.</li>
                    <li>Your rule-based score: total, strengths, weaknesses, mistake tags.</li>
                    <li>Chat history (for follow-up questions on the same attempt).</li>
                  </ul>
                </details>

                <button
                  type="button"
                  onClick={handleRevokeAi}
                  className="text-xs text-bad border border-bad/40 bg-bad/5 px-2.5 py-1.5 rounded-md hover:bg-bad/10"
                >
                  Revoke consent &amp; disable
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="text-xs font-semibold border border-accent/50 text-accent bg-panel px-3 py-1.5 rounded-md hover:bg-accent/10"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <span className="flex-1" />
            <button
              type="button"
              onClick={handleClearJournal}
              className="text-xs border border-bad/40 text-bad bg-panel px-3 py-1.5 rounded-md hover:bg-bad/10"
            >
              Clear journal
            </button>
            <button
              type="button"
              onClick={handleClearQuiz}
              className="text-xs border border-bad/40 text-bad bg-panel px-3 py-1.5 rounded-md hover:bg-bad/10"
            >
              Clear quiz progress
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs border border-bad/60 text-bad bg-bad/5 px-3 py-1.5 rounded-md hover:bg-bad/10 font-semibold"
            >
              Reset all
            </button>
          </div>
          {status && (
            <div
              className={`text-xs rounded-md border p-2 ${
                status.tone === "good"
                  ? "border-good/40 bg-good/5 text-good"
                  : status.tone === "bad"
                  ? "border-bad/40 bg-bad/5 text-bad"
                  : "border-line bg-panel2 text-muted"
              }`}
            >
              {status.text}
            </div>
          )}
        </div>
      )}

      {/* v2.5 — first-time consent modal gates the AI-enable toggle. */}
      <AIConsentModal
        open={showConsentModal}
        onAccept={handleConsentAccept}
        onDismiss={handleConsentDismiss}
      />
    </div>
  );
}
