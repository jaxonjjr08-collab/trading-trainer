"use client";

// v2.6 — Theme control in the AppHeader.
// v6.0 — grew from a binary sun/moon toggle into a theme PICKER: a small
// popover menu listing the five named themes, each with a color swatch and
// a one-line character blurb. Selecting one persists + applies + broadcasts.
// v5.9.3 — the popover also hosts the chart trend-colour toggle (Standard
// green/red vs Colourblind blue/orange). Previously this lived only in
// Settings, so users switching the prominent header theme expected the
// Super Guppy ribbon to follow and were confused when it stayed put. Now
// the control that affects chart colours lives where you look for colours.

import { useEffect, useRef, useState } from "react";
import {
  applyTheme,
  getTheme,
  setTheme,
  THEMES,
  themeMeta,
  type ThemeId,
} from "@/lib/theme";
import { getColorMode, setColorMode } from "@/lib/storage";
import {
  COLOR_MODES,
  COLOR_MODE_LABELS,
  paletteFor,
  type ColorMode,
} from "@/lib/color-mode";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemeId>("leather");
  const [colorMode, setColorModeState] = useState<ColorMode>("colorblind");
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = getTheme();
    setThemeState(current);
    applyTheme(current);
    setColorModeState(getColorMode());
    setHydrated(true);
  }, []);

  // v5.9.3 — switch the chart trend palette. setColorMode persists + fires
  // 'trainer:color-mode-change', which any mounted Chart listens for and
  // repaints the Super Guppy ribbon live (no reload needed).
  function pickColorMode(mode: ColorMode) {
    setColorMode(mode);
    setColorModeState(mode);
  }

  // Close on outside-click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: ThemeId) {
    setTheme(id);
    setThemeState(id);
    setOpen(false);
  }

  if (!hydrated) {
    return <div className="w-7 h-7" aria-hidden />;
  }

  const current = themeMeta(theme);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change theme"
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-7 h-7 rounded border border-line bg-panel2 hover:border-accent/50 transition-colors"
      >
        {/* Live swatch of the current theme — the trigger itself previews it. */}
        <span
          className="h-3.5 w-3.5 rounded-full border"
          style={{
            background: current.swatch[0],
            borderColor: current.swatch[1],
            boxShadow: `inset 0 0 0 2px ${current.swatch[1]}`,
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-lg border border-line bg-panel shadow-2xl p-1.5 z-50"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted">
            Theme
          </div>
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pick(t.id)}
                className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                  active ? "bg-accent/15" : "hover:bg-panel2"
                }`}
              >
                {/* Swatch: a mini three-stripe preview of the theme. */}
                <span
                  className="shrink-0 h-7 w-7 rounded-md overflow-hidden border border-line flex"
                  aria-hidden
                >
                  <span
                    className="flex-1"
                    style={{ background: t.swatch[0] }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: t.swatch[1] }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: t.swatch[2] }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-semibold leading-tight ${
                      active ? "text-accent" : "text-text"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="block text-[11px] text-muted leading-tight truncate">
                    {t.blurb}
                  </span>
                </span>
                {active && (
                  <span className="text-accent text-sm shrink-0">✓</span>
                )}
              </button>
            );
          })}

          {/* v5.9.3 — chart trend-colour toggle. Drives the Super Guppy
              ribbon + other trend-coloured tools. Updates any open chart
              live. Lives here so the obvious colour control governs chart
              colours too. */}
          <div className="mt-1 border-t border-line pt-2">
            <div className="px-2 pb-1.5 text-[10px] uppercase tracking-widest text-muted">
              Chart trend colours
            </div>
            <div className="px-1.5 grid grid-cols-2 gap-1.5">
              {COLOR_MODES.map((m) => {
                const active = m === colorMode;
                const bull = paletteFor(m, "bull").representative;
                const bear = paletteFor(m, "bear").representative;
                return (
                  <button
                    key={m}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => pickColorMode(m)}
                    title={COLOR_MODE_LABELS[m]}
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                      active
                        ? "border-accent/60 bg-accent/10"
                        : "border-line hover:bg-panel2"
                    }`}
                  >
                    <span className="flex shrink-0" aria-hidden>
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: bull }}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full -ml-1.5"
                        style={{ background: bear }}
                      />
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        active ? "text-accent" : "text-text"
                      }`}
                    >
                      {m === "standard" ? "Green / Red" : "Blue / Red"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="px-2 pt-1.5 text-[10px] text-muted leading-snug">
              Used by the Super Guppy ribbon and other trend tools.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
