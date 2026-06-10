import DashboardStats from "@/components/DashboardStats";
import HomeLauncher from "@/components/HomeLauncher";
import ResumeSessions from "@/components/ResumeSessions";

// v6.0 (phase 3) — borderless editorial dashboard. GreetingBand (inside
// DashboardStats) is the masthead — a personalised hero with the mascot and
// score sparkline.
// v5.10.1 — added HomeLauncher right under the masthead so every area (incl.
// the previously-buried Live Paper Trading, Portfolio, Candle School, Drills)
// is one glance from home.
// v5.11.1 — dropped the duplicate "Your open sessions" section. The launcher
// already covers Live + Portfolio at the top of the page, so a second card
// per surface lower down was redundant and made the dashboard much too long.
// v5.12.4 — ResumeSessions brings back the resume affordance, but only when a
// session is actually in flight: it renders nothing in the common case, so
// the dashboard stays short, and resurfaces live/portfolio rows when relevant.

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <DashboardStats />
      <ResumeSessions />
      <HomeLauncher />
    </div>
  );
}
