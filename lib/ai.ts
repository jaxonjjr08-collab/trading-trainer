// v2.5 — AI client. Single entry point for every AI feature in the app
// (review card, coach chat). Transport is pluggable: today we call
// api.anthropic.com directly from the browser using a BYOK key from
// localStorage. Tomorrow we may swap to a server-side proxy at /api/llm —
// the call sites won't change.
//
// Streams responses via Anthropic's SSE format. System prompt is built from
// the scenario + the user's attempt + the rule-based score so the model
// reviews a *specific* trade with full context. Anthropic prompt-caching is
// applied to the system block so chat follow-ups (which reuse the same
// system) cost ~10% of the initial call.

import { CHART_TOOL_LABELS, type Attempt, type ChartToolId, type Decision, type Scenario } from "./types";
import type { AiModel, AiProvider, OpenAiModel } from "./storage";
import {
  getAiKey,
  getAiModel,
  getAiProvider,
  getOpenAiKey,
  getOpenAiModel,
  DEFAULT_AI_MODEL,
  DEFAULT_OPENAI_MODEL,
} from "./storage";
import { macroContextForTime } from "./macro-context";
import { MISTAKE_TAGS } from "./mistakes";

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamCompletionOpts = {
  // v5.10.5 — model union widened so the caller can pass an OpenAI model id.
  // When omitted, the active provider's stored model is used.
  model?: AiModel | OpenAiModel;
  maxTokens?: number;
  // When true (default), the Anthropic system block is sent with
  // cache_control:ephemeral so repeat calls (chat turns on the same context)
  // are cheap. Ignored for OpenAI (no equivalent client-side flag).
  cacheSystem?: boolean;
  // Override the active provider. Almost never set in app code; left here so
  // future tests / dev tools can force one transport.
  provider?: AiProvider;
};

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigError";
  }
}

export class AIApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AIApiError";
    this.status = status;
  }
}

// Transport selection. Server transport not implemented yet — when it is,
// this function returns "server" and streamCompletion routes to /api/llm.
// Today: always "direct". The seam is here so call sites never change.
function getTransport(): "direct" | "server" {
  return "direct";
}

/**
 * Stream a chat completion. Yields text fragments as they arrive.
 *
 * Throws:
 *   AIConfigError — missing key, unsupported transport
 *   AIApiError    — non-2xx from Anthropic with status code preserved
 *
 * Usage:
 *   for await (const chunk of streamCompletion(system, messages)) {
 *     setText((s) => s + chunk);
 *   }
 */
export async function* streamCompletion(
  systemPrompt: string,
  messages: AIMessage[],
  opts: StreamCompletionOpts = {}
): AsyncIterable<string> {
  const transport = getTransport();
  const maxTokens = opts.maxTokens ?? 800;
  const cacheSystem = opts.cacheSystem !== false;
  const provider = opts.provider ?? getAiProvider();

  if (transport !== "direct") {
    // Future: server transport (proxied through /api/llm). Same SSE shape.
    throw new AIConfigError("Server transport not yet implemented.");
  }

  if (provider === "openai") {
    const model =
      (opts.model as OpenAiModel | undefined) ??
      getOpenAiModel() ??
      DEFAULT_OPENAI_MODEL;
    yield* streamOpenAi(systemPrompt, messages, model, maxTokens);
    return;
  }

  // Default: Anthropic Claude (original path).
  const model =
    (opts.model as AiModel | undefined) ?? getAiModel() ?? DEFAULT_AI_MODEL;
  yield* streamDirect(systemPrompt, messages, model, maxTokens, cacheSystem);
}

async function* streamDirect(
  systemPrompt: string,
  messages: AIMessage[],
  model: AiModel,
  maxTokens: number,
  cacheSystem: boolean
): AsyncIterable<string> {
  const key = getAiKey();
  if (!key) {
    throw new AIConfigError(
      "No Anthropic API key configured. Open Settings → AI features to paste one."
    );
  }

  // Anthropic prompt-caching: the system block is a stable per-attempt
  // payload (scenario + decision + score) so we mark it ephemeral to cut
  // chat follow-up cost. Single-shot review benefits less but it's still
  // cheap on a cache miss.
  const systemBlock = cacheSystem
    ? [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]
    : [{ type: "text", text: systemPrompt }];

  const body = {
    model,
    max_tokens: maxTokens,
    stream: true,
    system: systemBlock,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        // CORS is gated behind this header on the Messages API. Required for
        // browser-direct calls. Documented as "dangerous" by Anthropic because
        // BYOK keys live in client memory — we surface this in the consent modal.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new AIApiError(0, `Network error: ${(e as Error).message}`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new AIApiError(res.status, detail.slice(0, 400) || res.statusText);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new AIApiError(0, "No response body.");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE format: events separated by blank lines, each event has lines like
    // "event: content_block_delta" and "data: {...json...}".
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const payload = dataLine.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          const chunk = parsed.delta.text ?? "";
          if (chunk) yield chunk;
        }
      } catch {
        // Anthropic sometimes interleaves non-JSON lines; safe to skip.
      }
    }
  }
}

// v5.10.5 — OpenAI streamer. Parallel to streamDirect: same input shape
// (systemPrompt + messages), same output contract (yields text fragments as
// they arrive). Uses OpenAI's Chat Completions SSE.
async function* streamOpenAi(
  systemPrompt: string,
  messages: AIMessage[],
  model: OpenAiModel,
  maxTokens: number
): AsyncIterable<string> {
  const key = getOpenAiKey();
  if (!key) {
    throw new AIConfigError(
      "No OpenAI API key configured. Open Settings → AI features to paste one."
    );
  }

  // OpenAI's chat format: the system prompt is the first message with role
  // 'system'; user/assistant turns follow. No client-side cache marker — the
  // model gets the full system block every call.
  const body = {
    model,
    stream: true,
    max_tokens: maxTokens,
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new AIApiError(0, `Network error: ${(e as Error).message}`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new AIApiError(res.status, detail.slice(0, 400) || res.statusText);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new AIApiError(0, "No response body.");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: events separated by blank lines, each event is "data: {json}" or
    // the terminal "data: [DONE]". OpenAI delta shape: choices[0].delta.content
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const payload = dataLine.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = parsed.choices?.[0]?.delta?.content ?? "";
        if (chunk) yield chunk;
      } catch {
        // Defensive: skip any non-JSON keep-alive line.
      }
    }
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────

/**
 * Build a system prompt scoped to one attempt. The user's decision, the
 * scenario context, the ideal plan (if authored), and the rule-based score
 * all go into a single block so the model has the full picture.
 *
 * The prompt is deterministic per (scenario, attempt) so prompt-caching works
 * across chat turns.
 */
export function buildSystemPrompt(scenario: Scenario, attempt: Attempt): string {
  const d = attempt.decision;
  const rrText = computeRRText(d);
  const macro = scenario.visibleCandles[0]?.time
    ? macroContextForTime(scenario.visibleCandles[0].time)
    : null;
  const tagLabels = attempt.score.tags
    .map((t) => MISTAKE_TAGS[t]?.label ?? t)
    .join(", ");
  const keyLevels = scenario.keyLevels.map((l) => `$${l.price} (${l.label})`).join(", ");
  const plan = scenario.idealDecisionPlan;
  // v4.0.3 — indicator-state blob. Three signals the model can reference:
  //   - which tools the scenario was authored around (the "intended lesson")
  //   - which tools the student had on at submit
  //   - the chart_tools breakdown line if scoring included the category
  const indicatorLines = buildIndicatorLines(scenario, attempt);

  return [
    "You are a trading coach reviewing a student's practice attempt on a historical chart. Be concise, kind, and specific. Reference values from the student's trade by name (entry price, stop, R:R, leverage, risk %). Connect feedback to concepts the app teaches (stop placement, invalidation, R:R, sizing). Do not predict markets. Do not moralize. Keep paragraphs short.",
    "",
    "SCENARIO",
    `- ${scenario.title}`,
    `- ${scenario.symbol} · ${scenario.timeframe} · ${scenario.difficulty} · setup type: ${scenario.setupType}`,
    `- Market context: ${scenario.marketContext}`,
    macro ? `- Macro context: ${macro}` : "",
    keyLevels ? `- Key levels: ${keyLevels}` : "",
    `- Trend: ${scenario.context.trend}, best direction: ${scenario.context.bestDirection}`,
    "",
    "WHAT ACTUALLY HAPPENED",
    `- ${scenario.outcome.description}`,
    `- Takeaway: ${scenario.outcome.takeaway}`,
    "",
    plan ? "IDEAL DECISION PLAN (a high-quality, ~95/100 answer)" : "",
    plan ? `- Direction: ${plan.direction}` : "",
    plan && plan.entry != null ? `- Entry: $${plan.entry}` : "",
    plan && plan.stopLoss != null ? `- Stop: $${plan.stopLoss}` : "",
    plan && plan.takeProfit != null ? `- TP: $${plan.takeProfit}` : "",
    plan && plan.leverage != null ? `- Leverage: ${plan.leverage}x` : "",
    plan && plan.riskPercent != null ? `- Risk: ${plan.riskPercent}%` : "",
    plan ? `- Thesis: ${plan.thesis}` : "",
    plan && plan.invalidation ? `- Invalidation: ${plan.invalidation}` : "",
    "",
    "STUDENT'S DECISION",
    `- Direction: ${d.direction.toUpperCase()}`,
    d.direction !== "wait" && d.entry != null ? `- Entry: $${d.entry}` : "",
    d.direction !== "wait" && d.stopLoss != null ? `- Stop: $${d.stopLoss}` : "",
    d.direction !== "wait" && d.takeProfit != null ? `- TP: $${d.takeProfit}` : "",
    d.direction !== "wait" && d.leverage != null ? `- Leverage: ${d.leverage}x` : "",
    d.direction !== "wait" && d.riskPercent != null ? `- Risk: ${d.riskPercent}%` : "",
    rrText ? `- R:R: ${rrText}` : "",
    d.thesis ? `- Thesis: "${d.thesis}"` : "- Thesis: (none provided)",
    d.invalidation ? `- Invalidation: "${d.invalidation}"` : "- Invalidation: (none provided)",
    "",
    ...indicatorLines,
    "OUTCOME",
    `- Hit: ${attempt.outcome.hit}${attempt.outcome.liquidated ? " (LIQUIDATED)" : ""}`,
    `- PnL: ${attempt.outcome.pnlPercent.toFixed(2)}%`,
    "",
    "RULE-BASED SCORE",
    `- Total: ${attempt.score.total}/${attempt.score.max}`,
    attempt.score.strengths.length ? `- Strengths: ${attempt.score.strengths.join("; ")}` : "",
    attempt.score.weaknesses.length ? `- Weaknesses: ${attempt.score.weaknesses.join("; ")}` : "",
    tagLabels ? `- Tags: ${tagLabels}` : "",
  ]
    .filter((line) => line.length > 0 || line === "")
    .join("\n");
}

// v4.0.3 — INDICATORS block for the system prompt. Omitted entirely on
// attempts saved before v4.0.3 (no indicatorState) AND on scenarios without
// availableIndicators — the model gets no signal at all, which is correct,
// because chart-tools awareness shouldn't be retrofit onto pre-v4 attempts.
function buildIndicatorLines(scenario: Scenario, attempt: Attempt): string[] {
  const available = scenario.availableIndicators ?? [];
  const state = attempt.indicatorState;
  if (available.length === 0 && !state) return [];

  const lines = ["INDICATORS"];
  if (available.length > 0) {
    lines.push(
      `- Scenario teaches around: ${available.map((id) => CHART_TOOL_LABELS[id]).join(", ")}`
    );
  }
  if (state) {
    const onIds = (Object.keys(state) as ChartToolId[]).filter((id) => state[id]);
    lines.push(
      onIds.length > 0
        ? `- Student had on at submit: ${onIds.map((id) => CHART_TOOL_LABELS[id]).join(", ")}`
        : "- Student had no overlays on at submit."
    );
  }
  const chartTools = attempt.score.breakdown.find((b) => b.id === "chart_tools");
  if (chartTools) {
    lines.push(`- chart_tools score: ${chartTools.points}/${chartTools.max} — ${chartTools.note}`);
  }
  lines.push("");
  return lines;
}

function computeRRText(d: Decision): string {
  if (d.direction === "wait") return "";
  if (d.entry == null || d.stopLoss == null || d.takeProfit == null) return "";
  const risk = Math.abs(d.entry - d.stopLoss);
  const reward = Math.abs(d.takeProfit - d.entry);
  if (risk <= 0) return "";
  return (reward / risk).toFixed(2);
}

// User message for the auto-review on submit. Kept as a single short prompt
// so the model writes a tightly-scoped 3-paragraph response.
export const REVIEW_USER_PROMPT =
  "Write a 3-paragraph review of this student's attempt. " +
  "Paragraph 1: what they did well, by name (cite their numbers). " +
  "Paragraph 2: what would have improved this trade — point to specific values, contrast with the ideal plan if relevant. " +
  "Paragraph 3: one concrete habit to carry into the next attempt. " +
  "Don't restate the score. Don't moralize. Keep each paragraph to 2-3 sentences.";

// Human-readable label for a model id, used in the review card badge.
// v5.10.5 — widened to cover OpenAI model ids too. Falls back to the raw id
// for anything unknown so a future model addition doesn't crash the badge.
export function modelLabel(m: AiModel | OpenAiModel | string): string {
  if (m === "claude-sonnet-4-6") return "Sonnet 4.6";
  if (m === "claude-haiku-4-5-20251001") return "Haiku 4.5";
  if (m === "gpt-4o-mini") return "GPT-4o mini";
  if (m === "gpt-4o") return "GPT-4o";
  return m;
}

// Friendly error message from an AIApiError status. v5.10.5 — provider name
// pulled from getAiProvider so OpenAI users see "OpenAI", not "Anthropic".
export function friendlyApiError(e: AIApiError): string {
  const provider = getAiProvider() === "openai" ? "OpenAI" : "Anthropic";
  if (e.status === 401) return "Invalid API key — open Settings and re-paste it.";
  if (e.status === 429) return `Rate-limited by ${provider}. Wait a moment and retry.`;
  if (e.status === 400) return "Bad request to the AI API. The cached system prompt may be too long.";
  if (e.status >= 500) return `${provider} returned a server error. Retry in a few seconds.`;
  if (e.status === 0) return e.message;
  return `AI error (${e.status}): ${e.message}`;
}
