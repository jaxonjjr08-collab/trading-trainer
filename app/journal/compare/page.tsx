import { Suspense } from "react";
import CompareAttempts from "@/components/CompareAttempts";
import Link from "next/link";

export const metadata = {
  title: "Compare attempts — Trading Trainer",
};

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to journal
        </Link>
        <h1 className="text-2xl font-bold mt-2">Compare attempts</h1>
        <p className="text-muted text-sm mt-1">
          Pick two saved attempts and see what changed in your decision, score, tags, and outcome. Most useful when both attempts are on the same scenario.
        </p>
      </div>
      <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
        <CompareAttempts />
      </Suspense>
    </div>
  );
}
