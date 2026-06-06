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
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    // Snap straight to the target when the user prefers reduced motion.
    if (prefersReducedMotion()) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = startedRef.current ? display : 0; // first run animates from 0
    fromRef.current = from;
    startedRef.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // We intentionally exclude `display` from deps — we read it once at the
    // start of each new tween so the next animation starts from where the
    // previous one ended, but we don't want to restart on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
