"use client";

// v5.10.1 — Polished entry-point card used by the home launcher and the Learn
// hero. Replaces the old cramped text buttons: an icon badge, a serif title, a
// one-line description, and a hover lift so the app's primary destinations
// actually look like destinations. Tone tints the icon badge + hover border so
// groups (Trade / Learn / Track) read as related without shouting.

import Link from "next/link";

export type FeatureTone = "accent" | "good" | "warn" | "bad";

const TONE: Record<
  FeatureTone,
  { badge: string; hoverBorder: string; arrow: string }
> = {
  accent: {
    badge: "bg-accent/15 text-accent",
    hoverBorder: "hover:border-accent/60",
    arrow: "text-accent",
  },
  good: {
    badge: "bg-good/15 text-good",
    hoverBorder: "hover:border-good/60",
    arrow: "text-good",
  },
  warn: {
    badge: "bg-warn/15 text-warn",
    hoverBorder: "hover:border-warn/60",
    arrow: "text-warn",
  },
  bad: {
    badge: "bg-bad/15 text-bad",
    hoverBorder: "hover:border-bad/60",
    arrow: "text-bad",
  },
};

export default function FeatureCard({
  href,
  title,
  description,
  icon,
  tone = "accent",
  badge,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone?: FeatureTone;
  // Optional little pill in the top-right (e.g. "Live", "New").
  badge?: string;
}) {
  const t = TONE[tone];
  return (
    <Link
      href={href}
      // v5.11.0 — animate-rise fades the card up on mount; the parent's
      // .stagger picks the delay. hover-lift uses transform so it composes
      // cleanly with the entrance animation (one runs once, the other on
      // hover) without fighting over the transform property.
      className={`group relative flex items-start gap-3.5 rounded-xl border border-line bg-panel p-4 animate-rise transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${t.hoverBorder}`}
    >
      <span
        className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg ${t.badge}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-base font-semibold leading-tight">
            {title}
          </span>
          {badge && (
            <span
              className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${t.badge}`}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs text-muted leading-snug">
          {description}
        </span>
      </span>
      <span
        className={`shrink-0 self-center text-lg ${t.arrow} opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0`}
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

// ── Shared inline icons (stroke-based, no icon dependency) ──────────────────
const sw = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

export const FeatureIcons = {
  practice: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M4 19V5l5 4 6-7 5 6v11Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4" strokeLinecap="round" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M12 3 3 7.5 12 12l9-4.5Z" strokeLinejoin="round" />
      <path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5" strokeLinejoin="round" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M4 5v13l8-3 8 3V5l-8 3Z" strokeLinejoin="round" />
      <path d="M12 8v10" />
    </svg>
  ),
  candle: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M9 3v4M9 17v4M15 6v3M15 15v3" strokeLinecap="round" />
      <rect x="6.5" y="7" width="5" height="10" rx="1" />
      <rect x="12.5" y="9" width="5" height="6" rx="1" />
    </svg>
  ),
  drills: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  glossary: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M5 4h11l3 3v13H5Z" strokeLinejoin="round" />
      <path d="M9 9h6M9 13h6M9 17h4M5 4v16" strokeLinecap="round" />
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M5 4h11l3 3v13H5Z" strokeLinejoin="round" />
      <path d="M8 9h7M8 13h7M8 17h5" strokeLinecap="round" />
    </svg>
  ),
  training: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3Z" strokeLinejoin="round" />
    </svg>
  ),
};

// v5.10.2 — original section marks, hand-drawn here rather than reaching for an
// emoji. Used as the little glyph beside a section heading (launcher groups,
// the scenario path, the Learn hands-on row). Drawn at 16px; inherit
// currentColor so each picks up its section's tone.
const sm = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const SectionMarks = {
  // Trade — two candlesticks.
  trade: (
    <svg viewBox="0 0 24 24" {...sm} className="w-4 h-4">
      <path d="M8 3v4M8 16v5" />
      <rect x="5.5" y="7" width="5" height="9" rx="1" />
      <path d="M16 5v3M16 16v3" />
      <rect x="13.5" y="8" width="5" height="8" rx="1" />
    </svg>
  ),
  // Learn — an open book.
  learn: (
    <svg viewBox="0 0 24 24" {...sm} className="w-4 h-4">
      <path d="M12 6.5C10 5 6.5 4.8 4 5.5v12c2.5-.7 6-.5 8 1 2-1.5 5.5-1.7 8-1v-12c-2.5-.7-6-.5-8 1Z" />
      <path d="M12 6.5v12" />
    </svg>
  ),
  // Track — a rising line with an end node over a baseline.
  track: (
    <svg viewBox="0 0 24 24" {...sm} className="w-4 h-4">
      <path d="M3.5 16.5 9 10l3.5 3 6.5-8" />
      <circle cx="19.5" cy="4.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3.5 20.5h17" />
    </svg>
  ),
  // Scenario path — a winding dashed route between a start and end waypoint.
  path: (
    <svg viewBox="0 0 24 24" {...sm} className="w-4 h-4">
      <path d="M6.5 18c5 0 4-11 11-11" strokeDasharray="2.5 2.5" />
      <circle cx="6.5" cy="18" r="2.1" />
      <circle cx="17.5" cy="7" r="2.1" />
    </svg>
  ),
  // Hands-on — a cursor/pointer.
  handsOn: (
    <svg viewBox="0 0 24 24" {...sm} className="w-4 h-4">
      <path d="M6 4l12.5 7-5.2 1.6-2 5.1Z" />
    </svg>
  ),
};

export type SectionMarkId = keyof typeof SectionMarks;
