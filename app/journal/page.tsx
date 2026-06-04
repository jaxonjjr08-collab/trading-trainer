import JournalList from "@/components/JournalList";

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal</h1>
        <p className="text-muted text-sm">
          Every attempt you've submitted. Filter by direction or tag to spot repeated mistakes.
        </p>
      </div>
      <JournalList />
    </div>
  );
}
