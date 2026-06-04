"use client";

// v2.8 — Client wrapper for /learn. Renders TermDetail when ?term=X is set,
// otherwise the LearnPath list. Keeps the existing deep-link contract
// (/learn?term=X from ForceMicroLesson, AttemptDetail, LessonCard) working
// while the list view becomes a path instead of tabs.

import { useRouter, useSearchParams } from "next/navigation";
import { LEARN_TERMS } from "@/lib/learn";
import LearnPath from "./LearnPath";
import TermDetail from "./TermDetail";

export default function LearnRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTermId = searchParams.get("term");
  const openTerm =
    urlTermId && LEARN_TERMS.some((t) => t.id === urlTermId)
      ? LEARN_TERMS.find((t) => t.id === urlTermId) ?? null
      : null;

  function closeDetail() {
    router.replace("/learn", { scroll: false });
  }

  function jumpToTerm(id: string) {
    router.replace(`/learn?term=${id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (openTerm) {
    return (
      <TermDetail
        term={openTerm}
        onClose={closeDetail}
        onJump={jumpToTerm}
        backLabel="Back to path"
      />
    );
  }

  return <LearnPath />;
}
