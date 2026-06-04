import DashboardStats from "@/components/DashboardStats";
import PortfolioDashboardCard from "@/components/PortfolioDashboardCard";
import PaperTradingDashboardCard from "@/components/PaperTradingDashboardCard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted text-sm">
          Your decision quality over time. The score reflects the trade you took — not whether it made money.
        </p>
      </div>
      <DashboardStats />
      {/* v4.1 — entry point to the portfolio simulator. Lives on Dashboard
          per the roadmap; clicking through opens /portfolio. */}
      <PortfolioDashboardCard />
      {/* v5.0 — entry point to live paper trading. Same dashboard slot,
          sits below the portfolio sim. */}
      <PaperTradingDashboardCard />
    </div>
  );
}
