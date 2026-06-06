"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  // Stroke-based inline SVG to avoid adding an icon dependency.
  icon: (active: boolean) => React.ReactNode;
};

const ICON_STROKE = "currentColor";

const NAV_LINKS: NavLink[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M3 12 12 4l9 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v10h14V10" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/training",
    label: "Training",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M4 6h12M4 12h8M4 18h12" strokeLinecap="round" />
        <circle cx="20" cy="6" r="1.5" fill="currentColor" />
        <circle cx="16" cy="12" r="1.5" fill="currentColor" />
        <circle cx="20" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/practice",
    label: "Practice",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M4 19V5l5 4 6-7 5 6v11Z" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  // v5.10.1 — Live Paper Trading + Portfolio promoted into the primary nav.
  // They were only reachable from the Dashboard before, which made them hard
  // to find. Desktop-only (see DESKTOP_LINKS); the mobile bottom bar stays the
  // core set and surfaces these via the home launcher instead.
  {
    href: "/paper-trading",
    label: "Live",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M12 3 3 7.5 12 12l9-4.5Z" strokeLinejoin="round" />
        <path d="M3 12l9 4.5 9-4.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "Journal",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M5 4h11l3 3v13H5Z" strokeLinejoin="round" />
        <path d="M8 9h7M8 13h7M8 17h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/learn",
    label: "Learn",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M4 5v13l8-3 8 3V5l-8 3Z" strokeLinejoin="round" />
        <path d="M12 8v10" />
      </svg>
    ),
  },
  {
    href: "/glossary",
    label: "Glossary",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
        <path d="M5 4h11l3 3v13H5Z" strokeLinejoin="round" />
        <path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" />
        <path d="M5 4v16" strokeLinecap="round" />
      </svg>
    ),
  },
];

// v2.1 Phase 5 — settings lives as a separate utility entry (gear icon) so it
// doesn't bloat the primary 5-item nav with a 6th word. Rendered in the top
// header next to StreakBadge and as the right-most item on the bottom nav.
const SETTINGS_LINK = {
  href: "/settings",
  label: "Settings",
  icon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke={ICON_STROKE} strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

function isActive(linkHref: string, pathname: string): boolean {
  if (linkHref === "/") return pathname === "/";
  return pathname === linkHref || pathname.startsWith(`${linkHref}/`);
}

// v5.10.1 — desktop and mobile show different subsets so neither bar gets
// crowded. Desktop top nav leads with the core trading loop incl. the newly
// promoted Live + Portfolio; the mobile bottom bar keeps its familiar set and
// relies on the home launcher to reach Live/Portfolio.
const DESKTOP_HREFS = [
  "/",
  "/practice",
  "/paper-trading",
  "/portfolio",
  "/journal",
  "/learn",
];
const BOTTOM_HREFS = [
  "/",
  "/training",
  "/practice",
  "/journal",
  "/learn",
  "/glossary",
];

// Two renders behind one component: the desktop top-nav (existing UI) and the
// mobile bottom tab bar (fixed to viewport, icon + label per route).
export default function NavLinks() {
  const pathname = usePathname();
  const desktopLinks = DESKTOP_HREFS.map(
    (h) => NAV_LINKS.find((l) => l.href === h)!
  ).filter(Boolean);
  const bottomItems = [
    ...BOTTOM_HREFS.map((h) => NAV_LINKS.find((l) => l.href === h)!).filter(
      Boolean
    ),
    SETTINGS_LINK,
  ];
  return (
    <>
      {/* Top nav — visible at md+ */}
      <nav className="hidden md:flex gap-4 text-sm">
        {desktopLinks.map(({ href, label }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`transition-colors ${
                active ? "text-text font-medium" : "text-muted hover:text-text"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom tab bar — visible below md, fixed to viewport. Includes
          Settings as 6th item so mobile users can reach it without a header
          gear (header is mostly hidden on mobile). */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-panel/95 backdrop-blur border-t border-line"
        aria-label="Primary"
      >
        <ul className="flex">
          {bottomItems.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                    active ? "text-accent" : "text-muted hover:text-text"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.icon(active)}
                  <span className="text-[10px] font-medium">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

// v2.1 Phase 5 — exported separately so app/layout.tsx can render the gear
// icon next to StreakBadge in the desktop header (a utility action, not a
// primary nav destination).
export function SettingsGearLink() {
  const pathname = usePathname();
  const active = isActive(SETTINGS_LINK.href, pathname);
  return (
    <Link
      href={SETTINGS_LINK.href}
      title="Settings"
      aria-label="Settings"
      className={`inline-flex items-center justify-center w-7 h-7 rounded border border-line bg-panel2 transition-colors ${
        active ? "text-text" : "text-muted hover:text-text"
      }`}
    >
      {SETTINGS_LINK.icon()}
    </Link>
  );
}
