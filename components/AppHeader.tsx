"use client";

// v2.1 audit fix #A2 — header chrome is suppressed on routes where it would
// distract from a single primary task. Right now that's /welcome (the 10-card
// tutorial). The user needs to do the tutorial; the nav links + streak chip +
// gear icon are noise at that moment.
//
// Adding routes here is the only knob: list the path prefixes that should
// render without the header. Everything else gets the full chrome.

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavLinks, { SettingsGearLink } from "@/components/NavLinks";
import VersionBadge from "@/components/VersionBadge";
import StreakBadge from "@/components/StreakBadge";
import ThemeToggle from "@/components/ThemeToggle";

const NO_CHROME_PATHS = ["/welcome"];

export default function AppHeader() {
  const pathname = usePathname() ?? "";
  if (NO_CHROME_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <header className="border-b border-line bg-panel relative z-30">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          {/* v6.0 — wordmark in the editorial display serif. */}
          <Link
            href="/"
            className="font-display font-semibold text-xl leading-none tracking-tight"
          >
            <span className="text-accent">Trading</span> Trainer
          </Link>
          <VersionBadge />
        </div>
        <span aria-hidden className="hidden md:block h-5 w-px bg-line" />
        <NavLinks />
        <div className="ml-auto hidden md:flex items-center gap-2">
          {/* v5.9.1 — ⌘K command-palette hint. Dispatches the open event so
              it works on click too (touch / no-keyboard). */}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("trainer:open-command-palette")
              )
            }
            title="Command palette (⌘K)"
            aria-label="Open command palette"
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded border border-line bg-panel2 text-muted hover:text-text hover:border-accent/50 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <circle cx="11" cy="11" r="7" strokeLinecap="round" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <kbd className="text-[10px] font-mono leading-none">⌘K</kbd>
          </button>
          <StreakBadge />
          <ThemeToggle />
          <SettingsGearLink />
        </div>
      </div>
    </header>
  );
}
