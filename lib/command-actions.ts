// v5.9.1 — Assembles the grouped result set for the ⌘K command palette.
// Pure data: takes the trainer's existing catalogs (scenarios, learn terms)
// plus a fixed list of routes + actions, and returns a flat, filterable
// command list. The palette component (components/CommandPalette.tsx) does
// the fuzzy filtering + keyboard navigation; this module just sources the
// items so the two concerns stay separate and testable.

import { SCENARIOS } from "./scenarios";
import { LEARN_TERMS } from "./learn";

export type CommandGroup =
  | "Navigate"
  | "Actions"
  | "Scenarios"
  | "Learn"
  | "Theme";

export type Command = {
  id: string;
  group: CommandGroup;
  title: string;
  // Optional secondary text shown muted to the right / below.
  hint?: string;
  // Either a route to push, or a named side-effect the palette handles.
  href?: string;
  action?:
    | { kind: "open-changelog" }
    | { kind: "set-theme"; themeId: string };
  // Lowercased haystack for matching. Precomputed so filtering is cheap.
  keywords: string;
};

const ROUTES: Array<{ title: string; href: string; hint: string }> = [
  { title: "Dashboard", href: "/", hint: "Your decision quality over time" },
  { title: "Practice", href: "/practice", hint: "Take a scored attempt" },
  { title: "Live Paper Trading", href: "/paper-trading", hint: "Real Coinbase prices, paper money" },
  { title: "Portfolio Simulator", href: "/portfolio", hint: "Concurrent positions on one clock" },
  { title: "Journal", href: "/journal", hint: "Review past attempts" },
  { title: "Growth", href: "/journal/growth", hint: "Skill trends over time" },
  { title: "Learn", href: "/learn", hint: "Lessons and the curriculum" },
  { title: "Glossary", href: "/glossary", hint: "Term word-bank" },
  { title: "Training", href: "/training", hint: "Diagnostic and drills" },
  { title: "Scenario Studio", href: "/studio", hint: "Author scenarios" },
  { title: "Settings", href: "/settings", hint: "Themes, data, preferences" },
];

// Themes mirrored from lib/theme's THEMES, kept as plain ids here so this
// module has no React/DOM dependency (it stays pure + unit-testable).
const THEME_COMMANDS: Array<{ id: string; label: string }> = [
  { id: "leather", label: "Leather" },
  { id: "parchment", label: "Parchment" },
  { id: "terminal", label: "Terminal" },
  { id: "slate", label: "Slate" },
  { id: "contrast", label: "High Contrast" },
];

export function buildCommands(): Command[] {
  const out: Command[] = [];

  for (const r of ROUTES) {
    out.push({
      id: `route:${r.href}`,
      group: "Navigate",
      title: r.title,
      hint: r.hint,
      href: r.href,
      keywords: `${r.title} ${r.hint}`.toLowerCase(),
    });
  }

  out.push({
    id: "action:changelog",
    group: "Actions",
    title: "What's new",
    hint: "Open the changelog",
    action: { kind: "open-changelog" },
    keywords: "whats new changelog updates release notes version",
  });

  for (const t of THEME_COMMANDS) {
    out.push({
      id: `theme:${t.id}`,
      group: "Theme",
      title: `Theme: ${t.label}`,
      hint: "Switch appearance",
      action: { kind: "set-theme", themeId: t.id },
      keywords: `theme ${t.label} appearance color dark light`.toLowerCase(),
    });
  }

  for (const s of SCENARIOS) {
    out.push({
      id: `scenario:${s.id}`,
      group: "Scenarios",
      title: s.title,
      hint: s.symbol ? `${s.symbol} · ${s.timeframe ?? ""}`.trim() : undefined,
      href: `/practice?scenarioId=${encodeURIComponent(s.id)}`,
      keywords: `${s.title} ${s.symbol ?? ""} ${s.setupType ?? ""}`.toLowerCase(),
    });
  }

  for (const term of LEARN_TERMS) {
    out.push({
      id: `learn:${term.id}`,
      group: "Learn",
      title: term.term,
      hint: "Open lesson",
      href: `/learn?term=${encodeURIComponent(term.id)}`,
      keywords: `${term.term} ${term.simpleDefinition ?? ""}`.toLowerCase(),
    });
  }

  return out;
}

// Filter + rank against a query. Empty query returns a curated short list
// (routes + actions + theme), not the full scenario/learn catalog, so the
// palette opens calm rather than as a wall of 80+ items.
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return commands.filter(
      (c) => c.group === "Navigate" || c.group === "Actions"
    );
  }
  const tokens = q.split(/\s+/);
  const scored: Array<{ c: Command; score: number }> = [];
  for (const c of commands) {
    let score = 0;
    let all = true;
    for (const tok of tokens) {
      const idx = c.keywords.indexOf(tok);
      if (idx === -1) {
        all = false;
        break;
      }
      // Earlier matches + title-start matches rank higher.
      score += idx === 0 ? 100 : idx < 12 ? 40 : 10;
      if (c.title.toLowerCase().startsWith(tok)) score += 60;
    }
    if (all) scored.push({ c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 40).map((s) => s.c);
}
