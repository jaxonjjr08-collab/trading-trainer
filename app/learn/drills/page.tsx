import SpeedDrillRunner from "@/components/SpeedDrillRunner";
import Link from "next/link";

export const metadata = {
  title: "Speed-read drills — Trading Trainer",
};

export default function DrillsPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to Learn
        </Link>
        <h1 className="text-2xl font-bold mt-2">Speed-read drills</h1>
        <p className="text-muted text-sm mt-1">
          Ten 5-second chart flashcards. Read fast, answer from memory. Builds the pattern-recognition reflex the
          full decision form trains slowly.
        </p>
      </div>
      <SpeedDrillRunner />
    </div>
  );
}
