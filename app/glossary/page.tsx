import { Suspense } from "react";
import GlossaryRoute from "@/components/GlossaryRoute";

export const metadata = {
  title: "Glossary — Trading Trainer",
};

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Glossary</h1>
        <p className="text-muted text-sm">
          Every term, searchable. Use this when you hit a word in Practice and need a quick definition.
        </p>
      </div>
      <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
        <GlossaryRoute />
      </Suspense>
    </div>
  );
}
