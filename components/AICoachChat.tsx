"use client";

// v2.5 — AI Coach Chat. Collapsible chat thread per attempt. User asks
// follow-up questions ("why was my stop too tight?", "explain invalidation
// again") and gets streamed answers grounded in the same system prompt as
// the review card. Anthropic prompt-caching makes follow-ups cheap.
//
// History persists per attempt.id via localStorage so the conversation
// survives reloads / journal revisits without re-billing.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Attempt, Scenario } from "@/lib/types";
import {
  appendChatMessage,
  clearChatHistory,
  getAiKey,
  getAiModel,
  getCachedReview,
  getChatHistory,
  hasAiConsent,
  isAiEnabled,
  type AiChatMessage,
} from "@/lib/storage";
import {
  AIApiError,
  AIConfigError,
  buildSystemPrompt,
  friendlyApiError,
  streamCompletion,
} from "@/lib/ai";
import Mascot from "./Mascot";

type Props = {
  attempt: Attempt;
  scenario: Scenario;
};

export default function AICoachChat({ attempt, scenario }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enabledLive, setEnabledLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read state on mount and when attempt changes.
  useEffect(() => {
    setEnabledLive(isAiEnabled() && hasAiConsent());
    setHistory(getChatHistory(attempt.id));
    setStreamingText("");
    setError(null);
  }, [attempt.id]);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history.length, streamingText, open]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || streaming) return;
    if (!enabledLive) return;
    if (!getAiKey()) {
      setError("No Anthropic API key configured. Open Settings → AI features.");
      return;
    }

    const userMsg: AiChatMessage = {
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    appendChatMessage(attempt.id, userMsg);
    setInput("");
    setError(null);
    setStreaming(true);
    setStreamingText("");

    // System prompt for chat embeds the same scenario + decision context as
    // the review card. If a cached review exists, append it so the coach
    // can refer back to its own earlier review.
    const cachedReview = getCachedReview(attempt.id);
    let system = buildSystemPrompt(scenario, attempt);
    if (cachedReview) {
      system +=
        "\n\nPRIOR REVIEW YOU WROTE (refer back to this when relevant)\n" +
        cachedReview.text;
    }
    system +=
      "\n\nYou are now in a chat with the student. Answer their follow-up questions about this specific trade. Keep responses focused and short (2-5 sentences typical). Stay grounded in their numbers and the scenario; if they ask something off-topic, redirect gently.";

    const messages = nextHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const model = getAiModel();

    try {
      let acc = "";
      for await (const chunk of streamCompletion(system, messages, { model, maxTokens: 600 })) {
        acc += chunk;
        setStreamingText(acc);
      }
      const final = acc.trim();
      if (final.length === 0) {
        setError("AI returned an empty response. Try again.");
        setStreaming(false);
        setStreamingText("");
        return;
      }
      const assistantMsg: AiChatMessage = {
        role: "assistant",
        content: final,
        createdAt: Date.now(),
      };
      setHistory([...nextHistory, assistantMsg]);
      appendChatMessage(attempt.id, assistantMsg);
    } catch (e) {
      if (e instanceof AIConfigError) setError(e.message);
      else if (e instanceof AIApiError) setError(friendlyApiError(e));
      else setError((e as Error).message);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }, [attempt, scenario, history, input, streaming, enabledLive]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl-Enter sends. Plain Enter inserts a newline.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  function handleClear() {
    if (history.length === 0) return;
    if (!confirm("Clear this chat thread? The cached AI review stays.")) return;
    clearChatHistory(attempt.id);
    setHistory([]);
    setError(null);
  }

  if (!enabledLive) return null;

  const turns = history.length;

  return (
    <div className="rounded-md border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-panel2"
      >
        <span className="text-xs uppercase tracking-wide text-muted text-left">
          Ask the coach{" "}
          {turns > 0 && (
            <span className="text-accent normal-case">
              ({turns} message{turns === 1 ? "" : "s"})
            </span>
          )}
        </span>
        <span className="text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-line p-3 space-y-3">
          <div
            ref={scrollRef}
            className="max-h-[400px] overflow-y-auto space-y-2 pr-1"
          >
            {history.length === 0 && !streaming && (
              <div className="text-xs text-muted italic py-2">
                Ask the coach anything about this attempt. Example: "Why was my stop too tight?", "What would 95/100
                have looked like here?", "Explain invalidation again."
              </div>
            )}

            {history.map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}

            {streaming && (
              <ChatBubble role="assistant" content={streamingText} streaming />
            )}
          </div>

          {error && (
            <div className="rounded-md border border-bad/40 bg-bad/5 p-2 text-xs text-bad">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a follow-up question. Cmd/Ctrl-Enter to send."
              rows={2}
              disabled={streaming}
              className="w-full bg-panel2 border border-line rounded-md text-sm p-2 leading-snug focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleClear}
                disabled={history.length === 0 || streaming}
                className="text-[11px] text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Clear thread
              </button>
              <button
                type="button"
                onClick={() => void send()}
                disabled={input.trim().length === 0 || streaming}
                className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {streaming ? "Sending…" : "Send →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`rounded-md border p-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "border-line bg-panel2 text-text"
          : "border-accent/30 bg-accent/5 text-text"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
          isUser ? "text-muted" : "text-accent"
        }`}
      >
        {!isUser && <Mascot mood="thinking" size="sm" className="w-4 h-4" />}
        {isUser ? "You" : "Coach"}
      </div>
      <div>
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-3 ml-0.5 align-baseline bg-accent animate-pulse" aria-hidden />
        )}
      </div>
    </div>
  );
}
