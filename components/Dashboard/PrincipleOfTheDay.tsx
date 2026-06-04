"use client";

// v2.7 — One trading principle, rotated daily by day-of-year. Borderless,
// quiet, and meant to live on the dashboard as a small daily reason to open
// the app. The full set of 10 principles cycles every ~10 days.

import { principleOfTheDay } from "@/lib/principles";

export default function PrincipleOfTheDay() {
  const p = principleOfTheDay();
  return (
    <section className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-accent">
        Principle of the day
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{p.title}</h2>
      <p className="text-sm text-muted leading-relaxed max-w-2xl">{p.body}</p>
    </section>
  );
}
