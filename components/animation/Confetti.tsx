"use client";

// v5.11.0 — Self-contained CSS-only confetti burst for celebration moments
// (clearing a scenario, finishing a path stage, hitting a milestone). No
// canvas, no dependencies — just absolutely-positioned div particles that
// ride a single `confettiFall` keyframe with per-particle randomised
// horizontal travel, rotation, delay, and duration.
//
// Mount with `fire` toggled true to play once; the component auto-unmounts
// the particles after the duration so it doesn't keep DOM nodes around. The
// caller controls whether to re-fire by toggling the prop.
//
// The whole thing is `pointer-events-none` and fixed to the viewport so it
// floats above content without blocking clicks.

import { useEffect, useMemo, useState } from "react";

type Props = {
  // Toggle to true to play one burst. Set to false (or unmount the parent)
  // to clean up immediately.
  fire: boolean;
  // Particle count. Default 60 — enough to feel celebratory without
  // becoming a heavy render. Practical ceiling ~150.
  count?: number;
  // Origin point in viewport units, 0..1 horizontally. Defaults to 0.5
  // (center). Particles spread laterally from this point.
  originX?: number;
  // Total animation duration in ms. Particles finish + auto-cleanup at this
  // mark. Default 1900ms — fall is satisfying without dragging on.
  durationMs?: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Hand-tuned celebration palette — warm + bright so it pops on every theme.
const COLORS = [
  "#ffcc33",
  "#ff7a59",
  "#22c55e",
  "#4f8cff",
  "#a855f7",
  "#f59e0b",
];

type Particle = {
  id: number;
  left: number; // vw — starting position
  travel: number; // px — horizontal drift
  rotation: number; // deg — final rotation
  color: string;
  size: number; // px
  delay: number; // ms
  duration: number; // ms
};

function makeParticles(count: number, originX: number, durationMs: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 600; // px lateral drift
    const startOffset = (Math.random() - 0.5) * 30; // vw
    out.push({
      id: i,
      left: originX * 100 + startOffset,
      travel: spread,
      rotation: (Math.random() - 0.5) * 1080,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 250,
      duration: durationMs * (0.7 + Math.random() * 0.4),
    });
  }
  return out;
}

export default function Confetti({
  fire,
  count = 60,
  originX = 0.5,
  durationMs = 1900,
}: Props) {
  const [active, setActive] = useState(false);

  // Skip entirely under reduced motion. The whole point is decoration; no
  // assistive content is lost.
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (!fire || reduced) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), durationMs + 400);
    return () => clearTimeout(t);
  }, [fire, durationMs, reduced]);

  const particles = useMemo(
    () => (active ? makeParticles(count, originX, durationMs) : []),
    [active, count, originX, durationMs]
  );

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block animate-confetti rounded-[1px]"
          style={
            {
              left: `${p.left}vw`,
              width: `${p.size}px`,
              height: `${p.size * 0.4}px`,
              background: p.color,
              ["--x" as string]: `${p.travel}px`,
              ["--rot" as string]: `${p.rotation}deg`,
              ["--delay" as string]: `${p.delay}ms`,
              ["--duration" as string]: `${p.duration}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
