import Link from "next/link";
import GrowthView from "@/components/GrowthView";

export const metadata = {
  title: "Growth — Trading Trainer",
};

export default function GrowthPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to journal
        </Link>
        <h1 className="text-2xl font-bold mt-2">Growth</h1>
        <p className="text-muted text-sm mt-1">
          Week-by-week per-skill scores. Climbing lines are the proof you wanted.
        </p>
      </div>
      <GrowthView />
    </div>
  );
}
