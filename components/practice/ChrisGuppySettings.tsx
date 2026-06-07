"use client";

// v5.9.4 — Settings modal for Chris's Super Guppy. Editorial twin of the
// TradingView indicator's Inputs panel: each fast/slow EMA period is its own
// numeric field, the source is a select, and the trend filters/overlays are
// checkbox toggles. Reset returns every field to the TV indicator's default.

import { useEffect, useState } from "react";
import {
  CHRIS_GUPPY_DEFAULTS,
  type ChrisGuppyParams,
  type ChrisGuppySource,
} from "@/lib/indicators-chris-guppy";
import { getChrisGuppyParams, setChrisGuppyParams } from "@/lib/storage";

const SOURCES: { value: ChrisGuppySource; label: string }[] = [
  { value: "close", label: "Close" },
  { value: "open", label: "Open" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
  { value: "hl2", label: "HL2 (high + low) / 2" },
  { value: "hlc3", label: "HLC3 (high + low + close) / 3" },
  { value: "ohlc4", label: "OHLC4 average" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChrisGuppySettings({ open, onClose }: Props) {
  const [params, setParams] = useState<ChrisGuppyParams>(CHRIS_GUPPY_DEFAULTS);

  useEffect(() => {
    if (open) setParams(getChrisGuppyParams());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function patchFast(i: number, raw: string) {
    const n = Math.max(1, Math.round(Number(raw) || 1));
    setParams((p) => {
      const fast = [...p.fast];
      fast[i] = n;
      return { ...p, fast };
    });
  }
  function patchSlow(i: number, raw: string) {
    const n = Math.max(1, Math.round(Number(raw) || 1));
    setParams((p) => {
      const slow = [...p.slow];
      slow[i] = n;
      return { ...p, slow };
    });
  }
  function commit() {
    setChrisGuppyParams(params);
    onClose();
  }
  function reset() {
    setParams({
      ...CHRIS_GUPPY_DEFAULTS,
      fast: [...CHRIS_GUPPY_DEFAULTS.fast],
      slow: [...CHRIS_GUPPY_DEFAULTS.slow],
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chris's Super Guppy settings"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-lg border border-line bg-panel shadow-2xl flex flex-col animate-pop-in"
        style={{ ["--pop-origin" as string]: "center" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold">Chris's Super Guppy</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-text w-7 h-7 inline-flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-5">
          {/* General section */}
          <section className="space-y-2">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">EMA source</span>
              <select
                value={params.source}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    source: e.target.value as ChrisGuppySource,
                  }))
                }
                className="bg-panel2 border border-line rounded px-2 py-1 text-sm"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <Check
              label="Show fast & slow average curves"
              checked={params.showAverageCurves}
              onChange={(v) =>
                setParams((p) => ({ ...p, showAverageCurves: v }))
              }
            />
            <Check
              label="Show 200 EMA curve"
              checked={params.show200}
              onChange={(v) => setParams((p) => ({ ...p, show200: v }))}
            />
            <Check
              label="Filter trend state with 200 EMA"
              checked={params.filterWith200}
              onChange={(v) => setParams((p) => ({ ...p, filterWith200: v }))}
            />
            <Check
              label="Colour candles to Guppy trend state"
              checked={params.colourCandles}
              onChange={(v) => setParams((p) => ({ ...p, colourCandles: v }))}
            />

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">EMA 200 length</span>
              <input
                type="number"
                min={1}
                value={params.ema200Length}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    ema200Length: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="bg-panel2 border border-line rounded px-2 py-1 text-sm w-24 text-right font-mono"
              />
            </label>
          </section>

          {/* Fast EMAs */}
          <section>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
              Fast EMAs
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {params.fast.map((v, i) => (
                <label key={`f${i}`} className="flex items-center justify-between gap-2">
                  <span className="text-xs">Fast EMA {i + 1}</span>
                  <input
                    type="number"
                    min={1}
                    value={v}
                    onChange={(e) => patchFast(i, e.target.value)}
                    className="bg-panel2 border border-line rounded px-2 py-1 text-sm w-20 text-right font-mono"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Slow EMAs */}
          <section>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
              Slow EMAs
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {params.slow.map((v, i) => (
                <label key={`s${i}`} className="flex items-center justify-between gap-2">
                  <span className="text-xs">Slow EMA {i + 1}</span>
                  <input
                    type="number"
                    min={1}
                    value={v}
                    onChange={(e) => patchSlow(i, e.target.value)}
                    className="bg-panel2 border border-line rounded px-2 py-1 text-sm w-20 text-right font-mono"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-line">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted hover:text-text border border-line bg-panel2 rounded px-3 py-1.5"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-muted hover:text-text border border-line bg-panel2 rounded px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              className="text-xs font-semibold text-white bg-accent rounded px-3 py-1.5"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}
