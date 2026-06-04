import Link from "next/link";
import ContextFirstDrillRunner from "@/components/ContextFirstDrillRunner";

export const metadata = {
  title: "Context-first drill — Trading Trainer",
};

export default function ContextFirstPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to Learn
        </Link>
        <h1 className="text-2xl font-bold mt-2">Context-first drill</h1>
        <p className="text-muted text-sm mt-1">
          The HTF first, the LTF second. Five seconds is enough to call the
          higher-timeframe trend — and once the trend is in your head, every
          LTF decision either aligns with it or has to earn the right not to.
        </p>
      </div>
      <ContextFirstDrillRunner />
    </div>
  );
}
