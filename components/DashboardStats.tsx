"use client";

// v2.6 — Dashboard restructure. Replaces the tabbed wall of cards with a
// single continuous scroll. Type-led hierarchy: the greeting + equity curve
// are the heroes, everything else sits below at quieter weight.
//
// Composition (in priority order):
//   GreetingBand     — mascot + personalised greeting + sparkline
//   TodaysPlan       — 3-cell progress (lesson, quiz, attempts)
//   CompoundingHero  — equity curve + headline number + delta
//   WhatToWorkOn     — weakest skill + recommended drill (2 columns, no card)
//   RecentAttempts   — inline list of last 5
//   AchievementsPanel — horizontal scroller (row variant)
//
// The first-visit gate stays — non-tutorial-done users with zero attempts
// go to /welcome. Otherwise this page is the home of the app.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAttempts, getDiagnostic } from "@/lib/storage";
import { isTutorialDone } from "@/lib/tutorial";
import type { DiagnosticResult } from "@/lib/diagnostic";
import type { Attempt } from "@/lib/types";

import GreetingBand from "./Dashboard/GreetingBand";
import TodaysPlan from "./Dashboard/TodaysPlan";
import CompoundingHero from "./Dashboard/CompoundingHero";
import WhatToWorkOn from "./Dashboard/WhatToWorkOn";
import RecentActivity from "./Dashboard/RecentActivity";
import PrincipleOfTheDay from "./Dashboard/PrincipleOfTheDay";
import WeeklyDigest from "./Dashboard/WeeklyDigest";
import RevisitPrompt from "./Dashboard/RevisitPrompt";
import AchievementsPanel from "./AchievementsPanel";
import MascotBubble from "./MascotBubble";

export default function DashboardStats() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    if (!isTutorialDone() && listAttempts().length === 0) {
      router.replace("/welcome");
      return;
    }
    setAttempts(listAttempts());
    setDiagnostic(getDiagnostic());
  }, [router]);

  if (attempts == null) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-10">
      <GreetingBand attempts={attempts} />

      <TodaysPlan attempts={attempts} />

      {attempts.length >= 1 && <CompoundingHero attempts={attempts} />}

      <RevisitPrompt />

      <WeeklyDigest attempts={attempts} />

      <PrincipleOfTheDay />

      {attempts.length >= 1 && <WhatToWorkOn attempts={attempts} diagnostic={diagnostic} />}

      {attempts.length > 0 ? (
        <RecentActivity attempts={attempts} limit={5} />
      ) : (
        <div className="py-6 flex justify-center">
          <MascotBubble mood="idle" size="lg" layout="row">
            <p className="font-semibold">Nothing in your journal yet.</p>
            <p className="mt-1 text-muted">
              Take a first attempt and this is where the trainer starts learning who you are.
            </p>
            <Link
              href="/practice"
              className="mt-3 inline-block text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
            >
              Open Practice →
            </Link>
          </MascotBubble>
        </div>
      )}

      <AchievementsPanel variant="row" />
    </div>
  );
}
