// v5.10.1 — Home launcher hub. A grouped grid of feature cards so every area
// of the app — including the previously-buried Live Paper Trading, Portfolio
// Simulator, Candle School, and Drills — is one glance and one click from the
// home page. Three groups: Trade (do), Learn (study), Track (review).
//
// v5.10.3 — the launcher gets its OWN personalized symbol set (LauncherIcons)
// rather than the shared generic stroke icons, so each destination reads as
// distinct: a bullseye, a live pulse, a pie, a grad cap, candlesticks, a
// stopwatch, a lookup, a document, a clipboard.

import FeatureCard, {
  SectionMarks,
  type FeatureTone,
  type SectionMarkId,
} from "./FeatureCard";

// ── Dedicated launcher symbols (hand-drawn, one per card) ───────────────────
const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const LauncherIcons = {
  // Practice — a bullseye. You're aiming for the right call and scoring it.
  practice: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Live — a heartbeat pulse. Real-time, ticking.
  live: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M2.5 12.5h4L8 8l3 9 2-6 1.3 1.5h4.7" />
    </svg>
  ),
  // Portfolio — a pie split into segments. Several positions at once.
  portfolio: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v8M12 12l7 3.4M12 12 5.4 16" />
    </svg>
  ),
  // Learn Path — a graduation cap.
  learnPath: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M2.5 9 12 5.2 21.5 9 12 12.8Z" />
      <path d="M6.5 10.8V15c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.2" />
      <path d="M21.5 9v4.2" />
    </svg>
  ),
  // Candle School — two candlesticks.
  candle: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M8.5 3v3.5M8.5 15.5V20" />
      <rect x="6" y="6.5" width="5" height="9" rx="1" />
      <path d="M16 6v2.5M16 15v3" />
      <rect x="13.5" y="8.5" width="5" height="6.5" rx="1" />
    </svg>
  ),
  // Speed Drills — a stopwatch. Five-second flashcards.
  drills: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <circle cx="12" cy="13.5" r="6.8" />
      <path d="M12 13.5V9.8" />
      <path d="M9.8 3h4.4M12 3v2.7M18.6 7 20 5.6" />
    </svg>
  ),
  // Glossary — a lookup: text lines under a magnifier.
  glossary: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M4 6h9M4 10h6.5M4 14h8" />
      <circle cx="16.5" cy="15.5" r="3.3" />
      <path d="m19 18 2.5 2.5" />
    </svg>
  ),
  // Journal — a document with a folded corner + lines.
  journal: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M6 3h7.5L18 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3v4.5H18" />
      <path d="M8.5 12.5h6M8.5 16.5h4" />
    </svg>
  ),
  // Training Plan — a clipboard with check marks.
  training: (
    <svg viewBox="0 0 24 24" {...sw} className="w-5 h-5">
      <path d="M9 4H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H15" />
      <rect x="9" y="2.6" width="6" height="3.2" rx="1" />
      <path d="m8.7 11.3 1.3 1.3 2.3-2.5M8.7 16.3l1.3 1.3 2.3-2.5" />
    </svg>
  ),
};

type Item = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
};

type Group = {
  label: string;
  tone: FeatureTone;
  mark: SectionMarkId;
  items: Item[];
};

const GROUPS: Group[] = [
  {
    label: "Trade",
    tone: "accent",
    mark: "trade",
    items: [
      {
        href: "/practice",
        title: "Practice",
        description: "Score real historical setups. No risk, instant feedback.",
        icon: LauncherIcons.practice,
      },
      {
        href: "/paper-trading",
        title: "Live Paper Trading",
        description: "Trade real Coinbase prices with paper money, in real time.",
        icon: LauncherIcons.live,
        badge: "Live",
      },
      {
        href: "/portfolio",
        title: "Portfolio Simulator",
        description: "Juggle several positions — learn total risk and correlation.",
        icon: LauncherIcons.portfolio,
      },
    ],
  },
  {
    label: "Learn",
    tone: "good",
    mark: "learn",
    items: [
      {
        href: "/learn",
        title: "Learn Path",
        description: "A 7-module path through the concepts behind the scoring.",
        icon: LauncherIcons.learnPath,
      },
      {
        href: "/learn/candles",
        title: "Candle School",
        description: "Shape a candle to name it, then browse the chart's patterns.",
        icon: LauncherIcons.candle,
      },
      {
        href: "/learn/drills",
        title: "Speed Drills",
        description: "Ten 5-second flashcards that build the chart-reading reflex.",
        icon: LauncherIcons.drills,
      },
      {
        href: "/glossary",
        title: "Glossary",
        description: "Plain-English definitions for every term in the app.",
        icon: LauncherIcons.glossary,
      },
    ],
  },
  {
    label: "Track",
    tone: "warn",
    mark: "track",
    items: [
      {
        href: "/journal",
        title: "Journal",
        description: "Every attempt, scored and revisitable. Spot your patterns.",
        icon: LauncherIcons.journal,
      },
      {
        href: "/training",
        title: "Training Plan",
        description: "A personalized plan: what to learn, quiz, and practice next.",
        icon: LauncherIcons.training,
      },
    ],
  },
];

export default function HomeLauncher() {
  return (
    <section aria-label="Jump in">
      <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted">
        Jump in
      </h2>
      <div className="mt-3 space-y-5">
        {GROUPS.map((group) => {
          const markTone =
            group.tone === "accent"
              ? "text-accent"
              : group.tone === "good"
              ? "text-good"
              : group.tone === "warn"
              ? "text-warn"
              : "text-bad";
          return (
            <div key={group.label}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`${markTone} shrink-0`} aria-hidden>
                  {SectionMarks[group.mark]}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted/80">
                  {group.label}
                </span>
              </div>
              {/* v5.11.0 — staggered fade-up entrance on the cards. The
                  `.stagger` parent applies a 60ms cascade and each card uses
                  `animate-rise` so they slide in one after another. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
                {group.items.map((item) => (
                  <FeatureCard
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    description={item.description}
                    icon={item.icon}
                    tone={group.tone}
                    badge={item.badge}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
