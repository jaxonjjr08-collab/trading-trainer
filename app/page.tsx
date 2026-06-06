import DashboardStats from "@/components/DashboardStats";
import HomeLauncher from "@/components/HomeLauncher";
import PortfolioDashboardCard from "@/components/PortfolioDashboardCard";
import PaperTradingDashboardCard from "@/components/PaperTradingDashboardCard";

// v6.0 (phase 3) — borderless editorial dashboard. GreetingBand (inside
// DashboardStats) is the masthead — a personalised hero with the mascot and
// score sparkline.
// v5.10.1 — added HomeLauncher right under the masthead so every area (incl.
// the previously-buried Live Paper Trading, Portfolio, Candle School, Drills)
// is one glance from home. The "Trading surfaces" section stays below as the
// live-session detail (open P&L), retitled so it reads as state, not nav.

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <DashboardStats />

      <HomeLauncher />

      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Your open sessions
        </h2>
        <div className="mt-2 border-t border-line divide-y divide-line">
          <PortfolioDashboardCard />
          <PaperTradingDashboardCard />
        </div>
      </section>
    </div>
  );
}
