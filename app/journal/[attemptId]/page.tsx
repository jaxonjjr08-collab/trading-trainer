import AttemptDetail from "@/components/AttemptDetail";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attempt detail</h1>
        <p className="text-muted text-sm">
          Full breakdown of one submitted decision.
        </p>
      </div>
      <AttemptDetail attemptId={attemptId} />
    </div>
  );
}
