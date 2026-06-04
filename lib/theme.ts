// v2.6 — Theme storage + apply helpers. The browser's <html> data-theme
// attribute is the single source of truth at render time; this module
// persists the user's choice and re-applies it on page load.
//
// v6.0 — grew from a binary dark/light toggle to a five-theme system.
// Legacy stored values "dark"/"light" migrate to "leather"/"parchment".

const THEME_KEY = "trainer.theme.v1";

export type ThemeId =
  | "leather"
  | "parchment"
  | "terminal"
  | "slate"
  | "contrast";

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  // One-line character description shown in the picker.
  blurb: string;
  // Whether the theme is dark-on-light or light-on-dark — used to group
  // the picker and pick a sensible icon.
  mode: "dark" | "light";
  // Swatch colors for the picker chip: [bg, accent, text].
  swatch: [string, string, string];
};

export const DEFAULT_THEME: ThemeId = "leather";

// Ordered for the picker. Leather + Parchment first (the originals), then
// the three new character themes.
export const THEMES: ThemeMeta[] = [
  {
    id: "leather",
    label: "Leather",
    blurb: "Warm dark — a leather-bound journal.",
    mode: "dark",
    swatch: ["#0f0e12", "#d4a574", "#ece9f2"],
  },
  {
    id: "parchment",
    label: "Parchment",
    blurb: "Warm off-white paper.",
    mode: "light",
    swatch: ["#faf8f4", "#b88550", "#1a1820"],
  },
  {
    id: "terminal",
    label: "Terminal",
    blurb: "Phosphor amber on true black.",
    mode: "dark",
    swatch: ["#050706", "#ffb000", "#d6f5dc"],
  },
  {
    id: "slate",
    label: "Slate",
    blurb: "Cool neutral dark.",
    mode: "dark",
    swatch: ["#0c0e12", "#7aa2f7", "#e7eaf1"],
  },
  {
    id: "contrast",
    label: "High Contrast",
    blurb: "Maximum legibility.",
    mode: "dark",
    swatch: ["#000000", "#ffcc33", "#ffffff"],
  },
];

const VALID = new Set<string>(THEMES.map((t) => t.id));

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// Normalize any stored value (including the legacy dark/light) to a valid id.
export function normalizeTheme(raw: string | null): ThemeId {
  if (raw === "dark") return "leather";
  if (raw === "light") return "parchment";
  if (raw && VALID.has(raw)) return raw as ThemeId;
  return DEFAULT_THEME;
}

export function getTheme(): ThemeId {
  if (!isBrowser()) return DEFAULT_THEME;
  return normalizeTheme(window.localStorage.getItem(THEME_KEY));
}

export function setTheme(t: ThemeId): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(THEME_KEY, t);
  } catch {
    // ignore quota errors
  }
  applyTheme(t);
  broadcastThemeChange(t);
}

export function applyTheme(t: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
}

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Broadcast so non-CSS consumers (e.g. lightweight-charts, which keeps fixed
// dark styling this milestone but may theme later) can react.
export const THEME_CHANGED_EVENT = "trainer:theme-changed";

export function broadcastThemeChange(t: ThemeId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: t }));
}
