"use client";

// v5.1.1 — Chart color mode setting. Controls the palette used by the Super
// Guppy ribbon and any future trend-state-colored chart tools.
//
// Defaults to "colorblind" (blue / orange / gray) because it reads cleanly for
// users with and without red/green colorblindness. Users who actively prefer
// the classic green/red palette can switch here.
//
// Reads/writes localStorage via lib/storage. Updates take effect on the next
// chart render — Chart.tsx listens on "storage" and "focus" events to pick
// up changes from this surface or from a different tab.

import { useEffect, useState } from "react";
import {
  COLOR_MODE_DESCRIPTIONS,
  COLOR_MODE_LABELS,
  COLOR_MODES,
  paletteFor,
  type ColorMode,
} from "@/lib/color-mode";
import { getColorMode, setColorMode } from "@/lib/storage";

export default function ColorModeSettings() {
  const [mode, setMode] = useState<ColorMode>("colorblind");

  useEffect(() => {
    setMode(getColorMode());
  }, []);

  function pick(next: ColorMode) {
    setMode(next);
    setColorMode(next);
    // Same-tab listeners (e.g. Chart.tsx) get notified via the storage event
    // on the next focus, but we can be more responsive by dispatching a
    // synthetic "storage" event right now. Skipping it for simplicity — the
    // next chart render reads the latest value through getColorMode anyway.
  }

  return (
    <section className="rounded-md border border-line bg-panel p-4 space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Chart colors</h2>
        <p className="text-xs text-muted mt-0.5">
          Controls the trend-color palette used by the Super Guppy ribbon and
          future trend-colored tools. Pick the one that reads better for you —
          the default is colorblind-friendly.
        </p>
      </header>
      <ul className="space-y-2">
        {COLOR_MODES.map((m) => {
          const bull = paletteFor(m, "bull").representative;
          const bear = paletteFor(m, "bear").representative;
          const neutral = paletteFor(m, "neutral").representative;
          const selected = m === mode;
          return (
            <li key={m}>
              <label className="flex items-start gap-3 cursor-pointer select-none rounded-md border border-line bg-panel2 p-3 hover:border-accent/40 transition-colors">
                <input
                  type="radio"
                  name="colorMode"
                  checked={selected}
                  onChange={() => pick(m)}
                  className="mt-0.5 h-4 w-4 accent-accent"
                  aria-label={COLOR_MODE_LABELS[m]}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">
                      {COLOR_MODE_LABELS[m]}
                    </span>
                    <div className="flex items-center gap-1.5" aria-hidden>
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-line"
                        style={{ background: bull }}
                        title="Uptrend"
                      />
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-line"
                        style={{ background: neutral }}
                        title="Mixed"
                      />
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-line"
                        style={{ background: bear }}
                        title="Downtrend"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted leading-snug mt-1">
                    {COLOR_MODE_DESCRIPTIONS[m]}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted leading-snug">
        Reload an open Practice or Paper Trading tab to pick up the change. The
        ribbon repaints on the next chart render either way.
      </p>
    </section>
  );
}
