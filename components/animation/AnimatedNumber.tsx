"use client";

// v5.11.0 — Animated count-up for high-impact numeric reveals (score totals,
// PnL, account size on a tick). Uses requestAnimationFrame so the curve is
// smooth on every device, and an ease-out cubic so the count decelerates into
// the final value rather than crawling there linearly.
//
// Respects prefers-reduced-motion: when set, snaps to the final value with no
// animation. Memoizes the starting value across renders so a parent re-render
// doesn't restart the count from 0 every time.

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  // Total animation duration in ms. Default 800 — slow enough to read, fast
  // enough to not feel laggy.
  durationMs?: number;
  // Decimal places to round to. 0 by default (scores are integers).
  decimals?: number;
  // Optional formatter applied to the live value. If set, overrides the
  // default toFixed-then-toLocaleString behaviour. Use for "$1,234" etc.
  format?: (n: number) => string;
  // Optional className applied to the wrapper.
  className?: string;
  // Prefix / suffix (e.g. "$" or "%") rendered as plain text. Skipped when
  // a custom format is provided.
  prefix?: string;
  suffix?: string;
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AnimatedNumber({
  value,
  durationMs = 800,
  decimals = 0,
  format,
  className,
  prefix,
  suffix,
}: Props) {
  // Start at 0 so the first paint shows the count-up's beginning, not a
  // one-frame flash of the final value. Under reduced motion the effect snaps
  // it to `value` immediately. `displayRef` mirrors the live value so a new
  // tween (e.g. the streak ticked up) starts from where the last one ended.
  const [display, setDisplay] = useState<number>(0);
  const displayRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      const next = from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const rounded = Number(display.toFixed(decimals));
  const text = format
    ? format(rounded)
    : `${prefix ?? ""}${rounded.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix ?? ""}`;

  return <span className={className}>{text}</span>;
}
