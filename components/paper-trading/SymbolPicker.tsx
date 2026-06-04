"use client";

// v5.8.4 — Symbol picker, with patterns borrowed from TradingView's symbol
// search after studying it directly:
//   - Each result row shows the FULL coin name ("Bitcoin", "Ethereum")
//     alongside the ticker, so the list is scannable by name — TV's biggest
//     legibility win over a ticker-only list. Names come from Coinbase's
//     /currencies endpoint, joined to the products by base-currency code.
//   - Keyboard-first navigation: ↑/↓ move a highlight through the results,
//     Enter selects the highlighted row, Esc clears the query. The search
//     field autofocuses so you can type immediately.
//   - A per-coin colored avatar (hue hashed from the ticker) gives each row
//     a visual anchor, like TV's coin logos but without a logo-CDN
//     dependency.
//   - A muted "COINBASE · SPOT" venue badge in the header — TV shows the
//     exchange per row because it aggregates many; we only have one, so it
//     lives in the header once.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCurrencyNames,
  fetchProducts,
  type CoinbaseProduct,
} from "@/lib/live-data";
import CoinLogo from "./CoinLogo";

type Props = {
  value: string;
  onChange: (productId: string) => void;
};

const POPULAR = ["BTC-USD", "ETH-USD", "SOL-USD", "LINK-USD", "DOGE-USD"];
const MAX_ROWS = 80;

export default function SymbolPicker({ value, onChange }: Props) {
  const [products, setProducts] = useState<CoinbaseProduct[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((p) => {
        if (!cancelled) setProducts(p);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load symbols."
          );
        }
      });
    // Names are best-effort — the picker works without them.
    fetchCurrencyNames()
      .then((m) => {
        if (!cancelled) setNames(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toUpperCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = names.get(p.baseCurrency)?.toUpperCase() ?? "";
      return (
        p.id.includes(q) ||
        p.baseCurrency.includes(q) ||
        name.includes(q)
      );
    });
  }, [products, names, query]);

  const visible = filtered.slice(0, MAX_ROWS);

  // Reset highlight to the top whenever the result set changes.
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Keep the highlighted row scrolled into view as the user arrows through.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = visible[highlight];
      if (picked) onChange(picked.id);
    } else if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        setQuery("");
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Search — prominent, icon inside, accent focus ring, keyboard-driven. */}
      <div className="relative">
        <span
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none"
        >
          🔍
        </span>
        <input
          type="text"
          autoFocus
          placeholder="Search by name or ticker — Bitcoin, ETH, AVAX…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full bg-panel2 border border-line rounded-lg text-text text-sm pl-9 pr-9 py-2.5 outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-accent/20 placeholder:text-muted/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text text-base leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* Popular pills — hidden once searching to keep focus on results. */}
      {!query && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted mr-0.5">
            Popular
          </span>
          {POPULAR.map((id) => {
            const active = id === value;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  active
                    ? "bg-accent/20 border-accent/60 text-accent"
                    : "bg-panel2 border-line text-muted hover:text-text hover:border-accent/40"
                }`}
              >
                {id.replace("-USD", "")}
              </button>
            );
          })}
        </div>
      )}

      {/* Catalog list. */}
      <div className="rounded-lg border border-line bg-panel2 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-line bg-panel/40">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {query ? "Results" : "All pairs"}
            <span className="ml-2 text-muted/60 normal-case tracking-normal">
              ↑↓ to navigate · ↵ to select
            </span>
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted/70 bg-panel rounded px-1.5 py-0.5 border border-line">
            Coinbase · Spot
          </span>
        </div>
        <ul ref={listRef} className="max-h-56 overflow-y-auto">
          {error ? (
            <li className="text-xs text-bad p-3">{error}</li>
          ) : products == null ? (
            <li className="text-xs text-muted p-3 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-muted/40 border-t-accent animate-spin" />
              Loading symbols…
            </li>
          ) : visible.length === 0 ? (
            <li className="text-xs text-muted p-3 leading-snug">
              No matches for “{query}”. Coinbase only quotes against USD here
              — try a name or ticker like Avalanche, MATIC, or ATOM.
            </li>
          ) : (
            <>
              {visible.map((p, i) => {
                const active = p.id === value;
                const isHi = i === highlight;
                const base = p.baseCurrency;
                const fullName = names.get(base) ?? "";
                return (
                  <li key={p.id} data-idx={i}>
                    <button
                      type="button"
                      onClick={() => onChange(p.id)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                        active
                          ? "bg-accent/15"
                          : isHi
                          ? "bg-panel"
                          : ""
                      }`}
                    >
                      {/* v5.8.5 — real coin logo, falls back to colored
                          initials for the long tail the CDN doesn't have. */}
                      <CoinLogo ticker={base} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-sm font-bold leading-tight ${
                              active ? "text-accent" : "text-text"
                            }`}
                          >
                            {base}
                          </span>
                          {fullName && (
                            <span className="text-xs text-muted truncate">
                              {fullName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-muted/70 leading-tight">
                          {p.id}
                        </div>
                      </div>
                      {active && (
                        <span className="text-accent text-sm shrink-0">✓</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {filtered.length > MAX_ROWS && (
                <li className="text-[10px] text-muted px-3 py-2 text-center border-t border-line">
                  +{filtered.length - MAX_ROWS} more — keep typing to narrow it
                  down.
                </li>
              )}
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
