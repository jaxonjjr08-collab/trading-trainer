// v5.12.2 — Shimmering skeleton placeholder. Uses the .animate-shimmer
// keyframe from globals.css. Replaces bare "Loading…" text on the surfaces a
// real user actually waits on (the heavy Practice chunk on first visit, the
// dashboard's localStorage read) so a load reads as "content arriving" rather
// than a frozen word. Reduced-motion users get a static muted block (the
// shimmer animation is collapsed by the global guard).

type Props = {
  className?: string;
  // Rounded corners preset. Default "md".
  rounded?: "sm" | "md" | "lg" | "full";
};

const ROUND = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
} as const;

export default function Skeleton({ className = "h-4 w-full", rounded = "md" }: Props) {
  return (
    <div
      aria-hidden
      className={`bg-panel2 animate-shimmer ${ROUND[rounded]} ${className}`}
    />
  );
}

// A pre-composed block that roughly mirrors the Practice page's shape
// (header + chart + a two-column decision row) so the Suspense fallback
// doesn't collapse the layout to a single line while the chunk loads.
export function PracticeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading practice">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-12 w-full" rounded="lg" />
      <Skeleton className="h-[360px] w-full" rounded="md" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-56 w-full" rounded="md" />
        <Skeleton className="h-56 w-full" rounded="md" />
      </div>
    </div>
  );
}
