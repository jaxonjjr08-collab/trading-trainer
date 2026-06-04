import TrainingPath from "@/components/TrainingPath";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training Path</h1>
        <p className="text-muted text-sm">
          A personalized plan that tells you what to learn, quiz, and practice next.
        </p>
      </div>
      <TrainingPath />
    </div>
  );
}
