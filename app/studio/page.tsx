import Link from "next/link";
import ScenarioStudio from "@/components/studio/ScenarioStudio";

export const metadata = {
  title: "Scenario Studio — Trading Trainer",
  // Don't index this route. It's an authoring tool, not user-facing content.
  robots: { index: false, follow: false },
};

// v3.4 — local authoring tool. Reachable only by typing /studio in the URL
// (not surfaced in the nav). Lets the maintainer sketch a scenario by
// editing a list of per-candle moves, watching the chart update live, then
// copy a ready-to-paste buildRealScenario() literal into lib/scenarios-real.ts.
//
// Not gated behind dev-only because the build pipeline already strips this
// route from production navigation; keeping it accessible on a deployed
// instance is useful for ad-hoc authoring without a local checkout.
export default function StudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to Learn
        </Link>
        <h1 className="text-2xl font-bold mt-2">Scenario Studio</h1>
        <p className="text-muted text-sm mt-1 max-w-3xl">
          Sketch a scenario by editing the per-candle move list. Chart updates
          live. When it looks right, copy the generated{" "}
          <code className="text-text">buildRealScenario(&#123;...&#125;)</code> literal and
          paste it into <code className="text-text">lib/scenarios-real.ts</code>.
        </p>
      </div>
      <ScenarioStudio />
    </div>
  );
}
