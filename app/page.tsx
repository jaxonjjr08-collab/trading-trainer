import DashboardStats from "@/components/DashboardStats";
import PortfolioDashboardCard from "@/components/PortfolioDashboardCard";
import PaperTradingDashboardCard from "@/components/PaperTradingDashboardCard";

// v6.0 (phase 3) — borderless editorial dashboard. The old generic
// "Dashboard" h1 + lede was removed: it competed with GreetingBand (inside
// DashboardStats), which is the real masthead — a personalised hero with the
// mascot and score sparkline. The two entry surfaces (portfolio + live) now
// sit in a hairline-divided "Trading surfaces" section instead of two
// bordered cards, so the whole page reads as one editorial column.

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <DashboardStats />

      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Trading surfaces
        </h2>
        <div className="mt-2 border-t border-line divide-y divide-line">
          <PortfolioDashboardCard />
          <PaperTradingDashboardCard />
        </div>
      </section>
    </div>
  );
}
