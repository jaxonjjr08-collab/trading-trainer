// v5.9.6 — Candle School. A focused study page pairing the interactive Candle
// Identifier (shape a single candle, see what it's called) with the Pattern
// Catalogue (the six multi-candle shapes the live chart flags). Reached from
// the Learn hero and the command palette.

import Link from "next/link";
import CandleIdentifier from "@/components/learn/CandleIdentifier";
import PatternCatalogue from "@/components/learn/PatternCatalogue";

export const metadata = {
  title: "Candle School — Trading Trainer",
};

export default function CandleSchoolPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-panel p-6">
        <div className="flex items-center gap-2 text-xs text-muted mb-2">
          <Link href="/learn" className="hover:text-accent">
            Learn
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Candle School</span>
        </div>
        <h1 className="text-2xl font-bold">Candle School</h1>
        <p className="text-muted text-sm mt-2 max-w-3xl leading-relaxed">
          Candles are the alphabet of a chart. Learn to read one candle's shape,
          then the handful of shapes that repeat often enough to matter. Play
          with the identifier first, then browse the catalogue — and turn on the
          Patterns tool on any live chart to spot them in the wild.
        </p>
      </div>

      <CandleIdentifier />

      <div className="rounded-md border border-line bg-panel p-4 md:p-5">
        <PatternCatalogue />
      </div>

      <div className="rounded-md border border-line bg-panel2 p-4 text-sm text-muted leading-relaxed">
        Patterns are context, not signals. A hammer at a support level you'd
        already drawn is a setup; the same hammer mid-range is noise. Pair every
        pattern read with the structural read —{" "}
        <Link href="/learn?term=candle_patterns" className="text-accent hover:underline">
          read the full lesson →
        </Link>
      </div>
    </div>
  );
}
