import Link from "next/link";
import CoursePlayer from "@/components/CoursePlayer";
import { CURRICULUM } from "@/lib/curriculum";

export const metadata = {
  title: "Course — Trading Trainer",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = CURRICULUM.find((m) => m.id === moduleId);

  if (!mod || !mod.steps || mod.steps.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to path
        </Link>
        <div className="rounded-md border border-line bg-panel p-6">
          <p className="text-sm text-muted">
            No course for this module yet. Open it in the path to read the terms directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to path
        </Link>
        <h1 className="text-2xl font-bold mt-2">{mod.title}</h1>
        <p className="text-muted text-sm mt-1 max-w-2xl leading-snug">{mod.summary}</p>
      </div>
      <CoursePlayer moduleId={moduleId} />
    </div>
  );
}
