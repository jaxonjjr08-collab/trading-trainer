import type { Config } from "tailwindcss";

// v2.6 — colors point at CSS variables defined in app/globals.css so a
// data-theme attribute switch flips the whole app. Every existing class
// (bg-bg, bg-panel, text-accent, border-line, etc.) is preserved — only
// the underlying values change per theme.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        line: "var(--line)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        good: "var(--good)",
        bad: "var(--bad)",
        warn: "var(--warn)",
      },
      // v6.0 — "Editorial Instrument" type roles. Variables come from
      // next/font in app/layout.tsx. `display` = Fraunces (headings),
      // `sans` = Hanken Grotesk (UI), `mono` = IBM Plex Mono (numbers).
      fontFamily: {
        display: [
          "var(--font-display)",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
