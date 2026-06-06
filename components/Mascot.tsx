// v2.6 — Owl mascot, drawn inline as SVG so it inherits theme colors. Six
// moods cover the moments where the app should feel personal: greeting,
// watching the chart, celebrating, thinking, sleeping (cooldown), and the
// "where do I start?" empty state.
//
// The base owl (body, beak, tufts, feet) is identical across moods; only
// the expression layer (eyes + mouth + accents) changes. Keeps every variant
// recognisably the same character.
//
// Colors use Tailwind theme tokens via classes (currentColor, fill-panel2,
// etc.) so it adapts to dark / light without per-component work.

import React from "react";

export type MascotMood =
  | "idle"
  | "watching"
  | "happy"
  | "thinking"
  | "sleeping"
  | "confused";

export type MascotSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<MascotSize, number> = {
  sm: 32,
  md: 48,
  lg: 96,
  xl: 160,
};

type Props = {
  mood?: MascotMood;
  size?: MascotSize;
  className?: string;
  // Slight head-tilt for personality, in degrees. Auto-tilted on confused.
  tiltDeg?: number;
  // v5.11.0 — one-shot reaction animation. "happy" runs a short bounce, "sad"
  // a sympathetic shake. Plays once on mount + whenever the value changes.
  // Independent of `mood` (which is a static expression) so a parent can
  // change the expression and the reaction independently.
  reaction?: "happy" | "sad" | null;
};

export default function Mascot({
  mood = "idle",
  size = "md",
  className,
  tiltDeg,
  reaction = null,
}: Props) {
  const px = SIZE_PX[size];
  const autoTilt = mood === "confused" ? -12 : 0;
  const tilt = tiltDeg ?? autoTilt;
  const reactionClass =
    reaction === "happy"
      ? "animate-happy"
      : reaction === "sad"
      ? "animate-shake"
      : "";

  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      className={`${className ?? ""} ${reactionClass}`.trim()}
      role="img"
      aria-label={`Owl mascot (${mood})`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <g>
        {/* Soft ground shadow — only at lg/xl sizes to avoid muddying smaller renders */}
        {(size === "lg" || size === "xl") && (
          <ellipse cx="50" cy="93" rx="22" ry="3" className="fill-[var(--line)]" opacity="0.6" />
        )}

        {/* Ear tufts (drawn behind the body) */}
        <path d="M28 28 L34 40 L40 32 Z" className="fill-[var(--panel2)] stroke-current" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M72 28 L66 40 L60 32 Z" className="fill-[var(--panel2)] stroke-current" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Body — slightly squat oval */}
        <ellipse cx="50" cy="55" rx="30" ry="32" className="fill-[var(--panel2)] stroke-current" strokeWidth="2" />

        {/* Belly accent — a softer oval lower on the body */}
        <ellipse cx="50" cy="68" rx="18" ry="14" className="fill-[var(--panel)] stroke-current" strokeWidth="1" opacity="0.6" />

        {/* Wings — small downward arcs flanking the body */}
        <path
          d="M22 56 Q19 70 28 78"
          fill="none"
          className="stroke-current"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M78 56 Q81 70 72 78"
          fill="none"
          className="stroke-current"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Feet */}
        <path d="M42 87 L42 92 M44 87 L44 92 M46 87 L46 92" className="stroke-[var(--accent)]" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M54 87 L54 92 M56 87 L56 92 M58 87 L58 92" className="stroke-[var(--accent)]" strokeWidth="1.5" strokeLinecap="round" />

        {/* Eyes + expression layer — varies by mood */}
        <Expression mood={mood} />

        {/* Beak — always present */}
        <path
          d="M48 56 L50 62 L52 56 Z"
          className="fill-[var(--accent)] stroke-current"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </g>

      {/* Mood accessories that sit outside the body (e.g. Zs for sleeping) */}
      <MoodAccessory mood={mood} />
    </svg>
  );
}

// ─── Expression by mood ───────────────────────────────────────────────────────

function Expression({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "idle":
      // Round open eyes, neutral
      return (
        <g>
          <EyeBase cx={38} cy={48} />
          <EyeBase cx={62} cy={48} />
          <Pupil cx={38} cy={48} />
          <Pupil cx={62} cy={48} />
        </g>
      );

    case "watching":
      // Eyes glance right (toward the chart that's usually beside the mascot)
      return (
        <g>
          <EyeBase cx={38} cy={48} />
          <EyeBase cx={62} cy={48} />
          <Pupil cx={41} cy={49} />
          <Pupil cx={65} cy={49} />
          {/* Slight brow — short stroke above each eye */}
          <path d="M32 42 L44 40" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M56 40 L68 42" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );

    case "happy":
      // Closed crescent eyes (^^) — universally readable as joyful
      return (
        <g fill="none" className="stroke-current" strokeWidth="2.5" strokeLinecap="round">
          <path d="M33 50 Q38 44 43 50" />
          <path d="M57 50 Q62 44 67 50" />
        </g>
      );

    case "thinking":
      // One eye open, one half-closed — the universal "pondering" look
      return (
        <g>
          <EyeBase cx={38} cy={48} />
          <Pupil cx={37} cy={49} />
          {/* Right eye half-closed: drawn as a closing arc */}
          <path
            d="M55 48 Q62 50 69 48"
            fill="none"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );

    case "sleeping":
      // Both eyes closed gently (~~)
      return (
        <g fill="none" className="stroke-current" strokeWidth="2" strokeLinecap="round">
          <path d="M32 50 Q38 53 44 50" />
          <path d="M56 50 Q62 53 68 50" />
        </g>
      );

    case "confused":
      // Asymmetric eyes — one wide, one squinted
      return (
        <g>
          <EyeBase cx={38} cy={48} r={9} />
          <Pupil cx={38} cy={47} r={3.5} />
          <path
            d="M55 49 Q62 51 69 47"
            fill="none"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

// Mood-specific extras that float outside the body (zzz, thought bubble, etc.)
function MoodAccessory({ mood }: { mood: MascotMood }) {
  if (mood === "sleeping") {
    return (
      <g className="fill-[var(--accent)]" fontFamily="ui-sans-serif, system-ui" fontWeight="bold">
        <text x="76" y="28" fontSize="10" opacity="0.9">z</text>
        <text x="84" y="20" fontSize="14" opacity="0.7">z</text>
        <text x="92" y="10" fontSize="18" opacity="0.5">z</text>
      </g>
    );
  }
  if (mood === "thinking") {
    return (
      <g className="fill-[var(--panel2)] stroke-current" strokeWidth="1.2">
        <circle cx="82" cy="30" r="2" />
        <circle cx="87" cy="22" r="3" />
        <circle cx="93" cy="14" r="5" />
      </g>
    );
  }
  if (mood === "confused") {
    return (
      <g className="fill-[var(--accent)]" fontFamily="ui-sans-serif, system-ui" fontWeight="bold">
        <text x="78" y="22" fontSize="20">?</text>
      </g>
    );
  }
  if (mood === "happy") {
    // Soft sparkle dots
    return (
      <g className="fill-[var(--accent)]">
        <circle cx="20" cy="30" r="1.5" />
        <circle cx="82" cy="32" r="1.5" />
        <circle cx="14" cy="50" r="1" opacity="0.7" />
        <circle cx="88" cy="48" r="1" opacity="0.7" />
      </g>
    );
  }
  return null;
}

// ─── Eye primitives ───────────────────────────────────────────────────────────

function EyeBase({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      className="fill-[var(--panel)] stroke-current"
      strokeWidth="1.5"
    />
  );
}

function Pupil({ cx, cy, r = 3 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} className="fill-current" />;
}
