import Tutorial from "@/components/Tutorial";

export default function WelcomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Get started</h1>
        <p className="text-muted text-sm">
          A quick tour of what you're about to learn. Takes ~2 minutes.
        </p>
      </div>
      <Tutorial />
    </div>
  );
}
