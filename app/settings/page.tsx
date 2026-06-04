// v2.1 Phase 5 — dedicated /settings route. Hosts DataManagement so it
// doesn't sit at the bottom of Dashboard where most users never scroll to
// (or accidentally click).
//
// Header gear icon (NavLinks) is the primary entry point. Eventually this
// route can grow other settings (theme, default risk %, etc.) — for now it
// just renders the existing DataManagement panel.

import ColorModeSettings from "@/components/ColorModeSettings";
import DataManagement from "@/components/DataManagement";
import DefaultOverlaysSettings from "@/components/DefaultOverlaysSettings";

export const metadata = {
  title: "Settings — Trading Trainer",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted text-sm mt-1">
          Data export/import, daily goal, and other preferences. Everything is local
          to this browser — no account, no cloud.
        </p>
      </div>
      <ColorModeSettings />
      <DefaultOverlaysSettings />
      <DataManagement defaultOpen />
    </div>
  );
}
