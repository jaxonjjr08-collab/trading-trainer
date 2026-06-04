"use client";

// v5.8.5 — Coin logo with graceful fallback. Tries a public icon CDN keyed
// by lowercase ticker; on any load error (the CDN is a static snapshot and
// won't have the long tail of ~400 Coinbase pairs) it falls back to a
// colored-initials avatar — the same hue-hashed chip the picker used
// before logos.
//
// Plain <img> (not next/image) so we don't have to whitelist a remote
// domain in next.config; these are tiny cached PNGs and rendering many in
// a list is fine. loading="lazy" keeps off-screen rows from fetching until
// scrolled into view.

import { useState } from "react";

type Props = {
  // Base-currency code, e.g. "BTC". Lowercased for the CDN path.
  ticker: string;
  size?: number;
};

// Deterministic hue from the ticker so the fallback avatar color is stable.
function hueFor(t: string): number {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360;
  return h;
}

function cdnUrl(ticker: string): string {
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${ticker.toLowerCase()}.png`;
}

export default function CoinLogo({ ticker, size = 28 }: Props) {
  const [failed, setFailed] = useState(false);
  const hue = hueFor(ticker);

  if (failed) {
    return (
      <span
        aria-hidden
        className="shrink-0 rounded-full flex items-center justify-center font-bold"
        style={{
          height: size,
          width: size,
          fontSize: Math.round(size * 0.36),
          background: `hsl(${hue} 55% 22%)`,
          color: `hsl(${hue} 80% 70%)`,
        }}
      >
        {ticker.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={cdnUrl(ticker)}
      alt={`${ticker} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-panel object-cover"
      style={{ height: size, width: size }}
    />
  );
}
