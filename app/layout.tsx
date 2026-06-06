import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { APP_VERSION } from "@/lib/version";
import AppHeader from "@/components/AppHeader";
import CommandPaletteHost from "@/components/CommandPaletteHost";

// v6.0 — "Editorial Instrument" type system. Self-hosted at build by
// next/font (no runtime Google call, no FOUC). Three roles exposed as CSS
// variables and wired into tailwind.config.ts → fontFamily.
//   - Fraunces: editorial old-style serif for display headings (the
//     "designed by humans" signal). Variable; we pull the soft/optical feel.
//   - Hanken Grotesk: warm humanist grotesk for UI/body — deliberately not
//     Inter or Geist (the vibecoded tells).
//   - IBM Plex Mono: warm monospace for all numbers (prices, scores, R).
const fontDisplay = Fraunces({
  subsets: ["latin"],
  // Variable font — omit `weight` to load the full weight range (next/font
  // forbids combining an explicit weight with extra `axes`). opsz drives the
  // optical-size warmth; SOFT softens the terminals for a friendlier serif.
  axes: ["opsz", "SOFT"],
  variable: "--font-display",
  display: "swap",
});
const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Trading Trainer v${APP_VERSION}`,
  description: "Practice crypto trading decisions and improve through structured review.",
};

// v2.6 — runs before paint to set data-theme from localStorage. Without this,
// the page would render in the default palette for one frame before React
// hydrates and applies the user's stored choice — a noticeable FOUC.
// Inline and synchronous to fire before stylesheet evaluation.
// v6.0 — allowlist grew from {dark,light} to the five named themes; legacy
// values "dark"/"light" migrate to "leather"/"parchment".
const THEME_BOOTSTRAP = `(() => {
  var valid = ['leather','parchment','terminal','slate','contrast'];
  try {
    var t = localStorage.getItem('trainer.theme.v1');
    if (t === 'dark') t = 'leather';
    if (t === 'light') t = 'parchment';
    if (valid.indexOf(t) === -1) t = 'leather';
    document.documentElement.setAttribute('data-theme', t);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'leather');
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="leather"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {/* AppHeader is a client component that suppresses chrome on focused
            routes (e.g. /welcome). See audit fix #A2. */}
        <AppHeader />
        {/* v5.11.0 — gentle fade-in on every route mount. Quick (260ms) so
            it never delays interaction, but enough to make the page feel like
            it arrived rather than blinked into existence. */}
        <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6 animate-fade-in">{children}</main>
        {/* v5.9.1 — global ⌘K command palette (lazy-loaded on first open). */}
        <CommandPaletteHost />
      </body>
    </html>
  );
}
