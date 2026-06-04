"use client";

// v5.0 — Connection-status badge for the paper-trading surface. Reads the
// status output from useLivePolling and renders it as a compact pill so the
// user knows whether the chart is fresh, stale, or reconnecting.

import type { LiveStatus } from "@/lib/use-live-polling";

type Props = {
  status: LiveStatus;
  lastTickAt: number | null;
  lastErrorMessage: string | null;
  retryInMs: number | null;
};

function formatAgo(ms: number): string {
  if (ms < 1_000) return "just now";
  const s = Math.floor(ms / 1_000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function LiveDataStatus({
  status,
  lastTickAt,
  lastErrorMessage,
  retryInMs,
}: Props) {
  const ago =
    lastTickAt != null ? formatAgo(Date.now() - lastTickAt) : null;

  let tone: "good" | "muted" | "warn";
  let dot: string;
  let label: string;
  let sublabel: string | null = null;

  switch (status) {
    case "connected":
      tone = "good";
      dot = "bg-good";
      label = "Live";
      sublabel = ago ? `last tick ${ago}` : null;
      break;
    case "fetching":
      tone = "muted";
      dot = "bg-accent animate-pulse";
      label = "Fetching…";
      break;
    case "error":
      tone = "warn";
      dot = "bg-warn animate-pulse";
      label = "Reconnecting";
      sublabel = retryInMs
        ? `retry in ${Math.ceil(retryInMs / 1000)}s`
        : lastErrorMessage ?? null;
      break;
    case "paused":
      tone = "muted";
      dot = "bg-muted";
      label = "Paused";
      break;
    default:
      tone = "muted";
      dot = "bg-muted";
      label = "Idle";
  }

  const toneClass =
    tone === "good"
      ? "border-good/50 bg-good/10 text-good"
      : tone === "warn"
      ? "border-warn/50 bg-warn/10 text-warn"
      : "border-line bg-panel2 text-muted";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} aria-hidden />
      <span className="uppercase tracking-wider">{label}</span>
      {sublabel && (
        <span className="font-normal normal-case tracking-normal text-muted">
          · {sublabel}
        </span>
      )}
    </div>
  );
}
